const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Check if DB is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// Import mock data for fallback
const { mockUsers } = require('../server');

// Utility function to generate tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );
  
  const refreshToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Utility function to sanitize user data
const sanitizeUser = (user) => ({
  id: user._id || user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  level: user.level,
  xp: user.xp,
  totalXp: user.totalXp,
  streak: user.streak,
  longestStreak: user.longestStreak,
  badges: user.badges,
  achievements: user.achievements,
  preferences: user.preferences,
  stats: user.stats,
  lastLogin: user.lastLogin,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt
});

// @route   POST /api/v1/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', validateSignup, asyncHandler(async (req, res) => {
  const { username, email, password, avatar, role = 'student', preferences = {} } = req.body;
  
  // Check if user already exists
  if (isDbConnected()) {
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username.toLowerCase()) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Hash password with configurable rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: avatar || 'default-avatar.png',
      role,
      preferences,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });
    
    await user.save();
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to the gamified learning platform.',
      data: {
        token: accessToken,
        refreshToken,
        user: sanitizeUser(user)
      }
    });
  } else {
    // Mock signup for demo
    const existingUser = mockUsers.find(u =>
      u.email === email.toLowerCase() || u.username === username.toLowerCase()
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const mockUser = {
      id: Date.now().toString(),
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: avatar || 'default-avatar.png',
      role,
      level: 1,
      xp: 0,
      totalXp: 0,
      streak: 0,
      longestStreak: 0,
      badges: [],
      achievements: [],
      preferences,
      stats: {
        totalLessonsCompleted: 0,
        totalQuizzesPassed: 0,
        totalTimeSpent: 0,
        averageScore: 0
      },
      lastLogin: new Date(),
      emailVerified: false,
      createdAt: new Date()
    };
    
    mockUsers.push(mockUser);
    
    const { accessToken, refreshToken } = generateTokens(mockUser.id, mockUser.role);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        token: accessToken,
        refreshToken,
        user: sanitizeUser(mockUser)
      }
    });
  }
}));

// @route   POST /api/v1/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;
  
  if (isDbConnected()) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account has been deactivated. Please contact support.' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update login tracking
    user.lastLogin = new Date();
    await user.updateStreak();
    await user.save();
    
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    
    res.json({
      success: true,
      message: 'Login successful! Welcome back.',
      data: {
        token: accessToken,
        refreshToken,
        user: sanitizeUser(user)
      }
    });
  } else {
    // Mock login for demo
    const user = mockUsers.find(u => u.email === email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update login tracking for mock user
    user.lastLogin = new Date();
    if (Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24)) === 1) {
      user.streak = (user.streak || 0) + 1;
      if (user.streak > (user.longestStreak || 0)) {
        user.longestStreak = user.streak;
      }
    } else if (Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24)) > 1) {
      user.streak = 1;
    }
    
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    
    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        token: accessToken,
        refreshToken,
        user: sanitizeUser(user)
      }
    });
  }
}));

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
    
    if (isDbConnected()) {
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
    }
    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, decoded.role);
    
    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

// @route   POST /api/v1/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, asyncHandler(async (req, res) => {
  // In a production system, you might want to maintain a blacklist of tokens
  // For now, we'll just return success and let the client handle token removal
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   GET /api/v1/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id)
      .populate('achievements', 'title description badge type')
      .populate('friends', 'username avatar level');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        user: sanitizeUser(user)
      }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        user: sanitizeUser(user)
      }
    });
  }
}));

// @route   PUT /api/v1/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, asyncHandler(async (req, res) => {
  const { username, avatar, preferences } = req.body;
  
  if (isDbConnected()) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if username is being changed and if it's available
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username.toLowerCase();
    }
    
    if (avatar) user.avatar = avatar;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: sanitizeUser(user)
      }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = mockUsers.find(u => u.username === username.toLowerCase() && u.id !== user.id);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username.toLowerCase();
    }
    
    if (avatar) user.avatar = avatar;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: sanitizeUser(user)
      }
    });
  }
}));

// @route   POST /api/v1/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  
  if (isDbConnected()) {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  }
}));

// @route   GET /api/v1/auth/me
// @desc    Get current user info (lightweight)
// @access  Private
router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: sanitizeUser(req.user)
    }
  });
}));

// @route   POST /api/v1/auth/verify-email
// @desc    Verify email address
// @access  Private
router.post('/verify-email', auth, asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }
  
  if (isDbConnected()) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email already verified'
      });
    }
    
    if (user.emailVerificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } else {
    res.json({
      success: true,
      message: 'Email verification completed (demo mode)'
    });
  }
}));

module.exports = router;
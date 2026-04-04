const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// isDbConnected must be a function, not a module-level constant
const isDbConnected = () => mongoose.connection.readyState === 1;

// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Import mock data
const { mockUsers, mockCourses } = require('../server');

// All admin routes require authentication and admin role
router.use(auth, authorize('admin'));

// @route   GET /api/v1/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Private (Admin)
router.get('/dashboard', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const [totalUsers, totalCourses, totalLessons, activeUsers] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Lesson.countDocuments(),
      User.countDocuments({ isActive: true, lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalCourses, totalLessons, activeUsers }
    });
  } else {
    res.json({
      success: true,
      data: { totalUsers: mockUsers.length, totalCourses: mockCourses.length, totalLessons: 0, activeUsers: mockUsers.filter(u => u.isActive).length }
    });
  }
}));

// @route   GET /api/v1/admin/analytics
// @desc    Get platform analytics
// @access  Private (Admin)
router.get('/analytics', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const [totalUsers, totalCourses, totalLessons, recentUsers] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Lesson.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalCourses, totalLessons, recentUsers }
    });
  } else {
    res.json({
      success: true,
      data: { totalUsers: mockUsers.length, totalCourses: mockCourses.length, totalLessons: 0, recentUsers: 0 }
    });
  }
}));

// @route   GET /api/v1/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin)
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, isActive, q } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    const filter = {};
    const allowedRoles = ['student', 'admin'];
    if (role && allowedRoles.includes(role)) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (q) {
      const safeQ = escapeRegex(q.trim());
      filter.$or = [
        { username: { $regex: safeQ, $options: 'i' } },
        { email: { $regex: safeQ, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -emailVerificationToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total }
      }
    });
  } else {
    const users = mockUsers.slice(skip, skip + limitNum);
    res.json({
      success: true,
      data: { users, pagination: { currentPage: pageNum, totalPages: Math.ceil(mockUsers.length / limitNum), total: mockUsers.length } }
    });
  }
}));

// @route   POST /api/v1/admin/users/:id/:action
// @desc    Manage a user (activate, deactivate, promote, demote)
// @access  Private (Admin)
router.post('/users/:id/:action', asyncHandler(async (req, res) => {
  const { id, action } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const allowedActions = ['activate', 'deactivate', 'promote', 'demote'];
  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Allowed: ${allowedActions.join(', ')}` });
  }

  if (isDbConnected()) {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    switch (action) {
      case 'activate': user.isActive = true; break;
      case 'deactivate': user.isActive = false; break;
      case 'promote': user.role = 'admin'; break;
      case 'demote': user.role = 'student'; break;
    }

    await user.save();
    res.json({ success: true, message: `User ${action}d successfully`, data: { user: { id: user._id, username: user.username, role: user.role, isActive: user.isActive } } });
  } else {
    res.json({ success: true, message: `User ${action}d (demo mode)` });
  }
}));

// @route   POST /api/v1/admin/courses
// @desc    Create a course (admin shortcut)
// @access  Private (Admin)
router.post('/courses', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const course = new Course({ ...req.body, createdBy: req.user.id });
    await course.save();
    res.status(201).json({ success: true, data: { course } });
  } else {
    const course = { _id: Date.now().toString(), ...req.body, createdBy: req.user?.id };
    mockCourses.push(course);
    res.status(201).json({ success: true, data: { course } });
  }
}));

// @route   GET /api/v1/admin/courses
// @desc    Get all courses (including drafts)
// @access  Private (Admin)
router.get('/courses', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    const filter = {};
    const allowedStatuses = ['draft', 'published', 'archived'];
    if (status && allowedStatuses.includes(status)) filter.status = status;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Course.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { courses, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } }
    });
  } else {
    const paginated = mockCourses.slice(skip, skip + limitNum);
    res.json({ success: true, data: { courses: paginated, pagination: { total: mockCourses.length } } });
  }
}));

module.exports = router;

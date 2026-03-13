const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId, validateUserId, validatePagination } = require('../middleware/validation');
const { query: queryValidator, validationResult } = require('express-validator');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/social/friends
// @desc    Get current user's friends list
// @access  Private
router.get('/friends', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { friends: [] } });
  }

  const user = await User.findById(req.user.id)
    .populate('friends', 'username avatar level xp totalXp streak badges')
    .lean();

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    success: true,
    data: {
      friends: user.friends,
      count: user.friends.length
    }
  });
}));

// @route   POST /api/v1/social/friends/:userId
// @desc    Add a user as a friend
// @access  Private
router.post('/friends/:userId', auth, validateUserId, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id.toString()) {
    return res.status(400).json({ error: 'You cannot add yourself as a friend' });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Friend added (demo mode)' });
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(req.user.id),
    User.findById(userId)
  ]);

  if (!currentUser) return res.status(404).json({ error: 'User not found' });
  if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

  if (currentUser.friends.some(id => id.toString() === userId)) {
    return res.status(400).json({ error: 'Already friends with this user' });
  }

  currentUser.friends.push(userId);
  await currentUser.save();

  res.json({
    success: true,
    message: `You are now friends with ${targetUser.username}!`,
    data: {
      friend: {
        id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser.avatar,
        level: targetUser.level
      }
    }
  });
}));

// @route   DELETE /api/v1/social/friends/:userId
// @desc    Remove a friend
// @access  Private
router.delete('/friends/:userId', auth, validateUserId, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Friend removed (demo mode)' });
  }

  const currentUser = await User.findById(req.user.id);
  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  const friendIndex = currentUser.friends.findIndex(id => id.toString() === userId);
  if (friendIndex === -1) {
    return res.status(404).json({ error: 'This user is not in your friends list' });
  }

  currentUser.friends.splice(friendIndex, 1);
  await currentUser.save();

  res.json({ success: true, message: 'Friend removed successfully' });
}));

// @route   GET /api/v1/social/users/search
// @desc    Search for users by username
// @access  Private
router.get('/users/search', auth, [
  queryValidator('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  const { q, limit = 20 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50);

  if (!isDbConnected()) {
    return res.json({ success: true, data: { users: [] } });
  }

  const users = await User.find({
    username: { $regex: q, $options: 'i' },
    _id: { $ne: req.user.id },
    isActive: true
  })
    .select('username avatar level xp totalXp streak')
    .limit(limitNum)
    .lean();

  // Add isFriend flag
  const currentUser = await User.findById(req.user.id).select('friends').lean();
  const friendIds = new Set((currentUser?.friends || []).map(id => id.toString()));

  const enriched = users.map(u => ({
    ...u,
    isFriend: friendIds.has(u._id.toString())
  }));

  res.json({
    success: true,
    data: { users: enriched, count: enriched.length }
  });
}));

// @route   GET /api/v1/social/leaderboard
// @desc    Get leaderboard among friends
// @access  Private
router.get('/leaderboard', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { leaderboard: [] } });
  }

  const currentUser = await User.findById(req.user.id)
    .populate('friends', 'username avatar level xp totalXp streak badges')
    .lean();

  if (!currentUser) return res.status(404).json({ error: 'User not found' });

  // Include self in the leaderboard
  const participants = [
    {
      id: currentUser._id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      level: currentUser.level,
      xp: currentUser.xp,
      totalXp: currentUser.totalXp,
      streak: currentUser.streak,
      isCurrentUser: true
    },
    ...currentUser.friends.map(f => ({ ...f, id: f._id, isCurrentUser: false }))
  ];

  // Sort by totalXp descending
  participants.sort((a, b) => b.totalXp - a.totalXp);

  // Assign ranks
  const ranked = participants.map((p, i) => ({ ...p, rank: i + 1 }));

  res.json({ success: true, data: { leaderboard: ranked } });
}));

module.exports = router;

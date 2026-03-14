const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/social/friends
// @desc    Get logged-in user's friend list
// @access  Private
router.get('/friends', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { friends: [] } });
  }

  const user = await User.findById(req.user.id).populate('friends', 'username avatar level xp streak');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true, data: { friends: user.friends } });
}));

// @route   POST /api/v1/social/friends/:userId
// @desc    Add a friend
// @access  Private
router.post('/friends/:userId', auth, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id.toString()) {
    return res.status(400).json({ error: 'You cannot add yourself as a friend' });
  }

  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const [user, friend] = await Promise.all([
    User.findById(req.user.id),
    User.findById(userId)
  ]);

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!friend) return res.status(404).json({ error: 'Friend not found' });

  const alreadyFriends = user.friends.some(f => f.toString() === userId);
  if (alreadyFriends) {
    return res.status(400).json({ error: 'Already friends with this user' });
  }

  user.friends.push(userId);
  await user.save();

  res.json({
    success: true,
    message: `${friend.username} added as a friend`,
    data: { friendsCount: user.friends.length }
  });
}));

// @route   DELETE /api/v1/social/friends/:userId
// @desc    Remove a friend
// @access  Private
router.delete('/friends/:userId', auth, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const friendIdx = user.friends.findIndex(f => f.toString() === userId);
  if (friendIdx === -1) {
    return res.status(404).json({ error: 'Friend not found in your list' });
  }

  user.friends.splice(friendIdx, 1);
  await user.save();

  res.json({ success: true, message: 'Friend removed', data: { friendsCount: user.friends.length } });
}));

// @route   GET /api/v1/social/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 10, type = 'xp' } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);

  if (!isDbConnected()) {
    return res.json({ success: true, data: { leaderboard: [] } });
  }

  let sortOptions = { level: -1, totalXp: -1 };
  if (type === 'streak') sortOptions = { streak: -1, level: -1 };
  if (type === 'lessons') sortOptions = { 'stats.totalLessonsCompleted': -1 };

  const leaderboard = await User.find({ isActive: true })
    .sort(sortOptions)
    .limit(limitNum)
    .select('username avatar level xp totalXp streak stats.totalLessonsCompleted')
    .lean();

  res.json({ success: true, data: { leaderboard } });
}));

// @route   GET /api/v1/social/users/search
// @desc    Search users by username
// @access  Private
router.get('/users/search', auth, asyncHandler(async (req, res) => {
  const { q: query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, data: { users: [] } });
  }

  const users = await User.find({
    username: new RegExp(query.trim(), 'i'),
    isActive: true,
    _id: { $ne: req.user.id }
  })
    .select('username avatar level xp streak')
    .limit(20)
    .lean();

  res.json({ success: true, data: { users } });
}));

module.exports = router;
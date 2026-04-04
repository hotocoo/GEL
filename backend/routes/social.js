const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { mockUsers } = require('../server');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/social/friends
// @desc    Get the authenticated user's friends list
// @access  Private
router.get('/friends', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username avatar level xp streak totalXp');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: { friends: user.friends } });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    res.json({ success: true, data: { friends: user?.friends || [] } });
  }
}));

// @route   POST /api/v1/social/friends/:friendId
// @desc    Add a friend by their user ID
// @access  Private
router.post('/friends/:friendId', auth, asyncHandler(async (req, res) => {
  const { friendId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(friendId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (friendId === req.user.id.toString()) {
    return res.status(400).json({ error: 'You cannot add yourself as a friend' });
  }

  if (isDbConnected()) {
    const [user, friend] = await Promise.all([
      User.findById(req.user.id),
      User.findById(friendId).select('username avatar level')
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!friend) return res.status(404).json({ error: 'Friend not found' });

    if (user.friends.map(String).includes(friendId)) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    user.friends.push(friend._id);
    await user.save();

    res.json({
      success: true,
      message: `You are now friends with ${friend.username}`,
      data: { friend: { id: friend._id, username: friend.username, avatar: friend.avatar, level: friend.level } }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.friends) user.friends = [];
    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
    }
    res.json({ success: true, message: 'Friend added (demo mode)' });
  }
}));

// @route   DELETE /api/v1/social/friends/:friendId
// @desc    Remove a friend
// @access  Private
router.delete('/friends/:friendId', auth, asyncHandler(async (req, res) => {
  const { friendId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(friendId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (isDbConnected()) {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const friendIndex = user.friends.map(String).indexOf(friendId);
    if (friendIndex === -1) {
      return res.status(404).json({ error: 'Friend not found in your friends list' });
    }

    user.friends.splice(friendIndex, 1);
    await user.save();

    res.json({ success: true, message: 'Friend removed successfully' });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (user && user.friends) {
      user.friends = user.friends.filter(id => id !== friendId);
    }
    res.json({ success: true, message: 'Friend removed (demo mode)' });
  }
}));

// @route   GET /api/v1/social/users/search
// @desc    Search for users by username
// @access  Private
router.get('/users/search', auth, asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const limitNum = Math.min(parseInt(limit), 50);

  if (isDbConnected()) {
    const users = await User.find({
      username: { $regex: q.trim(), $options: 'i' },
      _id: { $ne: req.user.id },
      isActive: true
    })
      .select('username avatar level xp streak')
      .limit(limitNum)
      .lean();

    res.json({ success: true, data: { users } });
  } else {
    const users = mockUsers
      .filter(u => u.id !== req.user.id && u.username?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, limitNum)
      .map(u => ({ id: u.id, username: u.username, avatar: u.avatar, level: u.level }));

    res.json({ success: true, data: { users } });
  }
}));

// @route   GET /api/v1/social/leaderboard
// @desc    Get social leaderboard (among friends)
// @access  Private
router.get('/leaderboard', auth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50);

  if (isDbConnected()) {
    const user = await User.findById(req.user.id).select('friends');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const friendIds = [...user.friends, req.user.id];

    const leaderboard = await User.find({ _id: { $in: friendIds }, isActive: true })
      .select('username avatar level xp totalXp streak')
      .sort({ totalXp: -1, level: -1 })
      .limit(limitNum)
      .lean();

    res.json({ success: true, data: { leaderboard } });
  } else {
    res.json({ success: true, data: { leaderboard: [] } });
  }
}));

module.exports = router;

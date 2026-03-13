const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validatePagination } = require('../middleware/validation');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/leaderboard
// @desc    Get global leaderboard (sorted by totalXp)
// @access  Public
router.get('/', optionalAuth, validatePagination, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'totalXp',
    subject
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  // Validate sortBy to prevent injection
  const allowedSortFields = { totalXp: -1, level: -1, streak: -1 }; // 'xp' excluded: use 'totalXp' for XP-based ranking
  const sortField = allowedSortFields[sortBy] !== undefined ? sortBy : 'totalXp';
  const sortOptions = { [sortField]: -1 };

  if (!isDbConnected()) {
    return res.json({
      success: true,
      data: {
        leaderboard: [],
        pagination: { currentPage: 1, totalPages: 0, total: 0 }
      }
    });
  }

  let query = { isActive: true };
  // If subject filtering is requested, only show users with progress in that subject
  if (subject) {
    query['progress.subject'] = { $regex: subject, $options: 'i' };
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('username avatar level xp totalXp streak longestStreak badges stats')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query)
  ]);

  // Assign global rank based on skip + index
  const ranked = users.map((u, i) => ({
    rank: skip + i + 1,
    id: u._id,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    totalXp: u.totalXp,
    streak: u.streak,
    longestStreak: u.longestStreak,
    badges: u.badges,
    isCurrentUser: req.user ? req.user.id.toString() === u._id.toString() : false
  }));

  res.json({
    success: true,
    data: {
      leaderboard: ranked,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    }
  });
}));

// @route   GET /api/v1/leaderboard/streak
// @desc    Get streak leaderboard
// @access  Public
router.get('/streak', optionalAuth, validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (!isDbConnected()) {
    return res.json({ success: true, data: { leaderboard: [], pagination: {} } });
  }

  const [users, total] = await Promise.all([
    User.find({ isActive: true, streak: { $gt: 0 } })
      .select('username avatar level streak longestStreak totalXp')
      .sort({ streak: -1, longestStreak: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments({ isActive: true, streak: { $gt: 0 } })
  ]);

  const ranked = users.map((u, i) => ({
    rank: skip + i + 1,
    id: u._id,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    streak: u.streak,
    longestStreak: u.longestStreak,
    totalXp: u.totalXp,
    isCurrentUser: req.user ? req.user.id.toString() === u._id.toString() : false
  }));

  res.json({
    success: true,
    data: {
      leaderboard: ranked,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total,
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    }
  });
}));

module.exports = router;

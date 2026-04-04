const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { mockUsers } = require('../server');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/leaderboard
// @desc    Get global leaderboard with pagination
// @access  Public
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = 'xp' } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  // Allowed sort types and their corresponding DB fields
  const sortMap = {
    xp: { totalXp: -1, level: -1 },
    level: { level: -1, totalXp: -1 },
    streak: { streak: -1, totalXp: -1 },
    lessons: { 'stats.totalLessonsCompleted': -1 }
  };

  const sortOptions = sortMap[type] || sortMap.xp;

  if (isDbConnected()) {
    const [users, total] = await Promise.all([
      User.find({ isActive: true })
        .select('username avatar level xp totalXp streak longestStreak stats.totalLessonsCompleted')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments({ isActive: true })
    ]);

    // Attach rank number
    const leaderboard = users.map((u, i) => ({ ...u, rank: skip + i + 1 }));

    // Find current user's rank if logged in
    let currentUserRank = null;
    if (req.user) {
      const aboveCount = await User.countDocuments({
        isActive: true,
        ...buildRankQuery(type, req.user)
      });
      currentUserRank = aboveCount + 1;
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        },
        currentUserRank
      }
    });
  } else {
    const sorted = [...mockUsers]
      .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0))
      .slice(skip, skip + limitNum)
      .map((u, i) => ({ id: u.id, username: u.username, level: u.level || 1, xp: u.xp || 0, totalXp: u.totalXp || 0, streak: u.streak || 0, rank: skip + i + 1 }));

    res.json({
      success: true,
      data: {
        leaderboard: sorted,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(mockUsers.length / limitNum), total: mockUsers.length }
      }
    });
  }
}));

// @route   GET /api/v1/leaderboard/subject/:subject
// @desc    Get leaderboard filtered by subject/category progress
// @access  Public
router.get('/subject/:subject', optionalAuth, asyncHandler(async (req, res) => {
  const { subject } = req.params;
  const { limit = 20 } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);

  if (isDbConnected()) {
    // Aggregate users by their progress in a specific subject
    const leaderboard = await User.aggregate([
      { $match: { isActive: true, 'progress.subject': { $regex: subject, $options: 'i' } } },
      { $addFields: {
        subjectProgress: {
          $filter: { input: '$progress', as: 'p', cond: { $regexMatch: { input: '$$p.subject', regex: subject, options: 'i' } } }
        }
      }},
      { $addFields: {
        subjectScore: { $sum: '$subjectProgress.score' },
        subjectLessons: { $sum: '$subjectProgress.lessonsCompleted' }
      }},
      { $sort: { subjectScore: -1, subjectLessons: -1 } },
      { $limit: limitNum },
      { $project: { username: 1, avatar: 1, level: 1, subjectScore: 1, subjectLessons: 1 } }
    ]);

    res.json({ success: true, data: { subject, leaderboard } });
  } else {
    res.json({ success: true, data: { subject, leaderboard: [] } });
  }
}));

// Helper to build a rank query for the current user
function buildRankQuery(type, user) {
  switch (type) {
    case 'streak': return { streak: { $gt: user.streak || 0 } };
    case 'level': return { $or: [{ level: { $gt: user.level || 1 } }, { level: user.level || 1, totalXp: { $gt: user.totalXp || 0 } }] };
    case 'lessons': return { 'stats.totalLessonsCompleted': { $gt: user.stats?.totalLessonsCompleted || 0 } };
    default: return { $or: [{ totalXp: { $gt: user.totalXp || 0 } }, { totalXp: user.totalXp || 0, level: { $gt: user.level || 1 } }] };
  }
}

module.exports = router;

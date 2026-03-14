const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { asyncHandler } = require('../middleware/errorHandler');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/leaderboard
// @desc    Get leaderboard ranked by XP/level
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 10, page = 1, type = 'xp' } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * limitNum;

  if (!isDbConnected()) {
    return res.json({ success: true, data: { leaderboard: [] } });
  }

  let sortOptions = { level: -1, totalXp: -1 };
  if (type === 'streak') sortOptions = { streak: -1, level: -1 };

  const [leaderboard, total] = await Promise.all([
    User.find({ isActive: true })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .select('username avatar level xp totalXp streak')
      .lean(),
    User.countDocuments({ isActive: true })
  ]);

  res.json({
    success: true,
    data: {
      leaderboard,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limitNum),
        total
      }
    }
  });
}));

module.exports = router;
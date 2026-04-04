const express = require('express');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { mockUsers } = require('../server');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   POST /api/v1/gamification/xp/add
// @desc    Award XP to the authenticated user and handle level-up
// @access  Private
router.post('/xp/add', auth, asyncHandler(async (req, res) => {
  const { amount, source } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A positive XP amount is required' });
  }

  const maxXpPerRequest = 1000;
  const xpToAdd = Math.min(amount, maxXpPerRequest);

  if (isDbConnected()) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const prevLevel = user.level;
    await user.addXP(xpToAdd);

    const leveledUp = user.level > prevLevel;

    res.json({
      success: true,
      message: leveledUp ? `Level up! You are now level ${user.level}!` : `+${xpToAdd} XP awarded`,
      data: {
        xpAdded: xpToAdd,
        source: source || 'manual',
        level: user.level,
        xp: user.xp,
        totalXp: user.totalXp,
        leveledUp,
        xpToNextLevel: user.level * 100
      }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.xp = (user.xp || 0) + xpToAdd;
    user.totalXp = (user.totalXp || 0) + xpToAdd;

    const prevLevel = user.level || 1;
    while (user.xp >= user.level * 100) {
      user.xp -= user.level * 100;
      user.level += 1;
    }

    res.json({
      success: true,
      message: `+${xpToAdd} XP awarded (demo mode)`,
      data: { xpAdded: xpToAdd, level: user.level, xp: user.xp, totalXp: user.totalXp, leveledUp: user.level > prevLevel }
    });
  }
}));

// @route   POST /api/v1/gamification/update-streak
// @desc    Update streak for the authenticated user
// @access  Private
router.post('/update-streak', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.updateStreak();
    await user.save();

    res.json({
      success: true,
      data: { streak: user.streak, longestStreak: user.longestStreak }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (user) {
      user.streak = (user.streak || 0) + 1;
      user.longestStreak = Math.max(user.streak, user.longestStreak || 0);
    }
    res.json({ success: true, data: { streak: user?.streak || 1 } });
  }
}));

// @route   GET /api/v1/gamification/achievements
// @desc    Get all available achievements
// @access  Public
router.get('/achievements', asyncHandler(async (req, res) => {
  const { category, rarity, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);

  if (isDbConnected()) {
    const filter = { isSecret: false };
    if (category) filter.category = category;
    if (rarity) filter.rarity = rarity;

    const achievements = await Achievement.find(filter)
      .sort({ rarity: 1, title: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Achievement.countDocuments(filter);

    res.json({
      success: true,
      data: {
        achievements,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total }
      }
    });
  } else {
    res.json({ success: true, data: { achievements: [], pagination: { total: 0 } } });
  }
}));

// @route   GET /api/v1/gamification/user/achievements
// @desc    Get achievements for the authenticated user
// @access  Private
router.get('/user/achievements', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id)
      .populate('achievements', 'title description badge type rarity category');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: { achievements: user.achievements, count: user.achievements.length }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    res.json({ success: true, data: { achievements: user?.achievements || [] } });
  }
}));

// @route   GET /api/v1/gamification/user/stats
// @desc    Get detailed gamification stats for the authenticated user
// @access  Private
router.get('/user/stats', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id)
      .select('level xp totalXp streak longestStreak badges achievements stats');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        level: user.level,
        xp: user.xp,
        totalXp: user.totalXp,
        xpToNextLevel: user.level * 100,
        levelProgress: user.levelProgress,
        streak: user.streak,
        longestStreak: user.longestStreak,
        badges: user.badges,
        achievementCount: user.achievements.length,
        stats: user.stats
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
        level: user.level || 1,
        xp: user.xp || 0,
        totalXp: user.totalXp || 0,
        xpToNextLevel: (user.level || 1) * 100,
        streak: user.streak || 0,
        longestStreak: user.longestStreak || 0,
        badges: user.badges || [],
        achievementCount: user.achievements?.length || 0,
        stats: user.stats || {}
      }
    });
  }
}));

// @route   POST /api/v1/gamification/achievements/:id/unlock
// @desc    Manually unlock an achievement for the authenticated user
// @access  Private
router.post('/achievements/:id/unlock', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid achievement ID' });
  }

  if (isDbConnected()) {
    const [user, achievement] = await Promise.all([
      User.findById(req.user.id),
      Achievement.findById(id)
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    if (user.achievements.map(String).includes(id)) {
      return res.status(400).json({ error: 'Achievement already unlocked' });
    }

    user.achievements.push(achievement._id);
    await user.save();

    res.json({
      success: true,
      message: `Achievement unlocked: ${achievement.title}`,
      data: { achievement }
    });
  } else {
    res.json({ success: true, message: 'Achievement unlocked (demo mode)' });
  }
}));

module.exports = router;

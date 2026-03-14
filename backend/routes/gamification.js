const express = require('express');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Quest = require('../models/Quest');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/gamification/achievements
// @desc    Get all public achievements
// @access  Public
router.get('/achievements', asyncHandler(async (req, res) => {
  const { category, rarity, limit = 20, page = 1 } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * limitNum;

  if (!isDbConnected()) {
    return res.json({ success: true, data: { achievements: [] } });
  }

  const filterQuery = { isActive: true, hidden: false };
  if (category) filterQuery.category = category;
  if (rarity) filterQuery.rarity = rarity;

  const [achievements, total] = await Promise.all([
    Achievement.find(filterQuery).sort({ xpReward: -1 }).skip(skip).limit(limitNum).lean(),
    Achievement.countDocuments(filterQuery)
  ]);

  res.json({
    success: true,
    data: {
      achievements,
      pagination: { currentPage: parseInt(page), totalPages: Math.ceil(total / limitNum), total }
    }
  });
}));

// @route   GET /api/v1/gamification/user/achievements
// @desc    Get achievements for the logged-in user
// @access  Private
router.get('/user/achievements', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { achievements: [] } });
  }

  const user = await User.findById(req.user.id).populate('achievements');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true, data: { achievements: user.achievements } });
}));

// @route   POST /api/v1/gamification/achievements/:id/unlock
// @desc    Unlock an achievement for the logged-in user
// @access  Private
router.post('/achievements/:id/unlock', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const achievement = await Achievement.findById(req.params.id);
  if (!achievement) {
    return res.status(404).json({ error: 'Achievement not found' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.achievements.some(a => a.toString() === achievement._id.toString())) {
    return res.json({ success: true, message: 'Achievement already unlocked' });
  }

  await achievement.unlockForUser(user);

  res.json({
    success: true,
    message: `Achievement "${achievement.title}" unlocked! +${achievement.xpReward} XP`,
    data: { achievement, xpEarned: achievement.xpReward }
  });
}));

// @route   GET /api/v1/gamification/quests
// @desc    Get all active quests
// @access  Public
router.get('/quests', asyncHandler(async (req, res) => {
  const { type, category, difficulty, limit = 20 } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);

  if (!isDbConnected()) {
    return res.json({ success: true, data: { quests: [] } });
  }

  const filterQuery = { status: 'active' };
  if (type) filterQuery.type = type;
  if (category) filterQuery.category = category;
  if (difficulty) filterQuery.difficulty = difficulty;

  const quests = await Quest.find(filterQuery)
    .sort({ featured: -1, priority: -1, createdAt: -1 })
    .limit(limitNum)
    .lean();

  res.json({ success: true, data: { quests } });
}));

// @route   GET /api/v1/gamification/quests/active
// @desc    Get active quests for logged-in user
// @access  Private
router.get('/quests/active', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { quests: [] } });
  }

  const quests = await Quest.getActiveQuests(20);
  res.json({ success: true, data: { quests } });
}));

// @route   POST /api/v1/gamification/quests/:id/complete
// @desc    Mark a quest as complete for the logged-in user
// @access  Private
router.post('/quests/:id/complete', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const quest = await Quest.findById(req.params.id);
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const result = await quest.completeForUser(user);

  if (result.alreadyCompleted) {
    return res.json({ success: true, message: 'Quest already completed' });
  }

  res.json({
    success: true,
    message: `Quest "${quest.title}" completed! +${quest.rewards.xp} XP`,
    data: { xpEarned: quest.rewards.xp }
  });
}));

// @route   GET /api/v1/gamification/user/stats
// @desc    Get gamification stats for the logged-in user
// @access  Private
router.get('/user/stats', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      success: true,
      data: { level: 1, xp: 0, totalXp: 0, streak: 0, longestStreak: 0, achievements: [], badges: [], stats: {} }
    });
  }

  const user = await User.findById(req.user.id)
    .populate('achievements', 'title description type xpReward badge')
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
      streak: user.streak,
      longestStreak: user.longestStreak,
      badges: user.badges,
      achievements: user.achievements,
      stats: user.stats
    }
  });
}));

// @route   POST /api/v1/gamification/xp/add
// @desc    Award XP to the logged-in user (internal / system use)
// @access  Private
router.post('/xp/add', auth, asyncHandler(async (req, res) => {
  const { amount, source } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A positive XP amount is required' });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, data: { xpEarned: amount } });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const prevLevel = user.level;
  await user.addXP(amount);

  const leveledUp = user.level > prevLevel;

  res.json({
    success: true,
    message: `+${amount} XP earned${source ? ` from ${source}` : ''}!`,
    data: {
      xpEarned: amount,
      newXp: user.xp,
      newTotalXp: user.totalXp,
      newLevel: user.level,
      leveledUp,
      levelsGained: user.level - prevLevel
    }
  });
}));

// @route   POST /api/v1/gamification/update-streak
// @desc    Update streak for the logged-in user
// @access  Private
router.post('/update-streak', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { streak: 0 } });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await user.updateStreak();

  res.json({
    success: true,
    data: { streak: user.streak, longestStreak: user.longestStreak }
  });
}));

module.exports = router;
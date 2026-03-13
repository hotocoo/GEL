const express = require('express');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Quest = require('../models/Quest');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

const isDbConnected = () => mongoose.connection.readyState === 1;

// ─── XP ─────────────────────────────────────────────────────────────────────

// @route   POST /api/v1/gamification/xp/add
// @desc    Award XP to authenticated user
// @access  Private
router.post('/xp/add', auth, [
  body('amount').isInt({ min: 1, max: 10000 }).withMessage('Amount must be between 1 and 10000'),
  body('source').optional().trim().isLength({ max: 100 }).withMessage('Source cannot exceed 100 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  const { amount, source = 'manual' } = req.body;

  if (!isDbConnected()) {
    return res.json({ success: true, message: 'XP awarded (demo mode)', data: { xpAwarded: amount, source } });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const result = await user.addXP(amount);

  // Check for newly unlocked achievements after XP gain
  const newAchievements = await checkAndUnlockAchievements(result.user);

  res.json({
    success: true,
    message: `Awarded ${amount} XP!`,
    data: {
      xpAwarded: amount,
      source,
      newTotalXp: result.user.totalXp,
      newLevel: result.user.level,
      currentXp: result.user.xp,
      leveledUp: result.leveledUp,
      newAchievements
    }
  });
}));

// @route   GET /api/v1/gamification/user/stats
// @desc    Get current user's gamification stats
// @access  Private
router.get('/user/stats', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { stats: req.user.stats || {}, level: req.user.level || 1, xp: req.user.xp || 0 } });
  }

  const user = await User.findById(req.user.id)
    .populate('achievements', 'title description badge type xpReward category rarity')
    .lean();

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    success: true,
    data: {
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      xpToNextLevel: 100,
      levelProgress: user.xp,
      streak: user.streak,
      longestStreak: user.longestStreak,
      badges: user.badges,
      achievements: user.achievements,
      stats: user.stats
    }
  });
}));

// ─── ACHIEVEMENTS ────────────────────────────────────────────────────────────

// @route   GET /api/v1/gamification/achievements
// @desc    Get all achievements (with optional filters)
// @access  Public
router.get('/achievements', validatePagination, asyncHandler(async (req, res) => {
  const { category, rarity, type, page = 1, limit = 20, q } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (!isDbConnected()) {
    return res.json({ success: true, data: { achievements: [], pagination: { currentPage: 1, totalPages: 0, total: 0 } } });
  }

  let query = { isActive: true, hidden: false };
  if (category) query.category = category;
  if (rarity) query.rarity = rarity;
  if (type) query.type = type;
  if (q) query.$text = { $search: q };

  const [achievements, total] = await Promise.all([
    Achievement.find(query)
      .sort({ rarity: -1, xpReward: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Achievement.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      achievements,
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

// @route   GET /api/v1/gamification/user/achievements
// @desc    Get current user's unlocked achievements
// @access  Private
router.get('/user/achievements', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { achievements: [] } });
  }

  const user = await User.findById(req.user.id)
    .populate('achievements', 'title description badge type xpReward category rarity icon color points')
    .lean();

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Get all achievements to show locked ones too
  const allAchievements = await Achievement.find({ isActive: true, hidden: false }).lean();
  const unlockedIds = new Set(user.achievements.map(a => a._id.toString()));

  const enriched = allAchievements.map(a => ({
    ...a,
    unlocked: unlockedIds.has(a._id.toString())
  }));

  res.json({
    success: true,
    data: {
      achievements: enriched,
      unlocked: user.achievements,
      totalUnlocked: user.achievements.length,
      totalAvailable: allAchievements.length
    }
  });
}));

// @route   POST /api/v1/gamification/achievements/:id/unlock
// @desc    Manually check and unlock an achievement for the current user
// @access  Private
router.post('/achievements/:id/unlock', auth, validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Achievement unlock noted (demo mode)' });
  }

  const achievement = await Achievement.findById(req.params.id);
  if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.achievements.some(id => id.toString() === achievement._id.toString())) {
    return res.json({ success: true, message: 'Achievement already unlocked' });
  }

  await achievement.unlockForUser(user);

  res.json({
    success: true,
    message: `Achievement "${achievement.title}" unlocked! +${achievement.xpReward} XP`,
    data: { achievement }
  });
}));

// ─── QUESTS ──────────────────────────────────────────────────────────────────

// @route   GET /api/v1/gamification/quests
// @desc    Get available quests with optional filters
// @access  Public
router.get('/quests', validatePagination, asyncHandler(async (req, res) => {
  const { type, category, difficulty, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (!isDbConnected()) {
    return res.json({ success: true, data: { quests: [] } });
  }

  let query = { status: 'active' };
  if (type) query.type = type;
  if (category) query.category = category;
  if (difficulty) query.difficulty = difficulty;

  const [quests, total] = await Promise.all([
    Quest.find(query)
      .sort({ featured: -1, priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'username avatar')
      .lean(),
    Quest.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      quests,
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

// @route   GET /api/v1/gamification/quests/active
// @desc    Get currently active/daily quests
// @access  Public
router.get('/quests/active', asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { quests: [] } });
  }

  const quests = await Quest.getActiveQuests(10);

  res.json({ success: true, data: { quests } });
}));

// @route   POST /api/v1/gamification/quests/:id/complete
// @desc    Mark a quest as completed for the authenticated user
// @access  Private
router.post('/quests/:id/complete', auth, validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Quest completed (demo mode)' });
  }

  const quest = await Quest.findById(req.params.id);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!quest.canUserParticipate(user)) {
    return res.status(403).json({ error: 'You do not meet the prerequisites for this quest' });
  }

  const result = await quest.completeForUser(user);

  if (result.alreadyCompleted) {
    return res.json({ success: true, message: 'Quest was already completed' });
  }

  const newAchievements = await checkAndUnlockAchievements(result.user);

  res.json({
    success: true,
    message: `Quest "${quest.title}" completed! +${quest.rewards.xp} XP`,
    data: {
      xpAwarded: quest.rewards.xp,
      newTotalXp: result.user.totalXp,
      newLevel: result.user.level,
      newAchievements
    }
  });
}));

// ─── STREAK ──────────────────────────────────────────────────────────────────

// @route   POST /api/v1/gamification/streak/update
// @desc    Update user's daily streak (call once per day on login/activity)
// @access  Private
router.post('/streak/update', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Streak updated (demo mode)', data: { streak: 1 } });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await user.updateStreak();

  res.json({
    success: true,
    data: {
      streak: user.streak,
      longestStreak: user.longestStreak
    }
  });
}));

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Checks a user's current progress against all active achievements and
 * unlocks any newly eligible ones, awarding XP and saving to DB.
 * @param {Object} user - Mongoose User document (already saved)
 * @returns {Array<{title: string, xpReward: number}>} Newly unlocked achievements
 */
async function checkAndUnlockAchievements(user) {
  if (!isDbConnected()) return [];

  try {
    const achievements = await Achievement.find({ isActive: true });
    const userProgress = {
      lessonsCompleted: user.stats?.totalLessonsCompleted || 0,
      streak: user.streak || 0,
      coursesCompleted: 0,
      perfectScores: user.stats?.totalQuizzesPassed || 0,
      totalTimeSpent: user.stats?.totalTimeSpent || 0,
      subjectsMastered: 0
    };

    const newlyUnlocked = [];

    for (const achievement of achievements) {
      const alreadyUnlocked = user.achievements.some(id => id.toString() === achievement._id.toString());
      if (!alreadyUnlocked && achievement.isUnlockedForUser(userProgress)) {
        await achievement.unlockForUser(user);
        newlyUnlocked.push({ title: achievement.title, xpReward: achievement.xpReward });
      }
    }

    return newlyUnlocked;
  } catch (err) {
    console.error('Achievement check error:', err);
    return [];
  }
}

module.exports = router;
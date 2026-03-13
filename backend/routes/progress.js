const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/progress/user
// @desc    Get current user's full progress
// @access  Private
router.get('/user', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { progress: [] } });
  }

  const user = await User.findById(req.user.id)
    .select('progress stats level xp totalXp streak longestStreak')
    .lean();

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    success: true,
    data: {
      progress: user.progress,
      stats: user.stats,
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      streak: user.streak,
      longestStreak: user.longestStreak
    }
  });
}));

// @route   POST /api/v1/progress/update
// @desc    Update progress for a subject/course (upsert - no duplicates)
// @access  Private
router.post('/update', auth, [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 100 }),
  body('course').trim().notEmpty().withMessage('Course is required').isLength({ max: 200 }),
  body('lessonsCompleted').optional().isInt({ min: 0 }).withMessage('lessonsCompleted must be a non-negative integer'),
  body('totalLessons').optional().isInt({ min: 0 }).withMessage('totalLessons must be a non-negative integer'),
  body('score').optional().isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  const { subject, course, lessonsCompleted, totalLessons, score } = req.body;

  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Progress updated (demo mode)' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existingIndex = user.progress.findIndex(p => p.course === course);

  if (existingIndex >= 0) {
    // Update existing progress entry
    const existing = user.progress[existingIndex];
    if (lessonsCompleted !== undefined) existing.lessonsCompleted = lessonsCompleted;
    if (totalLessons !== undefined) existing.totalLessons = totalLessons;
    if (score !== undefined) existing.score = Math.max(existing.score || 0, score); // Keep best score
    existing.lastAccessed = new Date();
  } else {
    // Insert new progress entry
    user.progress.push({
      subject,
      course,
      lessonsCompleted: lessonsCompleted || 0,
      totalLessons: totalLessons || 0,
      score: score || 0,
      lastAccessed: new Date()
    });
  }

  await user.save();

  res.json({
    success: true,
    message: 'Progress updated successfully',
    data: { progress: user.progress }
  });
}));

// @route   GET /api/v1/progress/stats
// @desc    Get aggregated stats for the current user
// @access  Private
router.get('/stats', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { stats: {} } });
  }

  const user = await User.findById(req.user.id).select('stats progress level xp totalXp streak').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Compute derived stats from progress array
  const completedCourses = user.progress.filter(p => p.totalLessons > 0 && p.lessonsCompleted >= p.totalLessons).length;
  const averageScore = user.progress.length > 0
    ? Math.round(user.progress.reduce((sum, p) => sum + (p.score || 0), 0) / user.progress.length)
    : 0;

  res.json({
    success: true,
    data: {
      stats: user.stats,
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      streak: user.streak,
      enrolledCourses: user.progress.length,
      completedCourses,
      averageScore
    }
  });
}));

// @route   GET /api/v1/progress/leaderboard
// @desc    Get overall leaderboard (alias pointing at /leaderboard route)
// @access  Public
router.get('/leaderboard', asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { leaderboard: [] } });
  }

  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const users = await User.find({ isActive: true })
    .select('username avatar level xp totalXp streak')
    .sort({ totalXp: -1, level: -1 })
    .limit(limit)
    .lean();

  const ranked = users.map((u, i) => ({ rank: i + 1, ...u }));

  res.json({ success: true, data: { leaderboard: ranked } });
}));

module.exports = router;

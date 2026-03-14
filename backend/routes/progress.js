const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/progress/user
// @desc    Get the authenticated user's progress
// @access  Private
router.get('/user', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { progress: [] } });
  }

  const user = await User.findById(req.user.id).select('progress stats level xp totalXp streak');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    data: {
      progress: user.progress,
      stats: user.stats,
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      streak: user.streak
    }
  });
}));

// @route   GET /api/v1/progress/stats
// @desc    Get the authenticated user's learning statistics
// @access  Private
router.get('/stats', auth, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      success: true,
      data: { stats: { totalLessonsCompleted: 0, totalQuizzesPassed: 0, totalTimeSpent: 0, averageScore: 0 } }
    });
  }

  const user = await User.findById(req.user.id).select('stats level xp totalXp streak longestStreak badges achievements');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    data: {
      stats: user.stats,
      level: user.level,
      xp: user.xp,
      totalXp: user.totalXp,
      streak: user.streak,
      longestStreak: user.longestStreak,
      badgesCount: user.badges ? user.badges.length : 0,
      achievementsCount: user.achievements ? user.achievements.length : 0
    }
  });
}));

// @route   POST /api/v1/progress/update
// @desc    Update or upsert progress for a course
// @access  Private
router.post('/update', auth, asyncHandler(async (req, res) => {
  const { subject, course, lessonsCompleted, totalLessons, score, timeSpent } = req.body;

  if (!subject || !course) {
    return res.status(400).json({ error: 'Subject and course are required' });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, data: { progress: [] } });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Upsert progress entry - use toString() to safely compare ObjectId or string
  const existingIdx = user.progress.findIndex(
    p => p.course.toString() === course.toString() && p.subject === subject
  );
  if (existingIdx >= 0) {
    if (lessonsCompleted !== undefined) user.progress[existingIdx].lessonsCompleted = lessonsCompleted;
    if (totalLessons !== undefined) user.progress[existingIdx].totalLessons = totalLessons;
    if (score !== undefined) user.progress[existingIdx].score = score;
    user.progress[existingIdx].lastAccessed = new Date();
  } else {
    user.progress.push({
      subject,
      course,
      lessonsCompleted: lessonsCompleted || 0,
      totalLessons: totalLessons || 0,
      score: score || 0,
      lastAccessed: new Date()
    });
  }

  // Update global stats
  if (lessonsCompleted !== undefined) {
    user.stats.totalLessonsCompleted = user.progress.reduce((sum, p) => sum + (p.lessonsCompleted || 0), 0);
  }
  if (timeSpent) {
    user.stats.totalTimeSpent = (user.stats.totalTimeSpent || 0) + timeSpent;
  }
  if (score !== undefined && score > 0) {
    const scores = user.progress.filter(p => p.score > 0).map(p => p.score);
    user.stats.averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Progress updated successfully',
    data: { progress: user.progress, stats: user.stats }
  });
}));

// @route   GET /api/v1/progress/leaderboard
// @desc    Get the XP/level leaderboard
// @access  Public
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);

  if (!isDbConnected()) {
    return res.json({ success: true, data: { leaderboard: [] } });
  }

  const leaderboard = await User.getLeaderboard(limitNum);

  res.json({ success: true, data: { leaderboard } });
}));

module.exports = router;
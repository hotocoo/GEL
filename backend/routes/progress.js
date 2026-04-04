const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const router = express.Router();

const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { mockUsers, mockCourses } = require('../server');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/progress/user
// @desc    Get authenticated user's full progress
// @access  Private
router.get('/user', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id).select('progress stats level xp totalXp streak');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, data: { progress: user.progress, stats: user.stats } });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    res.json({ success: true, data: { progress: user?.progress || [], stats: user?.stats || {} } });
  }
}));

// @route   POST /api/v1/progress/update
// @desc    Update (upsert) progress for a specific course
// @access  Private
router.post('/update', auth, asyncHandler(async (req, res) => {
  const { courseId, subject, course: courseName, lessonsCompleted, totalLessons, score, timeSpent } = req.body;

  if (!courseName && !courseId) {
    return res.status(400).json({ error: 'Course identifier is required' });
  }

  if (isDbConnected()) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Resolve course name/subject from courseId if needed
    let resolvedCourseName = courseName;
    let resolvedSubject = subject;
    if (courseId) {
      const courseDoc = await Course.findById(courseId).select('title subject');
      if (courseDoc) {
        resolvedCourseName = resolvedCourseName || courseDoc.title;
        resolvedSubject = resolvedSubject || courseDoc.subject;
      }
    }

    // Upsert: find existing entry or create a new one
    const existing = user.progress.find(p => p.course === resolvedCourseName);
    if (existing) {
      if (lessonsCompleted !== undefined) existing.lessonsCompleted = lessonsCompleted;
      if (totalLessons !== undefined) existing.totalLessons = totalLessons;
      if (score !== undefined) existing.score = Math.max(existing.score, score);
      existing.lastAccessed = new Date();
    } else {
      user.progress.push({
        subject: resolvedSubject || '',
        course: resolvedCourseName,
        lessonsCompleted: lessonsCompleted || 0,
        totalLessons: totalLessons || 0,
        score: score || 0,
        lastAccessed: new Date()
      });
    }

    // Update stats
    if (timeSpent) {
      user.stats.totalTimeSpent = (user.stats.totalTimeSpent || 0) + timeSpent;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Progress updated',
      data: { progress: user.progress.find(p => p.course === resolvedCourseName) }
    });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.progress) user.progress = [];
    const resolvedCourseName = courseName || courseId;
    const existing = user.progress.find(p => p.course === resolvedCourseName);
    if (existing) {
      if (lessonsCompleted !== undefined) existing.lessonsCompleted = lessonsCompleted;
      if (totalLessons !== undefined) existing.totalLessons = totalLessons;
      if (score !== undefined) existing.score = Math.max(existing.score, score);
      existing.lastAccessed = new Date();
    } else {
      user.progress.push({ subject: subject || '', course: resolvedCourseName, lessonsCompleted: lessonsCompleted || 0, totalLessons: totalLessons || 0, score: score || 0, lastAccessed: new Date() });
    }

    res.json({ success: true, message: 'Progress updated (demo mode)' });
  }
}));

// @route   GET /api/v1/progress/stats
// @desc    Get user statistics summary
// @access  Private
router.get('/stats', auth, asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const user = await User.findById(req.user.id).select('stats level xp totalXp streak longestStreak');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, data: { stats: user.stats, level: user.level, xp: user.xp, totalXp: user.totalXp, streak: user.streak, longestStreak: user.longestStreak } });
  } else {
    const user = mockUsers.find(u => u.id === req.user.id);
    res.json({ success: true, data: { stats: user?.stats || {}, level: user?.level || 1, xp: user?.xp || 0 } });
  }
}));

module.exports = router;

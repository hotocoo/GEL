const express = require('express');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');
const router = express.Router();

const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateLesson, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @route   GET /api/v1/lessons
// @desc    Get all published lessons with pagination and filtering
// @access  Public
router.get('/', optionalAuth, validatePagination, validateSearch, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    difficulty,
    q,
    sortBy = 'createdAt'
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  const allowedSortFields = { createdAt: -1, views: -1, 'rating.average': -1 };
  const sortField = allowedSortFields[sortBy] !== undefined ? sortBy : 'createdAt';
  const sortOptions = { [sortField]: -1 };

  if (!isDbConnected()) {
    return res.json({ success: true, data: { lessons: [], pagination: {} } });
  }

  let query = { status: 'published' };
  if (difficulty) query.difficulty = difficulty;
  if (q) query.$text = { $search: q };

  const [lessons, total] = await Promise.all([
    Lesson.find(query)
      .select('-questions.correctAnswer -transcript')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'username avatar')
      .lean(),
    Lesson.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      lessons,
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

// @route   GET /api/v1/lessons/search
// @desc    Search lessons by text
// @access  Public
router.get('/search', optionalAuth, validateSearch, asyncHandler(async (req, res) => {
  const { q, difficulty, limit = 20 } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);

  if (!isDbConnected()) {
    return res.json({ success: true, data: { lessons: [] } });
  }

  const lessons = await Lesson.searchLessons(q, { difficulty, limit: limitNum });

  res.json({ success: true, data: { lessons, count: lessons.length } });
}));

// @route   GET /api/v1/lessons/popular
// @desc    Get popular lessons
// @access  Public
router.get('/popular', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  if (!isDbConnected()) {
    return res.json({ success: true, data: { lessons: [] } });
  }

  const lessons = await Lesson.getPopularLessons(limit);
  res.json({ success: true, data: { lessons } });
}));

// @route   GET /api/v1/lessons/:id
// @desc    Get a single lesson by ID
// @access  Public (hides correctAnswer unless authenticated)
router.get('/:id', optionalAuth, validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const lesson = await Lesson.findById(req.params.id)
    .populate('createdBy', 'username avatar')
    .lean();

  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (lesson.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  // Increment views asynchronously (fire and forget)
  Lesson.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

  // Hide correctAnswer for unauthenticated users
  if (!req.user) {
    lesson.questions = lesson.questions?.map(q => {
      const { correctAnswer, ...safeQ } = q;
      return safeQ;
    });
  }

  res.json({ success: true, data: { lesson } });
}));

// @route   POST /api/v1/lessons
// @desc    Create a new lesson (admin/instructor)
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateLesson, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const lesson = new Lesson({ ...req.body, createdBy: req.user.id });
  await lesson.save();

  res.status(201).json({
    success: true,
    message: 'Lesson created successfully',
    data: { lesson }
  });
}));

// @route   PUT /api/v1/lessons/:id
// @desc    Update a lesson
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const lesson = await Lesson.findByIdAndUpdate(
    req.params.id,
    { ...req.body, lastUpdatedBy: req.user.id },
    { new: true, runValidators: true }
  );

  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  res.json({
    success: true,
    message: 'Lesson updated successfully',
    data: { lesson }
  });
}));

// @route   DELETE /api/v1/lessons/:id
// @desc    Delete a lesson
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const lesson = await Lesson.findByIdAndDelete(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  res.json({ success: true, message: 'Lesson deleted successfully' });
}));

// @route   POST /api/v1/lessons/:id/complete
// @desc    Mark a lesson as completed for the authenticated user
// @access  Private
router.post('/:id/complete', auth, validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Lesson completion noted (demo mode)' });
  }

  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const User = require('../models/User');
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Increment completion count asynchronously
  Lesson.findByIdAndUpdate(req.params.id, { $inc: { completionCount: 1 } }).exec();

  // Update user stats
  user.stats.totalLessonsCompleted = (user.stats.totalLessonsCompleted || 0) + 1;
  const result = await user.addXP(lesson.xpReward || 10);

  res.json({
    success: true,
    message: `Lesson "${lesson.title}" completed! +${lesson.xpReward || 10} XP`,
    data: {
      xpAwarded: lesson.xpReward || 10,
      newLevel: result.user.level,
      leveledUp: result.leveledUp
    }
  });
}));

// @route   POST /api/v1/lessons/:id/rate
// @desc    Rate a lesson (1-5 stars)
// @access  Private
router.post('/:id/rate', auth, validateObjectId, asyncHandler(async (req, res) => {
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, message: 'Rating recorded (demo mode)' });
  }

  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  // Update running average
  const currentCount = lesson.rating.count || 0;
  const currentAvg = lesson.rating.average || 0;
  const newCount = currentCount + 1;
  const newAvg = ((currentAvg * currentCount) + rating) / newCount;

  await Lesson.findByIdAndUpdate(req.params.id, {
    'rating.average': Math.round(newAvg * 10) / 10,
    'rating.count': newCount
  });

  res.json({
    success: true,
    message: 'Rating submitted',
    data: { newAverage: Math.round(newAvg * 10) / 10, totalRatings: newCount }
  });
}));

module.exports = router;

const express = require('express');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');
const router = express.Router();

const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { validateLesson, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const isDbConnected = () => mongoose.connection.readyState === 1;

const sanitizeLesson = (lesson) => ({
  id: lesson._id || lesson.id,
  title: lesson.title,
  description: lesson.description,
  content: lesson.content,
  videoUrl: lesson.videoUrl,
  videoDuration: lesson.videoDuration,
  questions: lesson.questions,
  keyPoints: lesson.keyPoints,
  learningObjectives: lesson.learningObjectives,
  xpReward: lesson.xpReward,
  estimatedTime: lesson.estimatedTime,
  difficulty: lesson.difficulty,
  tags: lesson.tags,
  resources: lesson.resources,
  order: lesson.order,
  status: lesson.status,
  views: lesson.views,
  completionCount: lesson.completionCount,
  rating: lesson.rating,
  createdBy: lesson.createdBy,
  createdAt: lesson.createdAt,
  updatedAt: lesson.updatedAt
});

// @route   GET /api/v1/lessons
// @desc    Get all published lessons with filtering and pagination
// @access  Public
router.get('/', optionalAuth, validatePagination, validateSearch, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    difficulty,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    q: searchQuery
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    let filterQuery = { status: 'published' };
    if (difficulty) filterQuery.difficulty = difficulty;
    if (searchQuery) filterQuery.$text = { $search: searchQuery };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [lessons, total] = await Promise.all([
      Lesson.find(filterQuery)
        .populate('createdBy', 'username avatar')
        .sort(sortOptions)
        .limit(limitNum)
        .skip(skip)
        .lean(),
      Lesson.countDocuments(filterQuery)
    ]);

    return res.json({
      success: true,
      data: {
        lessons: lessons.map(sanitizeLesson),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalLessons: total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      }
    });
  }

  res.json({ success: true, data: { lessons: [], pagination: { currentPage: 1, totalPages: 0, totalLessons: 0 } } });
}));

// @route   GET /api/v1/lessons/search
// @desc    Search lessons
// @access  Public
router.get('/search', optionalAuth, validateSearch, asyncHandler(async (req, res) => {
  const { q: query, difficulty, limit = 20, page = 1 } = req.query;
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * limitNum;

  if (isDbConnected()) {
    const lessons = await Lesson.searchLessons(query, { difficulty, limit: limitNum, skip });
    return res.json({ success: true, data: { lessons: lessons.map(sanitizeLesson) } });
  }

  res.json({ success: true, data: { lessons: [] } });
}));

// @route   GET /api/v1/lessons/:id
// @desc    Get lesson by ID
// @access  Public
router.get('/:id', optionalAuth, validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const lesson = await Lesson.findById(req.params.id)
    .populate('createdBy', 'username avatar');

  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  // Increment view count in background
  if (req.user) {
    lesson.views = (lesson.views || 0) + 1;
    lesson.save().catch(err => console.error('Error updating lesson views:', err));
  }

  res.json({ success: true, data: { lesson: sanitizeLesson(lesson) } });
}));

// @route   POST /api/v1/lessons
// @desc    Create a new lesson
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateLesson, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const lesson = new Lesson({
    ...req.body,
    createdBy: req.user.id,
    status: req.body.status || 'draft'
  });
  await lesson.save();
  await lesson.populate('createdBy', 'username avatar');

  res.status(201).json({
    success: true,
    message: 'Lesson created successfully',
    data: { lesson: sanitizeLesson(lesson) }
  });
}));

// @route   PUT /api/v1/lessons/:id
// @desc    Update a lesson
// @access  Private (Admin / Creator)
router.put('/:id', auth, validateObjectId, validateLesson, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  if (lesson.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this lesson' });
  }

  Object.keys(req.body).forEach(key => { lesson[key] = req.body[key]; });
  lesson.lastUpdatedBy = req.user.id;
  await lesson.save();
  await lesson.populate('createdBy', 'username avatar');

  res.json({
    success: true,
    message: 'Lesson updated successfully',
    data: { lesson: sanitizeLesson(lesson) }
  });
}));

// @route   DELETE /api/v1/lessons/:id
// @desc    Delete a lesson
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), validateObjectId, asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  if (lesson.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this lesson' });
  }

  await Lesson.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: 'Lesson deleted successfully' });
}));

module.exports = router;
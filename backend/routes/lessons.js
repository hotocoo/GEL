const express = require('express');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');
const router = express.Router();

const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { validateLesson, validateObjectId, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { mockLessons } = require('../server');

const isDbConnected = () => mongoose.connection.readyState === 1;

// Utility to sanitize lesson output
const sanitizeLesson = (lesson) => ({
  id: lesson._id || lesson.id,
  title: lesson.title,
  content: lesson.content,
  courseId: lesson.courseId,
  difficulty: lesson.difficulty,
  xpReward: lesson.xpReward,
  estimatedTime: lesson.estimatedTime,
  order: lesson.order,
  status: lesson.status,
  questions: lesson.questions,
  createdBy: lesson.createdBy,
  createdAt: lesson.createdAt,
  updatedAt: lesson.updatedAt
});

// @route   GET /api/v1/lessons
// @desc    Get lessons with pagination and filtering
// @access  Public
router.get('/', optionalAuth, validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, courseId, difficulty, status = 'published' } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    const allowedStatuses = ['draft', 'published', 'archived'];
    const allowedDifficulties = ['beginner', 'intermediate', 'advanced'];
    const safeStatus = allowedStatuses.includes(status) ? status : 'published';
    const filter = { status: safeStatus };
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }
    if (difficulty && allowedDifficulties.includes(difficulty)) filter.difficulty = difficulty;

    const [lessons, total] = await Promise.all([
      Lesson.find(filter)
        .populate('createdBy', 'username avatar')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lesson.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        lessons: lessons.map(sanitizeLesson),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      }
    });
  } else {
    const filtered = mockLessons.filter(l => !difficulty || l.difficulty === difficulty);
    const paginated = filtered.slice(skip, skip + limitNum);
    res.json({
      success: true,
      data: {
        lessons: paginated.map(sanitizeLesson),
        pagination: { currentPage: pageNum, totalPages: Math.ceil(filtered.length / limitNum), total: filtered.length }
      }
    });
  }
}));

// @route   GET /api/v1/lessons/:id
// @desc    Get lesson by ID
// @access  Public
router.get('/:id', optionalAuth, validateObjectId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const lesson = await Lesson.findById(id).populate('createdBy', 'username avatar');

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Increment view count in background
    if (req.user) {
      lesson.views = (lesson.views || 0) + 1;
      lesson.save().catch(err => console.error('Error updating lesson views:', err));
    }

    res.json({ success: true, data: { lesson: sanitizeLesson(lesson) } });
  } else {
    const lesson = mockLessons.find(l => l._id == id || l.id == id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json({ success: true, data: { lesson: sanitizeLesson(lesson) } });
  }
}));

// @route   POST /api/v1/lessons
// @desc    Create a new lesson
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateLesson, asyncHandler(async (req, res) => {
  const lessonData = { ...req.body, createdBy: req.user.id };

  if (isDbConnected()) {
    const lesson = new Lesson(lessonData);
    await lesson.save();
    await lesson.populate('createdBy', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: { lesson: sanitizeLesson(lesson) }
    });
  } else {
    const lesson = {
      _id: Date.now().toString(),
      ...lessonData,
      status: lessonData.status || 'draft',
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockLessons.push(lesson);
    res.status(201).json({ success: true, message: 'Lesson created (demo mode)', data: { lesson: sanitizeLesson(lesson) } });
  }
}));

// @route   PUT /api/v1/lessons/:id
// @desc    Update a lesson
// @access  Private (Admin / Creator)
router.put('/:id', auth, validateObjectId, validateLesson, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this lesson' });
    }

    const allowedFields = ['title', 'content', 'difficulty', 'xpReward', 'estimatedTime', 'order', 'status', 'questions', 'videoUrl', 'transcript'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) lesson[field] = req.body[field];
    });

    await lesson.save();
    await lesson.populate('createdBy', 'username avatar');

    res.json({ success: true, message: 'Lesson updated successfully', data: { lesson: sanitizeLesson(lesson) } });
  } else {
    const idx = mockLessons.findIndex(l => l._id == id || l.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

    mockLessons[idx] = { ...mockLessons[idx], ...req.body, updatedAt: new Date() };
    res.json({ success: true, message: 'Lesson updated (demo mode)', data: { lesson: sanitizeLesson(mockLessons[idx]) } });
  }
}));

// @route   DELETE /api/v1/lessons/:id
// @desc    Delete a lesson
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), validateObjectId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this lesson' });
    }

    await Lesson.findByIdAndDelete(id);
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } else {
    const idx = mockLessons.findIndex(l => l._id == id || l.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

    mockLessons.splice(idx, 1);
    res.json({ success: true, message: 'Lesson deleted (demo mode)' });
  }
}));

module.exports = router;

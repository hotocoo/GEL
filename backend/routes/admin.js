const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// isDbConnected must be a function so it's evaluated on each request
const isDbConnected = () => mongoose.connection.readyState === 1;

// Import mock data
const { mockUsers, mockCourses } = require('../mockData');

// All admin routes require authentication and admin role
router.use(auth, authorize('admin'));

// @route   GET /api/v1/admin/dashboard
// @desc    Get admin dashboard summary
// @access  Admin
router.get('/dashboard', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const [totalUsers, totalCourses, totalLessons, recentUsers] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Lesson.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('username email level createdAt').lean()
    ]);

    return res.json({
      success: true,
      data: { totalUsers, totalCourses, totalLessons, recentUsers }
    });
  }

  res.json({
    success: true,
    data: {
      totalUsers: mockUsers.length,
      totalCourses: mockCourses.length,
      totalLessons: 0,
      recentUsers: mockUsers.slice(-5)
    }
  });
}));

// @route   GET /api/v1/admin/analytics
// @desc    Get platform analytics
// @access  Admin
router.get('/analytics', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const [totalUsers, totalCourses, totalLessons, activeUsers] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Lesson.countDocuments(),
      User.countDocuments({ isActive: true })
    ]);

    return res.json({
      success: true,
      data: { totalUsers, totalCourses, totalLessons, activeUsers }
    });
  }

  res.json({
    success: true,
    data: {
      totalUsers: mockUsers.length,
      totalCourses: mockCourses.length,
      totalLessons: 0,
      activeUsers: mockUsers.filter(u => u.isActive !== false).length
    }
  });
}));

// @route   GET /api/v1/admin/users
// @desc    Get all users with optional filtering
// @access  Admin
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, isActive, q } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    const filterQuery = {};
    if (role) filterQuery.role = role;
    if (isActive !== undefined) filterQuery.isActive = isActive === 'true';
    if (q) filterQuery.username = new RegExp(q.trim(), 'i');

    const [users, total] = await Promise.all([
      User.find(filterQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
        .select('username email role level xp streak isActive createdAt lastLogin').lean(),
      User.countDocuments(filterQuery)
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total }
      }
    });
  }

  res.json({
    success: true,
    data: {
      users: mockUsers.slice(skip, skip + limitNum),
      pagination: { currentPage: pageNum, totalPages: Math.ceil(mockUsers.length / limitNum), total: mockUsers.length }
    }
  });
}));

// @route   POST /api/v1/admin/users/:id/:action
// @desc    Perform an action on a user (activate, deactivate, promote, demote)
// @access  Admin
router.post('/users/:id/:action', asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const allowedActions = ['activate', 'deactivate', 'promote', 'demote'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` });
  }

  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (action === 'activate') user.isActive = true;
  if (action === 'deactivate') user.isActive = false;
  if (action === 'promote') user.role = 'admin';
  if (action === 'demote') user.role = 'student';

  await user.save();

  res.json({ success: true, message: `User ${action}d successfully`, data: { userId: id, action } });
}));

// @route   GET /api/v1/admin/courses
// @desc    Get all courses (all statuses) for admin
// @access  Admin
router.get('/courses', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, q } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    const filterQuery = {};
    if (status) filterQuery.status = status;
    if (q) filterQuery.title = new RegExp(q.trim(), 'i');

    const [courses, total] = await Promise.all([
      Course.find(filterQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
        .populate('createdBy', 'username').lean(),
      Course.countDocuments(filterQuery)
    ]);

    return res.json({
      success: true,
      data: {
        courses,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total }
      }
    });
  }

  res.json({
    success: true,
    data: {
      courses: mockCourses.slice(skip, skip + limitNum),
      pagination: { currentPage: pageNum, totalPages: Math.ceil(mockCourses.length / limitNum), total: mockCourses.length }
    }
  });
}));

// @route   POST /api/v1/admin/courses
// @desc    Create a course (admin shortcut)
// @access  Admin
router.post('/courses', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const course = new Course({ ...req.body, createdBy: req.user.id });
    await course.save();
    return res.status(201).json({ success: true, data: { course } });
  }

  const course = { _id: Date.now().toString(), ...req.body, createdBy: req.user.id };
  mockCourses.push(course);
  res.status(201).json({ success: true, data: { course } });
}));

// @route   POST /api/v1/admin/courses/:id/:action
// @desc    Perform an action on a course (publish, archive, feature)
// @access  Admin
router.post('/courses/:id/:action', asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const allowedActions = ['publish', 'archive', 'draft', 'feature', 'unfeature'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` });
  }

  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  const course = await Course.findById(id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (action === 'publish') { course.status = 'published'; course.publishedAt = new Date(); }
  if (action === 'archive') course.status = 'archived';
  if (action === 'draft') course.status = 'draft';
  if (action === 'feature') course.featured = true;
  if (action === 'unfeature') course.featured = false;

  await course.save();

  res.json({ success: true, message: `Course ${action}d successfully`, data: { courseId: id, action } });
}));

// @route   GET /api/v1/admin/reports
// @desc    Get platform reports
// @access  Admin
router.get('/reports', asyncHandler(async (req, res) => {
  if (isDbConnected()) {
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      publishedLessons,
      topUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'published' }),
      Lesson.countDocuments(),
      Lesson.countDocuments({ status: 'published' }),
      User.find({ isActive: true }).sort({ totalXp: -1 }).limit(5)
        .select('username level totalXp streak').lean()
    ]);

    return res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
        courses: { total: totalCourses, published: publishedCourses, drafts: totalCourses - publishedCourses },
        lessons: { total: totalLessons, published: publishedLessons },
        topUsers
      }
    });
  }

  res.json({
    success: true,
    data: {
      users: { total: mockUsers.length, active: mockUsers.length, inactive: 0 },
      courses: { total: mockCourses.length, published: mockCourses.length, drafts: 0 },
      lessons: { total: 0, published: 0 },
      topUsers: []
    }
  });
}));

module.exports = router;
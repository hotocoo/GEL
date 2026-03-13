const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

// isDbConnected must be a function (not a constant snapshot)
const isDbConnected = () => mongoose.connection.readyState === 1;

// Import mock data
const { mockUsers, mockCourses } = require('../data/mockData');

// All admin routes require authentication AND admin role
router.use(auth, authorize('admin'));

// @route   GET /api/v1/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Private (Admin)
router.get('/dashboard', asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      success: true,
      data: {
        totalUsers: mockUsers.length,
        totalCourses: mockCourses.length,
        totalLessons: 0,
        activeUsers: mockUsers.filter(u => u.isActive !== false).length
      }
    });
  }

  const [totalUsers, totalCourses, totalLessons, activeUsers, recentUsers] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Lesson.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.find({ isActive: true })
      .select('username avatar level xp totalXp createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalCourses,
      totalLessons,
      activeUsers,
      recentUsers
    }
  });
}));

// @route   GET /api/v1/admin/analytics
// @desc    Get analytics data
// @access  Private (Admin)
router.get('/analytics', asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      success: true,
      data: {
        totalUsers: mockUsers.length,
        totalCourses: mockCourses.length
      }
    });
  }

  const [
    totalUsers,
    totalCourses,
    totalLessons,
    publishedCourses,
    publishedLessons
  ] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Lesson.countDocuments(),
    Course.countDocuments({ status: 'published' }),
    Lesson.countDocuments({ status: 'published' })
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalCourses,
      totalLessons,
      publishedCourses,
      publishedLessons
    }
  });
}));

// @route   GET /api/v1/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin)
router.get('/users', validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q, role } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (!isDbConnected()) {
    const filtered = mockUsers.filter(u =>
      (!q || u.username.includes(q.toLowerCase())) &&
      (!role || u.role === role)
    );
    return res.json({
      success: true,
      data: {
        users: filtered.slice(skip, skip + limitNum),
        pagination: { currentPage: pageNum, totalPages: Math.ceil(filtered.length / limitNum), total: filtered.length }
      }
    });
  }

  let query = {};
  if (q) query.$or = [
    { username: { $regex: q, $options: 'i' } },
    { email: { $regex: q, $options: 'i' } }
  ];
  if (role) query.role = role;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      users,
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

// @route   POST /api/v1/admin/users/:id/:action
// @desc    Manage a user (activate, deactivate, promote, demote)
// @access  Private (Admin)
router.post('/users/:id/:action', validateObjectId, asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const allowedActions = ['activate', 'deactivate', 'promote', 'demote'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, message: `Action "${action}" applied (demo mode)` });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  switch (action) {
    case 'activate':
      user.isActive = true;
      break;
    case 'deactivate':
      if (user._id.toString() === req.user.id.toString()) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
      user.isActive = false;
      break;
    case 'promote':
      user.role = 'admin';
      break;
    case 'demote':
      if (user._id.toString() === req.user.id.toString()) {
        return res.status(400).json({ error: 'Cannot demote your own account' });
      }
      user.role = 'student';
      break;
  }

  await user.save();

  res.json({
    success: true,
    message: `User ${action}d successfully`,
    data: { user: { id: user._id, username: user.username, role: user.role, isActive: user.isActive } }
  });
}));

// @route   GET /api/v1/admin/courses
// @desc    Get all courses with admin-level details
// @access  Private (Admin)
router.get('/courses', validatePagination, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, q } = req.query;
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (pageNum - 1) * limitNum;

  if (!isDbConnected()) {
    return res.json({ success: true, data: { courses: mockCourses.slice(skip, skip + limitNum) } });
  }

  let query = {};
  if (status) query.status = status;
  if (q) query.$or = [
    { title: { $regex: q, $options: 'i' } },
    { subject: { $regex: q, $options: 'i' } }
  ];

  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Course.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      courses,
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

// @route   POST /api/v1/admin/courses/:id/:action
// @desc    Manage a course (publish, archive, feature, unfeature)
// @access  Private (Admin)
router.post('/courses/:id/:action', validateObjectId, asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const allowedActions = ['publish', 'archive', 'feature', 'unfeature'];

  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` });
  }

  if (!isDbConnected()) {
    return res.json({ success: true, message: `Action "${action}" applied (demo mode)` });
  }

  const course = await Course.findById(id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  switch (action) {
    case 'publish':
      course.status = 'published';
      course.publishedAt = new Date();
      break;
    case 'archive':
      course.status = 'archived';
      break;
    case 'feature':
      course.featured = true;
      break;
    case 'unfeature':
      course.featured = false;
      break;
  }

  await course.save();

  res.json({
    success: true,
    message: `Course ${action}d successfully`,
    data: { course: { id: course._id, title: course.title, status: course.status, featured: course.featured } }
  });
}));

// @route   POST /api/v1/admin/courses
// @desc    Create a new course (admin)
// @access  Private (Admin)
router.post('/courses', asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    const course = { _id: Date.now().toString(), ...req.body, createdBy: req.user.id };
    mockCourses.push(course);
    return res.status(201).json({ success: true, data: { course } });
  }

  const course = new Course({ ...req.body, createdBy: req.user.id });
  await course.save();

  res.status(201).json({ success: true, message: 'Course created', data: { course } });
}));

// @route   GET /api/v1/admin/reports
// @desc    Get system reports
// @access  Private (Admin)
router.get('/reports', asyncHandler(async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ success: true, data: { report: { message: 'Reports unavailable in demo mode' } } });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [newUsers, activeCourses, topUsers] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Course.countDocuments({ status: 'published' }),
    User.find({ isActive: true })
      .select('username level totalXp streak')
      .sort({ totalXp: -1 })
      .limit(10)
      .lean()
  ]);

  res.json({
    success: true,
    data: {
      report: {
        period: '30 days',
        newUsers,
        activeCourses,
        topUsers
      }
    }
  });
}));

module.exports = router;

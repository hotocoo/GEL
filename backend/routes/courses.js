const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');
const router = express.Router();

// Import middleware
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { validateCourse, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Check if DB is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// Import mock data for fallback
const { mockCourses, mockLessons } = require('../server');

// Utility function to sanitize course data
const sanitizeCourse = (course) => ({
  id: course._id || course.id,
  title: course.title,
  description: course.description,
  subject: course.subject,
  category: course.category,
  difficulty: course.difficulty,
  tags: course.tags,
  lessons: course.lessons,
  totalLessons: course.totalLessons,
  xpReward: course.xpReward,
  estimatedDuration: course.estimatedDuration,
  prerequisites: course.prerequisites,
  learningObjectives: course.learningObjectives,
  thumbnail: course.thumbnail,
  featured: course.featured,
  status: course.status,
  rating: course.rating,
  enrollmentCount: course.enrollmentCount,
  completionRate: course.completionRate,
  createdBy: course.createdBy,
  collaborators: course.collaborators,
  createdAt: course.createdAt,
  updatedAt: course.updatedAt
});

// @route   GET /api/v1/courses
// @desc    Get all courses with filtering and pagination
// @access  Public
router.get('/', optionalAuth, validatePagination, validateSearch, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    subject,
    category,
    difficulty,
    featured,
    status = 'published',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    q: searchQuery
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
  const skip = (pageNum - 1) * limitNum;

  if (isDbConnected()) {
    // Build filter query
    let filterQuery = { status };

    if (subject) filterQuery.subject = new RegExp(subject, 'i');
    if (category) filterQuery.category = category;
    if (difficulty) filterQuery.difficulty = difficulty;
    if (featured === 'true') filterQuery.featured = true;
    if (searchQuery) {
      filterQuery.$text = { $search: searchQuery };
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const courses = await Course.find(filterQuery)
      .populate('createdBy', 'username avatar')
      .populate('lessons', 'title difficulty estimatedTime')
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    const total = await Course.countDocuments(filterQuery);

    res.json({
      success: true,
      data: {
        courses: courses.map(sanitizeCourse),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCourses: total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      }
    });
  } else {
    // Mock data for demo
    let filteredCourses = [...mockCourses];

    if (subject) filteredCourses = filteredCourses.filter(c => c.subject?.toLowerCase().includes(subject.toLowerCase()));
    if (category) filteredCourses = filteredCourses.filter(c => c.category === category);
    if (difficulty) filteredCourses = filteredCourses.filter(c => c.difficulty === difficulty);
    if (featured === 'true') filteredCourses = filteredCourses.filter(c => c.featured);

    const total = filteredCourses.length;
    const paginatedCourses = filteredCourses.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: {
        courses: paginatedCourses.map(sanitizeCourse),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCourses: total,
          hasNext: skip + limitNum < total,
          hasPrev: pageNum > 1
        }
      }
    });
  }
}));

// @route   GET /api/v1/courses/popular
// @desc    Get popular courses
// @access  Public
router.get('/popular/all', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50);

  if (isDbConnected()) {
    const courses = await Course.getPopularCourses(limitNum);
    
    res.json({
      success: true,
      data: {
        courses: courses.map(sanitizeCourse)
      }
    });
  } else {
    // Mock popular courses (reverse order for demo)
    const popularCourses = [...mockCourses].reverse().slice(0, limitNum);
    
    res.json({
      success: true,
      data: {
        courses: popularCourses.map(sanitizeCourse)
      }
    });
  }
}));

// @route   GET /api/v1/courses/featured
// @desc    Get featured courses
// @access  Public
router.get('/featured/all', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit), 50);

  if (isDbConnected()) {
    const courses = await Course.getFeaturedCourses(limitNum);
    
    res.json({
      success: true,
      data: {
        courses: courses.map(sanitizeCourse)
      }
    });
  } else {
    // Mock featured courses
    const featuredCourses = mockCourses.filter(c => c.featured).slice(0, limitNum);
    
    res.json({
      success: true,
      data: {
        courses: featuredCourses.map(sanitizeCourse)
      }
    });
  }
}));

// @route   GET /api/v1/courses/search
// @desc    Search courses with advanced filters
// @access  Public
router.get('/search/all', optionalAuth, validateSearch, asyncHandler(async (req, res) => {
  const {
    q: query,
    subject,
    category,
    difficulty,
    limit = 20,
    page = 1
  } = req.query;

  const limitNum = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * limitNum;

  if (isDbConnected()) {
    const courses = await Course.searchCourses(query, {
      subject,
      category,
      difficulty,
      limit: limitNum,
      skip
    });

    const totalQuery = {};
    if (query) totalQuery.$text = { $search: query };
    if (subject) totalQuery.subject = new RegExp(subject, 'i');
    if (category) totalQuery.category = category;
    if (difficulty) totalQuery.difficulty = difficulty;
    
    const total = await Course.countDocuments(totalQuery);

    res.json({
      success: true,
      data: {
        courses: courses.map(sanitizeCourse),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalCourses: total,
          hasNext: skip + limitNum < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } else {
    // Mock search
    let filteredCourses = [...mockCourses];
    
    if (query) {
      filteredCourses = filteredCourses.filter(c =>
        c.title?.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.subject?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (subject) filteredCourses = filteredCourses.filter(c => c.subject?.toLowerCase().includes(subject.toLowerCase()));
    if (category) filteredCourses = filteredCourses.filter(c => c.category === category);
    if (difficulty) filteredCourses = filteredCourses.filter(c => c.difficulty === difficulty);

    const total = filteredCourses.length;
    const paginatedCourses = filteredCourses.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: {
        courses: paginatedCourses.map(sanitizeCourse),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalCourses: total,
          hasNext: skip + limitNum < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  }
}));

// @route   GET /api/v1/courses/:id
// @desc    Get course by ID with full details
// @access  Public
router.get('/:id', optionalAuth, validateObjectId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const course = await Course.findById(id)
      .populate('createdBy', 'username avatar level')
      .populate('collaborators.user', 'username avatar')
      .populate({
        path: 'lessons',
        match: { status: 'published' },
        options: { sort: { order: 1 } },
        populate: {
          path: 'createdBy',
          select: 'username avatar'
        }
      });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Increment view count if user is authenticated
    if (req.user) {
      // Track view in background (don't await)
      course.views = (course.views || 0) + 1;
      course.save().catch(err => console.error('Error updating course views:', err));
    }

    res.json({
      success: true,
      data: {
        course: sanitizeCourse(course)
      }
    });
  } else {
    const course = mockCourses.find(c => c._id == id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      data: {
        course: sanitizeCourse(course)
      }
    });
  }
}));

// @route   POST /api/v1/courses
// @desc    Create a new course
// @access  Private (Admin/Teacher)
router.post('/', auth, authorize('admin'), validateCourse, asyncHandler(async (req, res) => {
  const courseData = {
    ...req.body,
    createdBy: req.user.id,
    status: req.body.status || 'draft'
  };

  if (isDbConnected()) {
    const course = new Course(courseData);
    await course.save();

    // Populate the createdBy field for response
    await course.populate('createdBy', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course: sanitizeCourse(course)
      }
    });
  } else {
    const course = {
      _id: Date.now().toString(),
      ...courseData,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      enrollmentCount: 0,
      rating: { average: 0, count: 0 }
    };
    
    mockCourses.push(course);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course: sanitizeCourse(course)
      }
    });
  }
}));

// @route   PUT /api/v1/courses/:id
// @desc    Update a course
// @access  Private (Admin/Course Creator)
router.put('/:id', auth, validateObjectId, validateCourse, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is authorized to edit
    if (course.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this course' });
    }

    // Update course
    Object.keys(req.body).forEach(key => {
      course[key] = req.body[key];
    });
    
    course.lastUpdatedBy = req.user.id;
    await course.save();

    // Populate for response
    await course.populate('createdBy', 'username avatar');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course: sanitizeCourse(course)
      }
    });
  } else {
    const courseIndex = mockCourses.findIndex(c => c._id == id);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Update course
    mockCourses[courseIndex] = {
      ...mockCourses[courseIndex],
      ...req.body,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course: sanitizeCourse(mockCourses[courseIndex])
      }
    });
  }
}));

// @route   DELETE /api/v1/courses/:id
// @desc    Delete a course
// @access  Private (Admin/Course Creator)
router.delete('/:id', auth, authorize('admin'), validateObjectId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is authorized to delete
    if (course.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this course' });
    }

    await Course.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } else {
    const courseIndex = mockCourses.findIndex(c => c._id == id);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Course not found' });
    }

    mockCourses.splice(courseIndex, 1);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  }
}));

// @route   POST /api/v1/courses/:id/enroll
// @desc    Enroll user in a course
// @access  Private
router.post('/:id/enroll', auth, validateObjectId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is already enrolled
    const isEnrolled = req.user.progress?.some(p => p.course === course.title);
    if (isEnrolled) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Add to user's progress
    req.user.progress.push({
      subject: course.subject,
      course: course.title,
      lessonsCompleted: 0,
      totalLessons: course.totalLessons,
      score: 0,
      lastAccessed: new Date()
    });

    // Update course enrollment count
    course.enrollmentCount += 1;

    await Promise.all([req.user.save(), course.save()]);

    res.json({
      success: true,
      message: `Successfully enrolled in ${course.title}!`
    });
  } else {
    const course = mockCourses.find(c => c._id == id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      message: `Successfully enrolled in ${course.title}! (Demo mode)`
    });
  }
}));

// @route   GET /api/v1/courses/:id/progress
// @desc    Get user's progress in a specific course
// @access  Private
router.get('/:id/progress', auth, validateObjectId, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDbConnected()) {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const userProgress = req.user.progress?.find(p => p.course === course.title);

    res.json({
      success: true,
      data: {
        course: sanitizeCourse(course),
        progress: userProgress || {
          subject: course.subject,
          course: course.title,
          lessonsCompleted: 0,
          totalLessons: course.totalLessons,
          score: 0,
          lastAccessed: new Date()
        }
      }
    });
  } else {
    const course = mockCourses.find(c => c._id == id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      data: {
        course: sanitizeCourse(course),
        progress: {
          lessonsCompleted: 0,
          totalLessons: course.totalLessons || 0,
          score: 0
        }
      }
    });
  }
}));

module.exports = router;
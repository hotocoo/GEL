const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Achievement = require('../models/Achievement');
const Quest = require('../models/Quest');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const { asyncHandler } = require('../middleware/errorHandler');

// @route   POST /api/v1/seed
// @desc    Seed sample data (development only)
// @access  Public (dev only)
router.post('/', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seeding is not allowed in production' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  // Find or create a system admin user for seeding
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    return res.status(400).json({ error: 'No admin user found. Please create an admin user first via /api/v1/auth/signup' });
  }

  // Sample Achievement
  const achievement = new Achievement({
    title: 'First Lesson',
    description: 'Completed your first lesson!',
    category: 'learning',
    type: 'bronze',
    xpReward: 50,
    badge: 'first-lesson-badge.png',
    criteria: { type: 'lessons_completed', target: 1 },
    createdBy: adminUser._id
  });
  await achievement.save();

  // Sample Quest
  const quest = new Quest({
    title: 'Daily Study',
    description: 'Study for 10 minutes today',
    type: 'daily',
    category: 'learning',
    objectives: [{ type: 'lessons_completed', target: 1, description: 'Complete 1 lesson' }],
    rewards: { xp: 20 },
    createdBy: adminUser._id
  });
  await quest.save();

  // Sample Lesson
  const lesson = new Lesson({
    title: 'Introduction to Variables',
    description: 'Learn about variables in programming',
    content: 'Variables are containers for storing data values.',
    keyPoints: ['Variables hold data', 'Can be changed', 'Have different types'],
    questions: [{
      question: 'What is a variable?',
      options: ['A container for data', 'A function', 'A class', 'A loop'],
      correctAnswer: 'A container for data',
      difficulty: 1,
      points: 10
    }],
    xpReward: 10,
    difficulty: 'beginner',
    status: 'published',
    createdBy: adminUser._id
  });
  await lesson.save();

  // Sample Course
  const course = new Course({
    title: 'Basic Programming',
    description: 'Learn the basics of programming',
    subject: 'Computer Science',
    category: 'computer-science',
    difficulty: 'beginner',
    lessons: [lesson._id],
    xpReward: 100,
    status: 'published',
    createdBy: adminUser._id
  });
  await course.save();

  res.json({
    success: true,
    message: 'Sample data created successfully',
    data: {
      achievement: achievement._id,
      quest: quest._id,
      lesson: lesson._id,
      course: course._id
    }
  });
}));

module.exports = router;
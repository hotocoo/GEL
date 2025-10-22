const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Achievement = require('../models/Achievement');
const Quest = require('../models/Quest');
const router = express.Router();

// Seed data
router.post('/', async (req, res) => {
  try {
    // Sample Achievement
    const achievement = new Achievement({ title: 'First Lesson', description: 'Completed your first lesson', xpReward: 50 });
    await achievement.save();

    // Sample Quest
    const quest = new Quest({ title: 'Daily Study', description: 'Study for 10 minutes', type: 'daily', xpReward: 20 });
    await quest.save();

    // Sample Lesson
    const lesson = new Lesson({
      title: 'Introduction to Variables',
      content: 'Variables are containers for storing data values.',
      keyPoints: ['Variables hold data', 'Can be changed'],
      questions: [{
        question: 'What is a variable?',
        options: ['A container', 'A function', 'A class'],
        correctAnswer: 'A container',
        difficulty: 1
      }],
      xpReward: 10
    });
    await lesson.save();

    // Sample Course
    const course = new Course({
      title: 'Basic Programming',
      description: 'Learn the basics of programming',
      subject: 'Computer Science',
      lessons: [lesson._id],
      xpReward: 100
    });
    await course.save();

    res.json({ message: 'Sample data created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
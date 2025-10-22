const express = require('express');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const mongoose = require('mongoose');
const router = express.Router();

const isDbConnected = mongoose.connection.readyState === 1;

// Import mock data
const { mockUsers, mockCourses } = require('../server');

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  next();
};

// Create course
router.post('/courses', isAdmin, async (req, res) => {
  try {
    if (isDbConnected) {
      const course = new Course(req.body);
      await course.save();
      res.status(201).json(course);
    } else {
      const course = { _id: Date.now(), ...req.body };
      mockCourses.push(course);
      res.status(201).json(course);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', isAdmin, async (req, res) => {
  try {
    if (isDbConnected) {
      const totalUsers = await User.countDocuments();
      const totalCourses = await Course.countDocuments();
      res.json({ totalUsers, totalCourses });
    } else {
      res.json({ totalUsers: mockUsers.length, totalCourses: mockCourses.length });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
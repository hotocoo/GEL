const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// User validation rules
const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .notEmpty()
    .withMessage('Username is required'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .notEmpty()
    .withMessage('Email is required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('role')
    .optional()
    .isIn(['student', 'admin'])
    .withMessage('Role must be either student or admin'),

  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .notEmpty()
    .withMessage('Email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Course validation rules
const validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Course title must be between 3 and 200 characters')
    .notEmpty()
    .withMessage('Course title is required'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Course description cannot exceed 2000 characters'),

  body('subject')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject must be between 1 and 100 characters')
    .notEmpty()
    .withMessage('Course subject is required'),

  body('category')
    .isIn(['computer-science', 'mathematics', 'physics', 'biology', 'chemistry', 'history', 'literature', 'languages', 'engineering', 'business', 'arts', 'other'])
    .withMessage('Please select a valid category'),

  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),

  body('xpReward')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('XP reward must be between 0 and 10,000'),

  handleValidationErrors
];

// Lesson validation rules
const validateLesson = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Lesson title must be between 3 and 200 characters')
    .notEmpty()
    .withMessage('Lesson title is required'),

  body('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Lesson content cannot exceed 10,000 characters'),

  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),

  body('xpReward')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('XP reward must be between 0 and 1,000'),

  handleValidationErrors
];

// Question validation rules
const validateQuestion = [
  body('question')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Question must be between 1 and 500 characters')
    .notEmpty()
    .withMessage('Question is required'),

  body('options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('Options must be an array with 2 to 6 items'),

  body('options.*')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be between 1 and 200 characters'),

  body('correctAnswer')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Correct answer must be between 1 and 200 characters')
    .notEmpty()
    .withMessage('Correct answer is required'),

  body('difficulty')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Difficulty must be between 1 and 5'),

  body('points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Points must be between 1 and 100'),

  handleValidationErrors
];

// Parameter validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),

  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors
];

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject must be between 1 and 100 characters'),

  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateCourse,
  validateLesson,
  validateQuestion,
  validateObjectId,
  validatePagination,
  validateSearch
};
const { body } = require('express-validator');
const { EXAM_CATEGORIES, EXAM_LANGUAGES, EXAM_STATUS } = require('../config/constants');
const { validate } = require('./auth');

/**
 * Create exam validation rules
 */
const validateCreateExam = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot be more than 1000 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters'),
  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isIn(Object.values(EXAM_LANGUAGES))
    .withMessage('Invalid language'),
  body('totalMarks')
    .notEmpty()
    .withMessage('Total marks is required')
    .isInt({ min: 1 })
    .withMessage('Total marks must be a positive integer'),
  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (in minutes)'),
  body('status')
    .optional()
    .isIn(Object.values(EXAM_STATUS))
    .withMessage('Invalid status'),
  validate,
];

/**
 * Update exam validation rules
 */
const validateUpdateExam = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot be more than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot be more than 1000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters'),
  body('language')
    .optional()
    .isIn(Object.values(EXAM_LANGUAGES))
    .withMessage('Invalid language'),
  body('totalMarks')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total marks must be a positive integer'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (in minutes)'),
  body('status')
    .optional()
    .isIn(Object.values(EXAM_STATUS))
    .withMessage('Invalid status'),
  validate,
];

module.exports = {
  validateCreateExam,
  validateUpdateExam,
};


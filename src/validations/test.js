const { body } = require('express-validator');
const { validate } = require('./auth');

/**
 * Create test validation rules
 */
const validateCreateTest = [
  body('testName')
    .trim()
    .notEmpty()
    .withMessage('Test name is required')
    .isLength({ max: 200 })
    .withMessage('Test name cannot be more than 200 characters'),
  body('examId')
    .notEmpty()
    .withMessage('Exam ID is required')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  body('tabId')
    .optional()
    .isMongoId()
    .withMessage('Invalid tab ID'),
  body('totalQuestions')
    .notEmpty()
    .withMessage('Total questions is required')
    .isInt({ min: 1 })
    .withMessage('Total questions must be a positive integer'),
  body('totalMarks')
    .notEmpty()
    .withMessage('Total marks is required')
    .isInt({ min: 1 })
    .withMessage('Total marks must be a positive integer'),
  body('correctMark')
    .notEmpty()
    .withMessage('Correct mark is required')
    .isFloat({ min: 0 })
    .withMessage('Correct mark must be 0 or greater'),
  body('negativeMark')
    .notEmpty()
    .withMessage('Negative mark is required')
    .isFloat({ min: 0 })
    .withMessage('Negative mark must be 0 or greater'),
  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (in minutes)'),
  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),
  body('order')
    .notEmpty()
    .withMessage('Order is required')
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  validate,
];

/**
 * Update test validation rules
 */
const validateUpdateTest = [
  body('testName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Test name cannot be more than 200 characters'),
  body('totalQuestions')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total questions must be a positive integer'),
  body('totalMarks')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total marks must be a positive integer'),
  body('correctMark')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Correct mark must be 0 or greater'),
  body('negativeMark')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negative mark must be 0 or greater'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (in minutes)'),
  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  validate,
];

module.exports = {
  validateCreateTest,
  validateUpdateTest,
};


const { body } = require('express-validator');
const { validate } = require('./auth');

/**
 * Create question validation rules
 */
const validateCreateQuestion = [
  body('questionText')
    .trim()
    .notEmpty()
    .withMessage('Question text is required'),
  body('testId')
    .notEmpty()
    .withMessage('Test ID is required')
    .isMongoId()
    .withMessage('Invalid test ID'),
  body('options.A')
    .trim()
    .notEmpty()
    .withMessage('Option A is required'),
  body('options.B')
    .trim()
    .notEmpty()
    .withMessage('Option B is required'),
  body('options.C')
    .trim()
    .notEmpty()
    .withMessage('Option C is required'),
  body('options.D')
    .trim()
    .notEmpty()
    .withMessage('Option D is required'),
  body('correctOption')
    .notEmpty()
    .withMessage('Correct option is required')
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Correct option must be A, B, C, or D'),
  body('marks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Marks must be a non-negative number'),
  body('negativeMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negative marks must be a non-negative number'),
  body('order')
    .notEmpty()
    .withMessage('Order is required')
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('explanation')
    .optional()
    .trim(),
  validate,
];

/**
 * Update question validation rules
 */
const validateUpdateQuestion = [
  body('questionText')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Question text cannot be empty'),
  body('options.A')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Option A cannot be empty'),
  body('options.B')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Option B cannot be empty'),
  body('options.C')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Option C cannot be empty'),
  body('options.D')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Option D cannot be empty'),
  body('correctOption')
    .optional()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Correct option must be A, B, C, or D'),
  body('marks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Marks must be a non-negative number'),
  body('negativeMarks')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negative marks must be a non-negative number'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('explanation')
    .optional()
    .trim(),
  validate,
];

module.exports = {
  validateCreateQuestion,
  validateUpdateQuestion,
};


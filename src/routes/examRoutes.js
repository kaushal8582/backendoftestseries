const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const { validateCreateExam, validateUpdateExam } = require('../validations/exam');

/**
 * @route   POST /api/exams
 * @desc    Create a new exam
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validateCreateExam,
  examController.createExam
);

/**
 * @route   GET /api/exams
 * @desc    Get all exams
 * @access  Public
 */
router.get('/', authenticate, examController.getExams);

/**
 * @route   GET /api/exams/:id
 * @desc    Get exam by ID
 * @access  Public
 */
router.get('/:id', examController.getExamById);

/**
 * @route   PUT /api/exams/:id
 * @desc    Update exam
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validateUpdateExam,
  examController.updateExam
);

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete exam
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  examController.deleteExam
);

/**
 * @route   GET /api/exams/:id/tests
 * @desc    Get all tests for an exam
 * @access  Public
 */
router.get('/:id/tests', examController.getExamTests);

module.exports = router;


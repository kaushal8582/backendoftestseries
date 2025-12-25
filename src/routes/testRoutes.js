const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const { validateCreateTest, validateUpdateTest } = require('../validations/test');

/**
 * @route   POST /api/tests
 * @desc    Create a new test
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validateCreateTest,
  testController.createTest
);

/**
 * @route   GET /api/tests
 * @desc    Get all tests (filtered by examId)
 * @access  Public
 */
router.get('/', testController.getTests);

/**
 * @route   GET /api/tests/:id
 * @desc    Get test by ID
 * @access  Public
 */
router.get('/:id', testController.getTestById);

/**
 * @route   PUT /api/tests/:id
 * @desc    Update test
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validateUpdateTest,
  testController.updateTest
);

/**
 * @route   DELETE /api/tests/:id
 * @desc    Delete test
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  testController.deleteTest
);

module.exports = router;


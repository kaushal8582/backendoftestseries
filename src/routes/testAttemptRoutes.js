const express = require('express');
const router = express.Router();
const testAttemptController = require('../controllers/testAttemptController');
const { authenticate } = require('../middlewares/auth');
const { checkSubscription } = require('../middlewares/subscription');

/**
 * @route   POST /api/test-attempts/start/:testId
 * @desc    Start a test attempt
 * @access  Private
 */
router.post(
  '/start/:testId',
  authenticate,
  checkSubscription,
  testAttemptController.startTest
);

/**
 * @route   POST /api/test-attempts/:attemptId/answer
 * @desc    Submit answer for a question
 * @access  Private
 */
router.post('/:attemptId/answer', authenticate, testAttemptController.submitAnswer);

/**
 * @route   POST /api/test-attempts/:attemptId/submit
 * @desc    Submit test (finalize attempt)
 * @access  Private
 */
router.post('/:attemptId/submit', authenticate, testAttemptController.submitTest);

/**
 * @route   GET /api/test-attempts/:attemptId
 * @desc    Get test attempt by ID
 * @access  Private
 */
router.get('/:attemptId', authenticate, testAttemptController.getTestAttempt);

/**
 * @route   GET /api/test-attempts/:attemptId/details
 * @desc    Get test attempt details with questions and answers
 * @access  Private
 */
router.get(
  '/:attemptId/details',
  authenticate,
  testAttemptController.getTestAttemptDetails
);

/**
 * @route   GET /api/test-attempts/check/:testId
 * @desc    Check if user has completed a test
 * @access  Private
 */
router.get(
  '/check/:testId',
  authenticate,
  testAttemptController.checkTestCompletion
);

module.exports = router;


const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   GET /api/analytics/test/:testId
 * @desc    Get test performance analytics
 * @access  Private (Admin only)
 */
router.get(
  '/test/:testId',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  analyticsController.getTestAnalytics
);

/**
 * @route   GET /api/analytics/exam/:examId
 * @desc    Get exam performance analytics
 * @access  Private (Admin only)
 */
router.get(
  '/exam/:examId',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  analyticsController.getExamAnalytics
);

/**
 * @route   GET /api/analytics/test/:testId/leaderboard
 * @desc    Get test leaderboard
 * @access  Public
 */
router.get('/test/:testId/leaderboard', analyticsController.getTestLeaderboard);

module.exports = router;


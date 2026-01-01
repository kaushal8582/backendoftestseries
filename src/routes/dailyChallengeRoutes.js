const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const dailyChallengeController = require('../controllers/dailyChallengeController');

/**
 * @route   GET /api/daily-challenges
 * @desc    Get today's daily challenges (filtered by user's exam preferences)
 * @access  Private
 */
router.get('/', authenticate, dailyChallengeController.getTodayChallenges);

/**
 * @route   POST /api/daily-challenges/:challengeId/claim
 * @desc    Claim challenge reward
 * @access  Private
 */
router.post('/:challengeId/claim', authenticate, dailyChallengeController.claimReward);

// Admin routes
/**
 * @route   POST /api/daily-challenges/admin/create
 * @desc    Create a daily challenge (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/admin/create',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  dailyChallengeController.createDailyChallenge
);

/**
 * @route   PUT /api/daily-challenges/admin/:challengeId
 * @desc    Update a daily challenge (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/admin/:challengeId',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  dailyChallengeController.updateDailyChallenge
);

/**
 * @route   GET /api/daily-challenges/admin/all
 * @desc    Get all daily challenges (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  dailyChallengeController.getAllChallenges
);

/**
 * @route   DELETE /api/daily-challenges/admin/:challengeId
 * @desc    Delete a daily challenge (Admin only)
 * @access  Private (Admin)
 */
router.delete(
  '/admin/:challengeId',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  dailyChallengeController.deleteDailyChallenge
);

module.exports = router;


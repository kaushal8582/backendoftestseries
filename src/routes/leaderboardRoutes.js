const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const leaderboardController = require('../controllers/leaderboardController');

/**
 * @route   GET /api/leaderboard/global
 * @desc    Get global leaderboard
 * @access  Private
 */
router.get('/global', authenticate, leaderboardController.getGlobalLeaderboard);

/**
 * @route   GET /api/leaderboard/weekly
 * @desc    Get weekly leaderboard
 * @access  Private
 */
router.get('/weekly', authenticate, leaderboardController.getWeeklyLeaderboard);

/**
 * @route   GET /api/leaderboard/category/:categoryId
 * @desc    Get category leaderboard
 * @access  Private
 */
router.get('/category/:categoryId', authenticate, leaderboardController.getCategoryLeaderboard);

/**
 * @route   GET /api/leaderboard/my-rank
 * @desc    Get user's rank
 * @access  Private
 */
router.get('/my-rank', authenticate, leaderboardController.getMyRank);

/**
 * @route   GET /api/leaderboard/daily-challenge
 * @desc    Get daily challenge leaderboard
 * @access  Private
 */
router.get('/daily-challenge', authenticate, leaderboardController.getDailyChallengeLeaderboard);

module.exports = router;


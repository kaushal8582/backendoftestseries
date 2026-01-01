const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const gamificationController = require('../controllers/gamificationController');

/**
 * @route   GET /api/gamification/stats
 * @desc    Get user gamification stats
 * @access  Private
 */
router.get('/stats', authenticate, gamificationController.getStats);

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get user achievements
 * @access  Private
 */
router.get('/achievements', authenticate, gamificationController.getAchievements);

/**
 * @route   POST /api/gamification/spend-coins
 * @desc    Spend coins
 * @access  Private
 */
router.post('/spend-coins', authenticate, gamificationController.spendCoins);

/**
 * @route   POST /api/gamification/initialize-achievements
 * @desc    Initialize default achievements (Admin only)
 * @access  Private (Admin)
 */
router.post('/initialize-achievements', authenticate, authorize('ADMIN'), gamificationController.initializeAchievements);

module.exports = router;


const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, userController.updateProfile);

/**
 * @route   GET /api/users/test-attempts
 * @desc    Get user test attempts
 * @access  Private
 */
router.get('/test-attempts', authenticate, userController.getTestAttempts);

/**
 * @route   GET /api/users/performance
 * @desc    Get user performance summary
 * @access  Private
 */
router.get('/performance', authenticate, userController.getPerformanceSummary);

/**
 * @route   GET /api/users/study-streak
 * @desc    Get user study streak and daily goal progress
 * @access  Private
 */
router.get('/study-streak', authenticate, userController.getStudyStreak);

module.exports = router;


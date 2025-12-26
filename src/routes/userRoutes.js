const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const upload = require('../middlewares/multer');

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
router.put('/profile', authenticate, upload.single('profilePicture'), userController.updateProfile);

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

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, authorize(USER_ROLES.ADMIN), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, authorize(USER_ROLES.ADMIN), userController.getUserById);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (Admin only)
 * @access  Private (Admin only)
 */
router.put('/:id/role', authenticate, authorize(USER_ROLES.ADMIN), userController.updateUserRole);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user active status (Admin only)
 * @access  Private (Admin only)
 */
router.put('/:id/status', authenticate, authorize(USER_ROLES.ADMIN), userController.updateUserStatus);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(USER_ROLES.ADMIN), userController.deleteUser);

module.exports = router;


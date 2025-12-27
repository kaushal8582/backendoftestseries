const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

// User routes (for device token registration)
/**
 * @route   POST /api/notifications/register-token
 * @desc    Register device token
 * @access  Private
 */
router.post('/register-token', authenticate, notificationController.registerDeviceToken);

/**
 * @route   DELETE /api/notifications/remove-token
 * @desc    Remove device token
 * @access  Private
 */
router.delete('/remove-token', authenticate, notificationController.removeDeviceToken);

// Admin routes
/**
 * @route   POST /api/notifications
 * @desc    Create notification
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorize(USER_ROLES.ADMIN), notificationController.createNotification);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications
 * @access  Private (Admin only)
 */
router.get('/', authenticate, authorize(USER_ROLES.ADMIN), notificationController.getNotifications);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, authorize(USER_ROLES.ADMIN), notificationController.getNotificationById);

/**
 * @route   PUT /api/notifications/:id
 * @desc    Update notification
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorize(USER_ROLES.ADMIN), notificationController.updateNotification);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(USER_ROLES.ADMIN), notificationController.deleteNotification);

/**
 * @route   POST /api/notifications/:id/send
 * @desc    Send notification immediately
 * @access  Private (Admin only)
 */
router.post('/:id/send', authenticate, authorize(USER_ROLES.ADMIN), notificationController.sendNotification);

module.exports = router;


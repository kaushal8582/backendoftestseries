const notificationService = require('../services/notificationService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/notifications/register-token
 * @desc    Register device token for push notifications
 * @access  Private
 */
const registerDeviceToken = async (req, res, next) => {
  try {
    const { token, platform, deviceId, deviceInfo } = req.body;
    const userId = req.user._id;

    if (!token || !platform) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Token and platform are required',
      });
    }

    const deviceToken = await notificationService.registerDeviceToken(
      userId,
      token,
      platform,
      deviceId,
      deviceInfo
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        deviceToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/notifications/remove-token
 * @desc    Remove device token
 * @access  Private
 */
const removeDeviceToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Token is required',
      });
    }

    await notificationService.removeDeviceToken(userId, token);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Device token removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/notifications
 * @desc    Create notification (Admin only)
 * @access  Private (Admin only)
 */
const createNotification = async (req, res, next) => {
  try {
    // Clean up data - remove recurringPattern if isRecurring is false
    const notificationData = {
      ...req.body,
      createdBy: req.user._id,
    };

    // If isRecurring is false, don't include recurringPattern
    if (!notificationData.isRecurring) {
      delete notificationData.recurringPattern;
    }

    // If recurringPattern is null or undefined, remove it
    if (!notificationData.recurringPattern) {
      delete notificationData.recurringPattern;
    }

    const notification = await notificationService.createNotification(notificationData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications (Admin only)
 * @access  Private (Admin only)
 */
const getNotifications = async (req, res, next) => {
  try {
    const filters = {};
    
    // Optional filters
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.recipientType) {
      filters.recipientType = req.query.recipientType;
    }

    const notifications = await notificationService.getNotifications(filters);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID (Admin only)
 * @access  Private (Admin only)
 */
const getNotificationById = async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id);

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notifications/:id
 * @desc    Update notification (Admin only)
 * @access  Private (Admin only)
 */
const updateNotification = async (req, res, next) => {
  try {
    // Clean up data - remove recurringPattern if isRecurring is false
    const updateData = { ...req.body };

    // If isRecurring is false, don't include recurringPattern
    if (updateData.isRecurring === false) {
      delete updateData.recurringPattern;
    }

    // If recurringPattern is null or undefined, remove it
    if (!updateData.recurringPattern) {
      delete updateData.recurringPattern;
    }

    const notification = await notificationService.updateNotification(
      req.params.id,
      updateData
    );

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification (Admin only)
 * @access  Private (Admin only)
 */
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.deleteNotification(req.params.id);

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/notifications/:id/send
 * @desc    Send notification immediately (Admin only)
 * @access  Private (Admin only)
 */
const sendNotification = async (req, res, next) => {
  try {
    const result = await notificationService.sendNotification(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: result.success,
      message: result.message || 'Notification sent successfully',
      data: {
        sent: result.sent,
        failed: result.failed,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDeviceToken,
  removeDeviceToken,
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
  sendNotification,
};


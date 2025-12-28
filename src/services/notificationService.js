const DeviceToken = require('../models/DeviceToken');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendToMultipleDevices } = require('../utils/fcm');

/**
 * Register or update device token for a user
 */
const registerDeviceToken = async (userId, token, platform, deviceId = null, deviceInfo = {}) => {
  try {
    // Check if token already exists
    let deviceToken = await DeviceToken.findOne({ token });

    if (deviceToken) {
      // Update existing token
      deviceToken.userId = userId;
      deviceToken.platform = platform;
      deviceToken.deviceId = deviceId;
      deviceToken.deviceInfo = deviceInfo;
      deviceToken.isActive = true;
      deviceToken.lastUsedAt = new Date();
      await deviceToken.save();
      return deviceToken;
    }

    // Create new device token
    deviceToken = await DeviceToken.create({
      userId,
      token,
      platform,
      deviceId,
      deviceInfo,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return deviceToken;
  } catch (error) {
    throw new Error(`Failed to register device token: ${error.message}`);
  }
};

/**
 * Remove device token
 */
const removeDeviceToken = async (userId, token) => {
  try {
    const deviceToken = await DeviceToken.findOneAndUpdate(
      { userId, token },
      { isActive: false },
      { new: true }
    );
    return deviceToken;
  } catch (error) {
    throw new Error(`Failed to remove device token: ${error.message}`);
  }
};

/**
 * Get all active device tokens for a user
 */
const getUserDeviceTokens = async (userId) => {
  try {
    const tokens = await DeviceToken.find({
      userId,
      isActive: true,
    }).select('token platform');
    return tokens;
  } catch (error) {
    throw new Error(`Failed to get user device tokens: ${error.message}`);
  }
};

/**
 * Get recipients based on notification recipient type
 */
const getRecipients = async (recipientType, recipients) => {
  try {
    let userIds = [];

    switch (recipientType) {
      case 'all':
        // Get all active users
        const allUsers = await User.find({ isActive: true }).select('_id');
        userIds = allUsers.map((u) => u._id);
        break;

      case 'specific':
        userIds = recipients.userIds || [];
        break;

      case 'plan':
        // Get users with specific subscription plan
        const UserSubscription = require('../models/UserSubscription');
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        
        const plan = await SubscriptionPlan.findOne({ type: recipients.planType });
        if (plan) {
          const subscriptions = await UserSubscription.find({
            planId: plan._id,
            status: 'active',
          }).select('userId');
          userIds = subscriptions.map((s) => s.userId);
        }
        break;

      case 'category':
        // Get users who have attempted tests in specific categories
        const TestAttempt = require('../models/TestAttempt');
        const Test = require('../models/Test');
        
        const tests = await Test.find({
          categoryId: { $in: recipients.categoryIds },
        }).select('_id');
        
        const testIds = tests.map((t) => t._id);
        const attempts = await TestAttempt.find({
          testId: { $in: testIds },
        }).distinct('userId');
        
        userIds = attempts;
        break;

      case 'exam':
        // Get users who have attempted tests in specific exams
        const TestAttempt2 = require('../models/TestAttempt');
        const Test2 = require('../models/Test');
        
        const tests2 = await Test2.find({
          examId: { $in: recipients.examIds },
        }).select('_id');
        
        const testIds2 = tests2.map((t) => t._id);
        const attempts2 = await TestAttempt2.find({
          testId: { $in: testIds2 },
        }).distinct('userId');
        
        userIds = attempts2;
        break;

      default:
        userIds = [];
    }

    return userIds;
  } catch (error) {
    throw new Error(`Failed to get recipients: ${error.message}`);
  }
};

/**
 * Send notification to recipients
 */
const sendNotification = async (notificationId) => {
  try {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Update status to sending
    notification.status = 'sending';
    await notification.save();

    // Get recipients
    const userIds = await getRecipients(notification.recipientType, notification.recipients);

    if (userIds.length === 0) {
      notification.status = 'failed';
      await notification.save();
      return {
        success: false,
        message: 'No recipients found',
        sent: 0,
        failed: 0,
      };
    }

    // Get all device tokens for recipients
    const deviceTokens = await DeviceToken.find({
      userId: { $in: userIds },
      isActive: true,
    }).select('token platform').lean();

    console.log(`📱 Found ${deviceTokens.length} active device token(s) for ${userIds.length} user(s)`);

    if (deviceTokens.length === 0) {
      console.warn(`⚠️  No device tokens found for ${userIds.length} user(s). Users may need to open the app to register their device tokens.`);
      notification.status = 'failed';
      notification.failureReason = 'No device tokens found. Users need to open the app to register their device tokens.';
      await notification.save();
      return {
        success: false,
        message: 'No device tokens found. Users need to open the app to register their device tokens.',
        sent: 0,
        failed: 0,
      };
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    
    // Log token types for debugging
    const expoTokens = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
    const fcmTokens = tokens.filter((t) => t && !t.startsWith('ExponentPushToken'));
    console.log(`📱 Token breakdown: ${expoTokens.length} Expo tokens, ${fcmTokens.length} FCM tokens`);

    // Prepare notification payload
    const notificationPayload = {
      title: notification.title,
      body: notification.body,
      image: notification.image,
    };

    const dataPayload = {
      notificationId: notification._id.toString(),
      ...notification.data,
    };

    // Send notifications
    console.log(`📤 Sending notification to ${tokens.length} device(s)...`);
    const result = await sendToMultipleDevices(tokens, notificationPayload, dataPayload);

    // Log results for debugging
    console.log(`📊 Notification send results:`, {
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      total: tokens.length,
      hasError: result.error,
    });

    // Log individual failures for debugging
    if (result.results && result.results.length > 0) {
      const failures = result.results.filter((r) => !r.success);
      if (failures.length > 0) {
        console.error(`❌ Failed notifications (${failures.length}):`, failures.slice(0, 3).map((f) => ({
          token: f.token?.substring(0, 20) + '...',
          error: f.error,
        })));
      }
    }

    // Update notification status and stats
    // Mark as sent only if at least one notification was successful
    // If all failed, mark as failed
    const successCount = result.successCount || 0;
    const failureCount = result.failureCount || 0;
    
    if (successCount > 0) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else if (failureCount === tokens.length) {
      // All notifications failed
      notification.status = 'failed';
      notification.failureReason = result.error || 'All notifications failed';
    } else {
      // Partial success
      notification.status = 'sent';
      notification.sentAt = new Date();
    }
    
    notification.deliveryStats.totalSent = tokens.length;
    notification.deliveryStats.totalDelivered = successCount;
    notification.deliveryStats.totalFailed = failureCount;
    await notification.save();

    // Deactivate failed tokens
    if (result.results) {
      const failedTokens = result.results
        .filter((r) => !r.success)
        .map((r) => r.token);

      if (failedTokens.length > 0) {
        await DeviceToken.updateMany(
          { token: { $in: failedTokens } },
          { isActive: false }
        );
      }
    }

    return {
      success: true,
      sent: result.successCount || 0,
      failed: result.failureCount || 0,
      total: tokens.length,
    };
  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
    console.error('Error stack:', error.stack);
    
    // Update notification status to failed
    const notification = await Notification.findById(notificationId);
    if (notification) {
      notification.status = 'failed';
      notification.failureReason = error.message || 'Unknown error occurred';
      await notification.save();
    }

    // Return error details instead of throwing (so admin can see what went wrong)
    return {
      success: false,
      message: `Failed to send notification: ${error.message}`,
      sent: 0,
      failed: 0,
      error: error.message,
    };
  }
};

/**
 * Create notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

/**
 * Get all notifications
 */
const getNotifications = async (filters = {}) => {
  try {
    const notifications = await Notification.find(filters)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return notifications;
  } catch (error) {
    throw new Error(`Failed to get notifications: ${error.message}`);
  }
};

/**
 * Get notification by ID
 */
const getNotificationById = async (notificationId) => {
  try {
    const notification = await Notification.findById(notificationId)
      .populate('createdBy', 'name email')
      .populate('recipients.userIds', 'name email')
      .populate('recipients.categoryIds', 'name')
      .populate('recipients.examIds', 'name');
    return notification;
  } catch (error) {
    throw new Error(`Failed to get notification: ${error.message}`);
  }
};

/**
 * Update notification
 */
const updateNotification = async (notificationId, updateData) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      updateData,
      { new: true, runValidators: true }
    );
    return notification;
  } catch (error) {
    throw new Error(`Failed to update notification: ${error.message}`);
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndDelete(notificationId);
    return notification;
  } catch (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
};

module.exports = {
  registerDeviceToken,
  removeDeviceToken,
  getUserDeviceTokens,
  getRecipients,
  sendNotification,
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
};


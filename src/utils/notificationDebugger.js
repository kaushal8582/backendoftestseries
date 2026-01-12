const DeviceToken = require('../models/DeviceToken');
const User = require('../models/User');

/**
 * Debug device token registration for a user
 */
const debugUserDeviceTokens = async (userId) => {
  try {
    const user = await User.findById(userId).select('name email');
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const deviceTokens = await DeviceToken.find({ userId, isActive: true });

    const expoTokens = deviceTokens.filter((dt) => 
      dt.token && dt.token.startsWith('ExponentPushToken')
    );
    const fcmTokens = deviceTokens.filter((dt) => 
      dt.token && !dt.token.startsWith('ExponentPushToken')
    );

    return {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      totalTokens: deviceTokens.length,
      expoTokens: expoTokens.length,
      fcmTokens: fcmTokens.length,
      tokens: deviceTokens.map((dt) => ({
        id: dt._id,
        token: dt.token?.substring(0, 30) + '...',
        fullToken: dt.token, // Include full token for debugging
        platform: dt.platform,
        isActive: dt.isActive,
        lastUsedAt: dt.lastUsedAt,
        deviceInfo: dt.deviceInfo,
        createdAt: dt.createdAt,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Verify if a specific token exists and is active
 */
const verifyToken = async (token) => {
  try {
    const deviceToken = await DeviceToken.findOne({ token, isActive: true })
      .populate('userId', 'name email');

    if (!deviceToken) {
      return {
        success: false,
        found: false,
        message: 'Token not found or inactive',
      };
    }

    return {
      success: true,
      found: true,
      token: {
        id: deviceToken._id,
        token: deviceToken.token?.substring(0, 30) + '...',
        platform: deviceToken.platform,
        isActive: deviceToken.isActive,
        lastUsedAt: deviceToken.lastUsedAt,
        deviceInfo: deviceToken.deviceInfo,
      },
      user: {
        id: deviceToken.userId._id,
        name: deviceToken.userId.name,
        email: deviceToken.userId.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get all active device tokens (for admin debugging)
 */
const getAllActiveTokens = async () => {
  try {
    const deviceTokens = await DeviceToken.find({ isActive: true })
      .populate('userId', 'name email')
      .sort({ lastUsedAt: -1 });

    const expoTokens = deviceTokens.filter((dt) => 
      dt.token && dt.token.startsWith('ExponentPushToken')
    );
    const fcmTokens = deviceTokens.filter((dt) => 
      dt.token && !dt.token.startsWith('ExponentPushToken')
    );

    return {
      success: true,
      total: deviceTokens.length,
      expoTokens: expoTokens.length,
      fcmTokens: fcmTokens.length,
      tokens: deviceTokens.map((dt) => ({
        id: dt._id,
        userId: dt.userId?._id,
        userName: dt.userId?.name,
        userEmail: dt.userId?.email,
        token: dt.token?.substring(0, 30) + '...',
        platform: dt.platform,
        isActive: dt.isActive,
        lastUsedAt: dt.lastUsedAt,
        createdAt: dt.createdAt,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  debugUserDeviceTokens,
  verifyToken,
  getAllActiveTokens,
};

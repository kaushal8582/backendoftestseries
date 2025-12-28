const axios = require('axios');

/**
 * Expo Push Notification Service API endpoint
 */
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification to Expo Push Tokens
 * @param {Array<string>} tokens - Array of Expo Push Tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendToExpoTokens = async (tokens, notification, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'No Expo tokens provided',
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    // Prepare messages for Expo API
    // Expo API expects an array of message objects
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: {
        ...data,
        // Ensure all data values are strings or numbers
        ...Object.keys(data).reduce((acc, key) => {
          const value = data[key];
          if (value !== null && value !== undefined) {
            acc[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
          }
          return acc;
        }, {}),
      },
      // Add image if provided
      ...(notification.image && { image: notification.image }),
      // Priority for Android
      priority: 'high',
      // Badge for iOS
      badge: 1,
    }));

    // Send to Expo Push Notification Service
    const response = await axios.post(EXPO_PUSH_API_URL, messages, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    // Process response
    const results = response.data.data || [];
    const successCount = results.filter((r) => r.status === 'ok').length;
    const failureCount = results.filter((r) => r.status === 'error').length;

    // Map results to our format
    const mappedResults = results.map((result, index) => ({
      success: result.status === 'ok',
      token: tokens[index],
      messageId: result.id || null,
      error: result.status === 'error' ? (result.message || 'Unknown error') : null,
      details: result.details || null,
    }));

    return {
      success: true,
      successCount,
      failureCount,
      results: mappedResults,
    };
  } catch (error) {
    console.error('Error sending Expo push notifications:', error.message);
    console.error('Error details:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.message,
      successCount: 0,
      failureCount: tokens.length,
      results: tokens.map((token) => ({
        success: false,
        token,
        error: error.message || 'Failed to send notification',
      })),
    };
  }
};

module.exports = {
  sendToExpoTokens,
};


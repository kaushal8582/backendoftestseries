const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let firebaseAdmin = null;

const initializeFirebase = () => {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if Firebase credentials are provided
    if (!process.env.FCM_PROJECT_ID || !process.env.FCM_PRIVATE_KEY || !process.env.FCM_CLIENT_EMAIL) {
      console.warn('FCM credentials not found. Push notifications will be disabled.');
      return null;
    }

    // Initialize Firebase Admin
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FCM_PROJECT_ID,
        privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FCM_CLIENT_EMAIL,
      }),
    });

    console.log('Firebase Admin SDK initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    return null;
  }
};

/**
 * Send notification to a single device token
 * @param {string} token - FCM device token
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendToDevice = async (token, notification, data = {}) => {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined,
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return {
      success: true,
      messageId: response,
      token,
    };
  } catch (error) {
    console.error('Error sending notification to device:', error.message);
    return {
      success: false,
      error: error.message,
      token,
    };
  }
};

/**
 * Send notification to multiple device tokens (multicast)
 * @param {Array<string>} tokens - Array of FCM device tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendToMultipleDevices = async (tokens, notification, data = {}) => {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
        results: [],
      };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined,
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send to multiple tokens (batch send)
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    const results = response.responses.map((result, index) => ({
      success: result.success,
      token: tokens[index],
      messageId: result.messageId,
      error: result.error ? result.error.message : null,
    }));

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      results,
    };
  } catch (error) {
    console.error('Error sending multicast notification:', error.message);
    return {
      success: false,
      error: error.message,
      results: [],
    };
  }
};

/**
 * Send notification to a topic
 * @param {string} topic - FCM topic name
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
const sendToTopic = async (topic, notification, data = {}) => {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined,
      },
      data: {
        ...data,
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return {
      success: true,
      messageId: response,
      topic,
    };
  } catch (error) {
    console.error('Error sending notification to topic:', error.message);
    return {
      success: false,
      error: error.message,
      topic,
    };
  }
};

module.exports = {
  initializeFirebase,
  sendToDevice,
  sendToMultipleDevices,
  sendToTopic,
};


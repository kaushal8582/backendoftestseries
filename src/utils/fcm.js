const admin = require('firebase-admin');
const { sendToExpoTokens } = require('./expoPushNotifications');

// Initialize Firebase Admin SDK
let firebaseAdmin = null;

const initializeFirebase = () => {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if Firebase credentials are provided
    if (!process.env.FCM_PROJECT_ID || !process.env.FCM_PRIVATE_KEY || !process.env.FCM_CLIENT_EMAIL) {
      console.warn('⚠️  FCM credentials not found. Push notifications will be disabled.');
      console.warn('   Please set FCM_PROJECT_ID, FCM_PRIVATE_KEY, and FCM_CLIENT_EMAIL in your .env file');
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

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`   Project ID: ${process.env.FCM_PROJECT_ID}`);
    return firebaseAdmin;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    console.error('   Please check your FCM credentials in .env file');
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
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
        results: [],
      };
    }

    // Prepare notification payload (used for both FCM and Expo)
    const notificationPayload = {
      title: notification.title,
      body: notification.body,
      image: notification.image,
    };

    const dataPayload = {
      ...data,
      // Convert all data values to strings (FCM requirement)
      ...Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}),
    };

    // Filter out Expo Push Tokens (they start with "ExponentPushToken")
    const expoTokens = [];
    const fcmTokens = [];
    
    tokens.forEach((token) => {
      if (token && typeof token === 'string' && token.startsWith('ExponentPushToken')) {
        expoTokens.push(token);
      } else if (token) {
        fcmTokens.push(token);
      }
    });

    // Log token types for debugging
    console.log(`📱 Token distribution: ${fcmTokens.length} FCM tokens, ${expoTokens.length} Expo tokens`);

    // If only Expo tokens, we don't need Firebase
    if (fcmTokens.length === 0 && expoTokens.length > 0) {
      const expoResponse = await sendToExpoTokens(expoTokens, notificationPayload, dataPayload);
      return {
        success: true,
        successCount: expoResponse.successCount || 0,
        failureCount: expoResponse.failureCount || 0,
        results: expoResponse.results || [],
      };
    }

    // Initialize Firebase only if we have FCM tokens
    if (fcmTokens.length > 0) {
      const app = initializeFirebase();
      if (!app) {
        console.warn('⚠️  Firebase Admin SDK not initialized. FCM tokens will fail.');
      }
    }

    const message = {
      notification: {
        title: notificationPayload.title,
        body: notificationPayload.body,
        imageUrl: notificationPayload.image || undefined,
      },
      data: dataPayload,
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

    // Send to both FCM and Expo tokens in parallel
    const promises = [];

    // Send FCM tokens if any
    let fcmResults = [];
    if (fcmTokens.length > 0) {
      promises.push(
        admin.messaging().sendEachForMulticast({
          tokens: fcmTokens,
          ...message,
        }).then((response) => {
          fcmResults = response.responses.map((result, index) => ({
            success: result.success,
            token: fcmTokens[index],
            messageId: result.messageId,
            error: result.error ? result.error.message : null,
          }));
          return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            results: fcmResults,
          };
        }).catch((error) => {
          console.error('Error sending FCM notifications:', error);
          fcmResults = fcmTokens.map((token) => ({
            success: false,
            token,
            error: error.message || 'FCM send failed',
          }));
          return {
            successCount: 0,
            failureCount: fcmTokens.length,
            results: fcmResults,
          };
        })
      );
    } else {
      // No FCM tokens, return empty result
      promises.push(Promise.resolve({
        successCount: 0,
        failureCount: 0,
        results: [],
      }));
    }

    // Send Expo tokens if any
    let expoResults = [];
    if (expoTokens.length > 0) {
      promises.push(
        sendToExpoTokens(expoTokens, notificationPayload, dataPayload).then((expoResponse) => {
          expoResults = expoResponse.results || [];
          return {
            successCount: expoResponse.successCount || 0,
            failureCount: expoResponse.failureCount || 0,
            results: expoResults,
          };
        }).catch((error) => {
          console.error('Error sending Expo notifications:', error);
          expoResults = expoTokens.map((token) => ({
            success: false,
            token,
            error: error.message || 'Expo send failed',
          }));
          return {
            successCount: 0,
            failureCount: expoTokens.length,
            results: expoResults,
          };
        })
      );
    } else {
      // No Expo tokens, return empty result
      promises.push(Promise.resolve({
        successCount: 0,
        failureCount: 0,
        results: [],
      }));
    }

    // Wait for both to complete
    const [fcmResponse, expoResponse] = await Promise.all(promises);

    // Combine results
    const allResults = [...fcmResponse.results, ...expoResponse.results];
    const totalSuccessCount = fcmResponse.successCount + expoResponse.successCount;
    const totalFailureCount = fcmResponse.failureCount + expoResponse.failureCount;

    return {
      success: true,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      results: allResults,
    };
  } catch (error) {
    console.error('Error sending multicast notification:', error.message);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: error.message,
      successCount: 0,
      failureCount: tokens.length,
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


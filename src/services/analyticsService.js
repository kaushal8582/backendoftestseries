const AnalyticsEvent = require('../models/AnalyticsEvent');

/**
 * Track an analytics event
 */
const trackEvent = async (userId, event, data = {}) => {
  try {
    const analyticsEvent = new AnalyticsEvent({
      userId,
      event,
      data,
      timestamp: new Date(),
      platform: data.platform,
      appVersion: data.appVersion,
    });

    await analyticsEvent.save();
    return analyticsEvent;
  } catch (error) {
    console.error('Error tracking event:', error);
    throw error;
  }
};

/**
 * Get user analytics summary
 */
const getUserAnalytics = async (userId, startDate, endDate) => {
  try {
    const query = { userId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const events = await AnalyticsEvent.find(query).sort({ timestamp: -1 });

    // Calculate summary statistics
    const summary = {
      totalEvents: events.length,
      eventsByType: {},
      dailyActivity: {},
      testCompletions: 0,
      powerUpsUsed: 0,
      achievementsUnlocked: 0,
      levelUps: 0,
      coinsEarned: 0,
      coinsSpent: 0,
    };

    events.forEach((event) => {
      // Count by event type
      summary.eventsByType[event.event] =
        (summary.eventsByType[event.event] || 0) + 1;

      // Daily activity
      const date = event.timestamp.toISOString().split('T')[0];
      summary.dailyActivity[date] = (summary.dailyActivity[date] || 0) + 1;

      // Specific event counts
      if (event.event === 'test_completed') {
        summary.testCompletions++;
      } else if (event.event === 'power_up_used') {
        summary.powerUpsUsed++;
      } else if (event.event === 'achievement_unlocked') {
        summary.achievementsUnlocked++;
      } else if (event.event === 'level_up') {
        summary.levelUps++;
      } else if (event.event === 'coin_earned') {
        summary.coinsEarned += event.data.amount || 0;
      } else if (event.event === 'coin_spent') {
        summary.coinsSpent += event.data.amount || 0;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error getting user analytics:', error);
    throw error;
  }
};

/**
 * Get app-wide analytics (admin only)
 */
const getAppAnalytics = async (startDate, endDate) => {
  try {
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const events = await AnalyticsEvent.find(query);

    // Calculate app-wide statistics
    const summary = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map((e) => e.userId.toString())).size,
      eventsByType: {},
      dailyActivity: {},
      testCompletions: 0,
      powerUpsUsed: 0,
      achievementsUnlocked: 0,
      levelUps: 0,
      averageTestScore: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
    };

    let totalTestScore = 0;
    let testCount = 0;

    events.forEach((event) => {
      // Count by event type
      summary.eventsByType[event.event] =
        (summary.eventsByType[event.event] || 0) + 1;

      // Daily activity
      const date = event.timestamp.toISOString().split('T')[0];
      summary.dailyActivity[date] = (summary.dailyActivity[date] || 0) + 1;

      // Specific event counts
      if (event.event === 'test_completed') {
        summary.testCompletions++;
        if (event.data.score !== undefined) {
          totalTestScore += event.data.score;
          testCount++;
        }
      } else if (event.event === 'power_up_used') {
        summary.powerUpsUsed++;
      } else if (event.event === 'achievement_unlocked') {
        summary.achievementsUnlocked++;
      } else if (event.event === 'level_up') {
        summary.levelUps++;
      } else if (event.event === 'coin_earned') {
        summary.totalCoinsEarned += event.data.amount || 0;
      } else if (event.event === 'coin_spent') {
        summary.totalCoinsSpent += event.data.amount || 0;
      }
    });

    if (testCount > 0) {
      summary.averageTestScore = totalTestScore / testCount;
    }

    return summary;
  } catch (error) {
    console.error('Error getting app analytics:', error);
    throw error;
  }
};

module.exports = {
  trackEvent,
  getUserAnalytics,
  getAppAnalytics,
};

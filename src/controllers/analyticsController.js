const analyticsService = require('../services/analyticsService');
const { getTestLeaderboard } = require('../services/leaderboardService');

/**
 * Track an analytics event
 */
const trackEvent = async (req, res) => {
  try {
    const userId = req.user._id;
    const { event, data, timestamp } = req.body;

    await analyticsService.trackEvent(userId, event, {
      ...data,
      platform: req.headers['x-platform'],
      appVersion: req.headers['x-app-version'],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
};

/**
 * Get user analytics summary
 */
const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getUserAnalytics(
      userId,
      startDate,
      endDate
    );

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Get app-wide analytics (admin only)
 */
const getAppAnalytics = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;

    const analytics = await analyticsService.getAppAnalytics(startDate, endDate);

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error getting app analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Get test leaderboard
 */
const getTestLeaderboardHandler = async (req, res) => {
  try {
    const { testId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const leaderboard = await getTestLeaderboard(testId, {
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting test leaderboard:', error);
    res.status(500).json({ error: 'Failed to get test leaderboard' });
  }
};

module.exports = {
  trackEvent,
  getUserAnalytics,
  getAppAnalytics,
  getTestLeaderboard: getTestLeaderboardHandler,
};

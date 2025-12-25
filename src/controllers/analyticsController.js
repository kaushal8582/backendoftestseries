const analyticsService = require('../services/analyticsService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/analytics/test/:testId
 * @desc    Get test performance analytics
 * @access  Private (Admin only)
 */
const getTestAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getTestAnalytics(req.params.testId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        analytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/exam/:examId
 * @desc    Get exam performance analytics
 * @access  Private (Admin only)
 */
const getExamAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getExamAnalytics(req.params.examId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        analytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/test/:testId/leaderboard
 * @desc    Get test leaderboard
 * @access  Public
 */
const getTestLeaderboard = async (req, res, next) => {
  try {
    const result = await analyticsService.getTestLeaderboard(req.params.testId, req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTestAnalytics,
  getExamAnalytics,
  getTestLeaderboard,
};


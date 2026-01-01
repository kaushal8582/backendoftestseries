const {
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getCategoryLeaderboard,
  getUserRank,
  getDailyChallengeLeaderboard,
} = require('../services/leaderboardService');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/leaderboard/global
 * @desc    Get global leaderboard
 * @access  Private
 */
const getGlobalLeaderboardHandler = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const leaderboard = await getGlobalLeaderboard({
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/leaderboard/weekly
 * @desc    Get weekly leaderboard
 * @access  Private
 */
const getWeeklyLeaderboardHandler = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const leaderboard = await getWeeklyLeaderboard({
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/leaderboard/category/:categoryId
 * @desc    Get category leaderboard
 * @access  Private
 */
const getCategoryLeaderboardHandler = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const leaderboard = await getCategoryLeaderboard(categoryId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/leaderboard/my-rank
 * @desc    Get user's rank
 * @access  Private
 */
const getMyRankHandler = async (req, res, next) => {
  try {
    const rankInfo = await getUserRank(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: rankInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/leaderboard/daily-challenge
 * @desc    Get daily challenge leaderboard
 * @access  Private
 */
const getDailyChallengeLeaderboardHandler = async (req, res, next) => {
  try {
    const { challengeId, limit = 50, offset = 0 } = req.query;
    const leaderboard = await getDailyChallengeLeaderboard(challengeId || null, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGlobalLeaderboard: getGlobalLeaderboardHandler,
  getWeeklyLeaderboard: getWeeklyLeaderboardHandler,
  getCategoryLeaderboard: getCategoryLeaderboardHandler,
  getMyRank: getMyRankHandler,
  getDailyChallengeLeaderboard: getDailyChallengeLeaderboardHandler,
};


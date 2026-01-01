const { getGamificationStats, spendCoins } = require('../services/gamificationService');
const { getUserAchievements, initializeAchievements } = require('../services/achievementService');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/gamification/stats
 * @desc    Get user gamification stats
 * @access  Private
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await getGamificationStats(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get user achievements
 * @access  Private
 */
const getAchievements = async (req, res, next) => {
  try {
    const achievements = await getUserAchievements(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/gamification/spend-coins
 * @desc    Spend coins
 * @access  Private
 */
const spendCoinsHandler = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await spendCoins(req.user._id, amount);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Coins spent successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/gamification/initialize-achievements
 * @desc    Initialize default achievements (Admin only)
 * @access  Private (Admin)
 */
const initializeAchievementsHandler = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Unauthorized. Admin access required.', HTTP_STATUS.FORBIDDEN);
    }

    await initializeAchievements();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Achievements initialized successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getAchievements,
  spendCoins: spendCoinsHandler,
  initializeAchievements: initializeAchievementsHandler,
};


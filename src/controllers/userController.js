const userService = require('../services/userService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user._id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/test-attempts
 * @desc    Get user test attempts
 * @access  Private
 */
const getTestAttempts = async (req, res, next) => {
  try {
    const result = await userService.getUserTestAttempts(req.user._id, req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/performance
 * @desc    Get user performance summary
 * @access  Private
 */
const getPerformanceSummary = async (req, res, next) => {
  try {
    const performance = await userService.getUserPerformanceSummary(req.user._id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        performance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/study-streak
 * @desc    Get user study streak and daily goal progress
 * @access  Private
 */
const getStudyStreak = async (req, res, next) => {
  try {
    const streakData = await userService.getUserStudyStreak(req.user._id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        streak: streakData,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getTestAttempts,
  getPerformanceSummary,
  getStudyStreak,
};


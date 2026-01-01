const {
  getAvailablePowerUps,
  usePowerUp,
  activateBoost,
  getAttemptPowerUps,
} = require('../services/powerUpService');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/power-ups
 * @desc    Get all available power-ups
 * @access  Private
 */
const getPowerUps = async (req, res, next) => {
  try {
    const powerUps = await getAvailablePowerUps();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: powerUps,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/power-ups/use
 * @desc    Use a power-up during test
 * @access  Private
 */
const usePowerUpHandler = async (req, res, next) => {
  try {
    const { attemptId, powerUpId, context } = req.body;

    if (!attemptId || !powerUpId) {
      throw new AppError('Attempt ID and Power-up ID are required', HTTP_STATUS.BAD_REQUEST);
    }

    const effect = await usePowerUp(req.user._id, attemptId, powerUpId, context);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Power-up used successfully',
      data: effect,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/power-ups/activate-boost
 * @desc    Activate a boost before test
 * @access  Private
 */
const activateBoostHandler = async (req, res, next) => {
  try {
    const { powerUpId } = req.body;

    if (!powerUpId) {
      throw new AppError('Power-up ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const boost = await activateBoost(req.user._id, powerUpId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Boost activated successfully',
      data: boost,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/power-ups/attempt/:attemptId
 * @desc    Get power-ups used in an attempt
 * @access  Private
 */
const getAttemptPowerUpsHandler = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const powerUps = await getAttemptPowerUps(attemptId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: powerUps,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPowerUps,
  usePowerUp: usePowerUpHandler,
  activateBoost: activateBoostHandler,
  getAttemptPowerUps: getAttemptPowerUpsHandler,
};


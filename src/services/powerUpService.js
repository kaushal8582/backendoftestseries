const PowerUp = require('../models/PowerUp');
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const { spendCoins } = require('./gamificationService');

/**
 * Initialize default power-ups
 */
const initializePowerUps = async () => {
  const defaultPowerUps = [
    {
      powerUpId: 'extra_time',
      name: 'Extra Time',
      description: 'Add 5 minutes to your test time',
      icon: 'time',
      type: 'extra_time',
      cost: 30,
      effectValue: 5, // 5 minutes
      usableDuringTest: true,
      usableBeforeTest: false,
    },
    {
      powerUpId: 'hint',
      name: 'Hint',
      description: 'Get a hint for the current question',
      icon: 'bulb',
      type: 'hint',
      cost: 20,
      effectValue: 1,
      usableDuringTest: true,
      usableBeforeTest: false,
    },
    {
      powerUpId: 'skip_question',
      name: 'Skip Question',
      description: 'Skip the current question',
      icon: 'arrow-forward',
      type: 'skip_question',
      cost: 50,
      effectValue: 1,
      usableDuringTest: true,
      usableBeforeTest: false,
    },
    {
      powerUpId: 'fifty_fifty',
      name: '50-50',
      description: 'Remove 2 wrong options',
      icon: 'remove-circle',
      type: 'fifty_fifty',
      cost: 40,
      effectValue: 2,
      usableDuringTest: true,
      usableBeforeTest: false,
    },
    {
      powerUpId: 'double_xp',
      name: 'Double XP',
      description: 'Earn 2x XP for this test',
      icon: 'flash',
      type: 'double_xp',
      cost: 100,
      effectValue: 2, // 2x multiplier
      usableDuringTest: false,
      usableBeforeTest: true,
    },
  ];

  for (const powerUp of defaultPowerUps) {
    await PowerUp.findOneAndUpdate(
      { powerUpId: powerUp.powerUpId },
      powerUp,
      { upsert: true, new: true }
    );
  }

  console.log('✅ Default power-ups initialized');
};

/**
 * Get all available power-ups
 * @returns {Promise<Array>} - Array of power-ups
 */
const getAvailablePowerUps = async () => {
  return await PowerUp.find({ isActive: true }).sort({ cost: 1 });
};

/**
 * Use a power-up during test
 * @param {string} userId - User ID
 * @param {string} attemptId - Test attempt ID
 * @param {string} powerUpId - Power-up ID
 * @param {Object} context - Additional context (questionId, etc.)
 * @returns {Promise<Object>} - Power-up effect
 */
const usePowerUp = async (userId, attemptId, powerUpId, context = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const powerUp = await PowerUp.findOne({ powerUpId, isActive: true });
  if (!powerUp) {
    throw new AppError('Power-up not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user has enough coins
  const userCoins = user.gamification?.coins || 0;
  if (userCoins < powerUp.cost) {
    throw new AppError('Insufficient coins', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if attempt exists and is in progress
  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    throw new AppError('Test attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError('Test is not in progress', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if power-up is already used in this attempt
  const powerUpsUsed = attempt.powerUpsUsed || [];
  if (powerUpsUsed.some((pu) => pu.powerUpId === powerUpId)) {
    throw new AppError('Power-up already used in this test', HTTP_STATUS.BAD_REQUEST);
  }

  // Spend coins
  await spendCoins(userId, powerUp.cost);

  // Record power-up usage
  if (!attempt.powerUpsUsed) {
    attempt.powerUpsUsed = [];
  }
  attempt.powerUpsUsed.push({
    powerUpId: powerUp.powerUpId,
    type: powerUp.type,
    usedAt: new Date(),
    cost: powerUp.cost,
    context,
  });

  await attempt.save();

  // Return effect based on power-up type
  const effect = {
    type: powerUp.type,
    powerUpId: powerUp.powerUpId,
    effectValue: powerUp.effectValue,
  };

  switch (powerUp.type) {
    case 'extra_time':
      effect.additionalTime = powerUp.effectValue * 60; // Convert to seconds
      break;
    case 'hint':
      effect.hint = true;
      break;
    case 'skip_question':
      effect.skip = true;
      break;
    case 'fifty_fifty':
      effect.removeOptions = 2;
      break;
  }

  return effect;
};

/**
 * Activate a boost before test
 * @param {string} userId - User ID
 * @param {string} powerUpId - Power-up ID (boost type)
 * @returns {Promise<Object>} - Boost activation
 */
const activateBoost = async (userId, powerUpId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const powerUp = await PowerUp.findOne({ powerUpId, isActive: true });
  if (!powerUp) {
    throw new AppError('Power-up not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!powerUp.usableBeforeTest) {
    throw new AppError('This power-up cannot be used as a boost', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user has enough coins
  const userCoins = user.gamification?.coins || 0;
  if (userCoins < powerUp.cost) {
    throw new AppError('Insufficient coins', HTTP_STATUS.BAD_REQUEST);
  }

  // Spend coins
  await spendCoins(userId, powerUp.cost);

  return {
    powerUpId: powerUp.powerUpId,
    type: powerUp.type,
    effectValue: powerUp.effectValue,
    activated: true,
  };
};

/**
 * Get power-ups used in a test attempt
 * @param {string} attemptId - Test attempt ID
 * @returns {Promise<Array>} - Array of used power-ups
 */
const getAttemptPowerUps = async (attemptId) => {
  const attempt = await TestAttempt.findById(attemptId).select('powerUpsUsed');
  if (!attempt) {
    return [];
  }

  return attempt.powerUpsUsed || [];
};

module.exports = {
  initializePowerUps,
  getAvailablePowerUps,
  usePowerUp,
  activateBoost,
  getAttemptPowerUps,
};


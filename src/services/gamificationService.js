const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Calculate XP for a test attempt
 * Reduced by 50% with max 100 XP and min 10 XP per test
 * @param {Object} attempt - Test attempt object
 * @param {Object} user - User object
 * @returns {Object} - { xp, bonuses }
 */
const calculateXP = (attempt, user) => {
  let xp = 50; // Base XP (reduced from 100 to 50)
  const bonuses = {
    score: 0,
    accuracy: 0,
    streak: 0,
    speed: 0,
    perfect: 0,
    firstAttempt: 0,
  };

  // Score bonus (0-50 XP, reduced from 0-200)
  const scorePercentage = attempt.totalMarks > 0 
    ? (attempt.score / attempt.totalMarks) * 100 
    : 0;
  bonuses.score = Math.floor(scorePercentage * 0.5); // Reduced from * 2 to * 0.5
  xp += bonuses.score;

  // Accuracy bonus (0-37 XP, reduced from 0-150)
  bonuses.accuracy = Math.floor(attempt.accuracy * 0.375); // Reduced from * 1.5 to * 0.375
  xp += bonuses.accuracy;

  // Streak bonus (+12.5 XP per day, max +125, reduced from +50 per day, max +500)
  const streak = user.studyStreak?.currentStreak || 0;
  bonuses.streak = Math.min(Math.floor(streak * 12.5), 125); // Reduced from streak * 50, max 500
  xp += bonuses.streak;

  // Speed bonus (not implemented yet)
  bonuses.speed = 0;

  // Perfect score bonus (+50 XP, reduced from +200)
  if (scorePercentage === 100) {
    bonuses.perfect = 50; // Reduced from 200
    xp += bonuses.perfect;
  }

  // First attempt bonus (+25 XP, reduced from +100)
  // Check if this is user's first test
  if (user.totalTestsCompleted === 0) {
    bonuses.firstAttempt = 25; // Reduced from 100
    xp += bonuses.firstAttempt;
  }

  // Cap XP: Maximum 100, Minimum 10
  xp = Math.max(10, Math.min(100, Math.floor(xp)));

  return { xp, bonuses };
};

/**
 * Calculate coins for a test attempt
 * Reduced by 50%
 * @param {Object} attempt - Test attempt object
 * @param {Object} user - User object
 * @returns {Object} - { coins, bonuses }
 */
const calculateCoins = (attempt, user) => {
  let coins = 25; // Base coins (reduced from 50 to 25)
  const bonuses = {
    score: 0,
    streak: 0,
    level: 0,
    perfect: 0,
  };

  // Score bonus (0-50 coins, reduced from 0-100)
  const scorePercentage = attempt.totalMarks > 0 
    ? (attempt.score / attempt.totalMarks) * 100 
    : 0;
  bonuses.score = Math.floor(scorePercentage * 0.5); // Reduced from scorePercentage to scorePercentage * 0.5
  coins += bonuses.score;

  // Streak bonus (+5 coins per streak day, reduced from +10)
  const streak = user.studyStreak?.currentStreak || 0;
  bonuses.streak = Math.floor(streak * 5); // Reduced from streak * 10
  coins += bonuses.streak;

  // Level bonus (+2.5 coins per level, rounded to +3, reduced from +5)
  const level = user.gamification?.level || 1;
  bonuses.level = Math.floor(level * 2.5); // Reduced from level * 5
  coins += bonuses.level;

  // Perfect score bonus (+50 coins, reduced from +100)
  if (scorePercentage === 100) {
    bonuses.perfect = 50; // Reduced from 100
    coins += bonuses.perfect;
  }

  return { coins: Math.floor(coins), bonuses };
};

/**
 * Calculate level from total XP
 * @param {number} totalXP - Total XP
 * @returns {Object} - { level, xpForCurrentLevel, xpForNextLevel, progress }
 */
const calculateLevel = (totalXP) => {
  // Level formula: Level = floor(sqrt(totalXP / 100)) + 1
  // Level 1: 0-100 XP
  // Level 2: 100-400 XP
  // Level 3: 400-900 XP
  // Level 10: 9000-10000 XP

  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const progress = xpNeededForNextLevel > 0 
    ? Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100) 
    : 100;

  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    xpNeededForNextLevel,
    xpInCurrentLevel,
    progress: Math.min(progress, 100),
  };
};

/**
 * Award XP and coins to user after test completion
 * @param {string} userId - User ID
 * @param {Object} attempt - Test attempt object
 * @returns {Promise<Object>} - { xp, coins, levelUp, newLevel }
 */
const awardTestRewards = async (userId, attempt) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Calculate XP and coins
  const { xp: xpEarned, bonuses: xpBonuses } = calculateXP(attempt, user);
  const { coins: coinsEarned, bonuses: coinBonuses } = calculateCoins(attempt, user);

  // Get current gamification data
  const currentXP = user.gamification?.totalXP || 0;
  const currentLevel = user.gamification?.level || 1;
  const currentCoins = user.gamification?.coins || 100;

  // Calculate new totals
  const newTotalXP = currentXP + xpEarned;
  const levelInfo = calculateLevel(newTotalXP);
  const newLevel = levelInfo.level;
  const levelUp = newLevel > currentLevel;

  // Update user
  await User.findByIdAndUpdate(userId, {
    $inc: {
      'gamification.totalXP': xpEarned,
      'gamification.xp': xpEarned,
      'gamification.coins': coinsEarned,
      'gamification.totalCoinsEarned': coinsEarned,
    },
    $set: {
      'gamification.level': newLevel,
      'gamification.levelProgress': levelInfo.progress,
    },
  });

  return {
    xp: xpEarned,
    coins: coinsEarned,
    levelUp,
    newLevel,
    currentLevel,
    xpBonuses,
    coinBonuses,
    levelInfo,
  };
};

/**
 * Spend coins
 * @param {string} userId - User ID
 * @param {number} amount - Amount to spend
 * @returns {Promise<Object>} - Updated user gamification data
 */
const spendCoins = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const currentCoins = user.gamification?.coins || 0;
  if (currentCoins < amount) {
    throw new AppError('Insufficient coins', HTTP_STATUS.BAD_REQUEST);
  }

  await User.findByIdAndUpdate(userId, {
    $inc: {
      'gamification.coins': -amount,
      'gamification.totalCoinsSpent': amount,
    },
  });

  return {
    coins: currentCoins - amount,
    spent: amount,
  };
};

/**
 * Get user gamification stats
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Gamification stats
 */
const getGamificationStats = async (userId) => {
  const user = await User.findById(userId).select('gamification studyStreak totalTestsCompleted');
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const gamification = user.gamification || {
    xp: 0,
    level: 1,
    totalXP: 0,
    levelProgress: 0,
    coins: 100,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
  };

  const levelInfo = calculateLevel(gamification.totalXP);

  return {
    ...gamification,
    levelInfo,
    streak: user.studyStreak?.currentStreak || 0,
    totalTests: user.totalTestsCompleted || 0,
  };
};

module.exports = {
  calculateXP,
  calculateCoins,
  calculateLevel,
  awardTestRewards,
  spendCoins,
  getGamificationStats,
};


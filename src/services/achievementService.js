const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const { awardTestRewards } = require('./gamificationService');

/**
 * Initialize default achievements in database
 */
const initializeAchievements = async () => {
  const defaultAchievements = [
    // Test Completion
    {
      achievementId: 'first_test',
      name: 'First Steps',
      description: 'Complete your first test',
      icon: 'rocket',
      category: 'test_completion',
      target: 1,
      reward: { xp: 25, coins: 25 },
      type: 'one_time',
    },
    {
      achievementId: 'ten_tests',
      name: 'On Fire',
      description: 'Complete 10 tests',
      icon: 'flame',
      category: 'test_completion',
      target: 10,
      reward: { xp: 50, coins: 50 },
      type: 'progressive',
    },
    {
      achievementId: 'fifty_tests',
      name: 'Dedicated',
      description: 'Complete 50 tests',
      icon: 'trophy',
      category: 'test_completion',
      target: 50,
      reward: { xp: 250, coins: 250 },
      type: 'progressive',
    },
    {
      achievementId: 'hundred_tests',
      name: 'Master',
      description: 'Complete 100 tests',
      icon: 'medal',
      category: 'test_completion',
      target: 100,
      reward: { xp: 500, coins: 500 },
      type: 'progressive',
    },
    // Performance
    {
      achievementId: 'perfect_score',
      name: 'Perfect Score',
      description: 'Score 100% in a test',
      icon: 'star',
      category: 'performance',
      target: 1,
      reward: { xp: 100, coins: 100 },
      type: 'one_time',
    },
    {
      achievementId: 'accuracy_master',
      name: 'Accuracy Master',
      description: 'Maintain 90%+ accuracy in 10 tests',
      icon: 'target',
      category: 'performance',
      target: 10,
      reward: { xp: 75, coins: 75 },
      type: 'progressive',
    },
    // Streaks
    {
      achievementId: 'week_warrior',
      name: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      icon: 'calendar',
      category: 'streak',
      target: 7,
      reward: { xp: 75, coins: 75 },
      type: 'one_time',
    },
    {
      achievementId: 'month_master',
      name: 'Month Master',
      description: 'Maintain a 30-day study streak',
      icon: 'calendar-number',
      category: 'streak',
      target: 30,
      reward: { xp: 250, coins: 250 },
      type: 'one_time',
    },
  ];

  for (const achievement of defaultAchievements) {
    await Achievement.findOneAndUpdate(
      { achievementId: achievement.achievementId },
      achievement,
      { upsert: true, new: true }
    );
  }

  console.log('✅ Default achievements initialized');
};

/**
 * Check and unlock achievements for a user
 * @param {string} userId - User ID
 * @param {string} eventType - Event type (test_completed, streak_updated, etc.)
 * @param {Object} eventData - Event data
 * @returns {Promise<Array>} - Array of newly unlocked achievements
 */
const checkAchievements = async (userId, eventType, eventData = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    return [];
  }

  const newlyUnlocked = [];

  // Get all active achievements
  const achievements = await Achievement.find({ isActive: true });

  for (const achievement of achievements) {
    // Check if already unlocked
    const userAchievement = await UserAchievement.findOne({
      userId,
      achievementId: achievement.achievementId,
    });

    if (userAchievement && userAchievement.isUnlocked) {
      continue; // Already unlocked
    }

    let shouldUnlock = false;
    let progress = 0;

    // Check achievement conditions based on type
    switch (achievement.achievementId) {
      case 'first_test':
        if (eventType === 'test_completed' && user.totalTestsCompleted === 1) {
          shouldUnlock = true;
        }
        break;

      case 'ten_tests':
      case 'fifty_tests':
      case 'hundred_tests':
        if (eventType === 'test_completed') {
          progress = user.totalTestsCompleted || 0;
          if (progress >= achievement.target) {
            shouldUnlock = true;
          }
        }
        break;

      case 'perfect_score':
        if (eventType === 'test_completed' && eventData.scorePercentage === 100) {
          shouldUnlock = true;
        }
        break;

      case 'accuracy_master':
        if (eventType === 'test_completed') {
          // Check last 10 tests for 90%+ accuracy
          const recentAttempts = await TestAttempt.find({
            userId,
            status: 'completed',
          })
            .sort({ submittedAt: -1 })
            .limit(10);

          if (recentAttempts.length >= 10) {
            const allAbove90 = recentAttempts.every((attempt) => attempt.accuracy >= 90);
            if (allAbove90) {
              shouldUnlock = true;
            }
          }
          progress = recentAttempts.filter((a) => a.accuracy >= 90).length;
        }
        break;

      case 'week_warrior':
        if (eventType === 'streak_updated' && user.studyStreak?.currentStreak >= 7) {
          shouldUnlock = true;
        }
        break;

      case 'month_master':
        if (eventType === 'streak_updated' && user.studyStreak?.currentStreak >= 30) {
          shouldUnlock = true;
        }
        break;
    }

    if (shouldUnlock) {
      // Unlock achievement
      await UserAchievement.findOneAndUpdate(
        { userId, achievementId: achievement.achievementId },
        {
          userId,
          achievementId: achievement.achievementId,
          unlockedAt: new Date(),
          progress: achievement.target,
          isUnlocked: true,
          rewardClaimed: false,
        },
        { upsert: true, new: true }
      );

      // Award rewards
      if (achievement.reward.xp > 0 || achievement.reward.coins > 0) {
        // Update user XP and coins directly
        await User.findByIdAndUpdate(userId, {
          $inc: {
            'gamification.totalXP': achievement.reward.xp,
            'gamification.xp': achievement.reward.xp,
            'gamification.coins': achievement.reward.coins,
            'gamification.totalCoinsEarned': achievement.reward.coins,
          },
        });
      }

      newlyUnlocked.push({
        achievementId: achievement.achievementId,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        reward: achievement.reward,
      });
    } else if (progress > 0 && achievement.type === 'progressive') {
      // Update progress for progressive achievements
      await UserAchievement.findOneAndUpdate(
        { userId, achievementId: achievement.achievementId },
        {
          userId,
          achievementId: achievement.achievementId,
          progress,
        },
        { upsert: true, new: true }
      );
    }
  }

  return newlyUnlocked;
};

/**
 * Get user achievements
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User achievements with progress
 */
const getUserAchievements = async (userId) => {
  const userAchievements = await UserAchievement.find({ userId }).lean();
  const achievements = await Achievement.find({ isActive: true }).lean();

  const achievementMap = new Map();
  achievements.forEach((a) => {
    achievementMap.set(a.achievementId, a);
  });

  const result = {
    unlocked: [],
    inProgress: [],
    locked: [],
  };

  achievements.forEach((achievement) => {
    const userAchievement = userAchievements.find(
      (ua) => ua.achievementId === achievement.achievementId
    );

    const achievementData = {
      ...achievement,
      progress: userAchievement?.progress || 0,
      isUnlocked: userAchievement?.isUnlocked || false,
      unlockedAt: userAchievement?.unlockedAt || null,
      progressPercentage: achievement.target > 0
        ? Math.floor((userAchievement?.progress || 0) / achievement.target * 100)
        : 0,
    };

    if (achievementData.isUnlocked) {
      result.unlocked.push(achievementData);
    } else if (achievementData.progress > 0) {
      result.inProgress.push(achievementData);
    } else {
      result.locked.push(achievementData);
    }
  });

  return result;
};

module.exports = {
  initializeAchievements,
  checkAchievements,
  getUserAchievements,
};


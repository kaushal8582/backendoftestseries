const CategoryMastery = require('../models/CategoryMastery');
const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Exam = require('../models/Exam');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Calculate mastery level based on tests completed and average score
 * @param {number} testsCompleted - Number of tests completed
 * @param {number} averageScore - Average score percentage
 * @returns {string} - Mastery level
 */
const calculateMasteryLevel = (testsCompleted, averageScore) => {
  if (testsCompleted >= 51 && averageScore >= 86) {
    return 'platinum';
  } else if (testsCompleted >= 26 && averageScore >= 71) {
    return 'gold';
  } else if (testsCompleted >= 11 && averageScore >= 51) {
    return 'silver';
  }
  return 'bronze';
};

/**
 * Calculate progress percentage (0-100)
 * @param {number} testsCompleted - Number of tests completed
 * @param {string} currentLevel - Current mastery level
 * @returns {number} - Progress percentage
 */
const calculateProgress = (testsCompleted, currentLevel) => {
  const levelThresholds = {
    bronze: { min: 0, max: 10 },
    silver: { min: 11, max: 25 },
    gold: { min: 26, max: 50 },
    platinum: { min: 51, max: 100 },
  };

  const threshold = levelThresholds[currentLevel] || levelThresholds.bronze;
  const progress = Math.min(
    ((testsCompleted - threshold.min) / (threshold.max - threshold.min + 1)) * 100,
    100
  );

  return Math.max(0, Math.floor(progress));
};

/**
 * Update category mastery after test completion
 * @param {string} userId - User ID
 * @param {string} attemptId - Test attempt ID
 * @returns {Promise<Object>} - Updated mastery
 */
const updateCategoryMastery = async (userId, attemptId) => {
  const attempt = await TestAttempt.findById(attemptId)
    .populate('testId')
    .populate({
      path: 'testId',
      populate: { path: 'examId', populate: { path: 'category' } },
    });

  if (!attempt || attempt.status !== 'completed') {
    return null;
  }

  // Get category from test
  const test = attempt.testId;
  if (!test || !test.examId || !test.examId.category) {
    return null;
  }

  const categoryId = test.examId.category._id || test.examId.category;

  // Get or create mastery
  let mastery = await CategoryMastery.findOne({ userId, categoryId });

  if (!mastery) {
    mastery = await CategoryMastery.create({
      userId,
      categoryId,
      testsCompleted: 0,
      averageScore: 0,
      totalScore: 0,
      totalMarks: 0,
      masteryLevel: 'bronze',
      unlockedSkills: [],
      progress: 0,
    });
  }

  // Update stats
  mastery.testsCompleted += 1;
  mastery.totalScore += attempt.score;
  mastery.totalMarks += attempt.totalMarks;
  mastery.averageScore = mastery.totalMarks > 0
    ? (mastery.totalScore / mastery.totalMarks) * 100
    : 0;
  mastery.lastTestDate = new Date();

  // Calculate new mastery level
  const newLevel = calculateMasteryLevel(mastery.testsCompleted, mastery.averageScore);
  const levelUp = newLevel !== mastery.masteryLevel;
  mastery.masteryLevel = newLevel;

  // Calculate progress
  mastery.progress = calculateProgress(mastery.testsCompleted, mastery.masteryLevel);

  await mastery.save();

  return {
    mastery,
    levelUp,
    newLevel,
    previousLevel: mastery.masteryLevel,
  };
};

/**
 * Get user's mastery for a category
 * @param {string} userId - User ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} - Mastery data
 */
const getCategoryMastery = async (userId, categoryId) => {
  let mastery = await CategoryMastery.findOne({ userId, categoryId })
    .populate('categoryId', 'name icon');

  if (!mastery) {
    // Return default mastery
    return {
      userId,
      categoryId,
      testsCompleted: 0,
      averageScore: 0,
      masteryLevel: 'bronze',
      progress: 0,
      unlockedSkills: [],
    };
  }

  return mastery;
};

/**
 * Get all category masteries for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of masteries
 */
const getUserMasteries = async (userId) => {
  const masteries = await CategoryMastery.find({ userId })
    .populate('categoryId', 'name icon')
    .sort({ masteryLevel: -1, testsCompleted: -1 });

  return masteries;
};

/**
 * Get skill tree for a category
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} - Skill tree structure
 */
const getCategorySkillTree = async (categoryId) => {
  // Define skill tree structure
  // This can be customized per category
  const skillTree = {
    categoryId,
    skills: [
      {
        skillId: 'basic_understanding',
        name: 'Basic Understanding',
        description: 'Complete 5 tests with 60%+ score',
        requirement: { tests: 5, score: 60 },
        unlocksAt: 'bronze',
        rewards: { xp: 25, coins: 25 },
      },
      {
        skillId: 'intermediate_mastery',
        name: 'Intermediate Mastery',
        description: 'Complete 15 tests with 70%+ average',
        requirement: { tests: 15, score: 70 },
        unlocksAt: 'silver',
        rewards: { xp: 50, coins: 50 },
      },
      {
        skillId: 'advanced_expertise',
        name: 'Advanced Expertise',
        description: 'Complete 30 tests with 80%+ average',
        requirement: { tests: 30, score: 80 },
        unlocksAt: 'gold',
        rewards: { xp: 100, coins: 100 },
      },
      {
        skillId: 'master_level',
        name: 'Master Level',
        description: 'Complete 50 tests with 90%+ average',
        requirement: { tests: 50, score: 90 },
        unlocksAt: 'platinum',
        rewards: { xp: 250, coins: 250 },
      },
    ],
  };

  return skillTree;
};

/**
 * Check and unlock skills for a category
 * @param {string} userId - User ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Array>} - Newly unlocked skills
 */
const checkAndUnlockSkills = async (userId, categoryId) => {
  const mastery = await CategoryMastery.findOne({ userId, categoryId });
  if (!mastery) {
    return [];
  }

  const skillTree = await getCategorySkillTree(categoryId);
  const newlyUnlocked = [];

  for (const skill of skillTree.skills) {
    // Check if already unlocked
    if (mastery.unlockedSkills.includes(skill.skillId)) {
      continue;
    }

    // Check if mastery level is sufficient
    const levelOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const requiredLevel = levelOrder[skill.unlocksAt] || 1;
    const currentLevel = levelOrder[mastery.masteryLevel] || 0;

    if (currentLevel < requiredLevel) {
      continue;
    }

    // Check if requirements are met
    const meetsTests = mastery.testsCompleted >= skill.requirement.tests;
    const meetsScore = mastery.averageScore >= skill.requirement.score;

    if (meetsTests && meetsScore) {
      // Unlock skill
      mastery.unlockedSkills.push(skill.skillId);
      newlyUnlocked.push(skill);

      // Award rewards
      if (skill.rewards) {
        await User.findByIdAndUpdate(userId, {
          $inc: {
            'gamification.totalXP': skill.rewards.xp || 0,
            'gamification.xp': skill.rewards.xp || 0,
            'gamification.coins': skill.rewards.coins || 0,
            'gamification.totalCoinsEarned': skill.rewards.coins || 0,
          },
        });
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    await mastery.save();
  }

  return newlyUnlocked;
};

module.exports = {
  calculateMasteryLevel,
  calculateProgress,
  updateCategoryMastery,
  getCategoryMastery,
  getUserMasteries,
  getCategorySkillTree,
  checkAndUnlockSkills,
};


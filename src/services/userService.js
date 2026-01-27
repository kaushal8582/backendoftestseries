const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const DailyChallenge = require('../models/DailyChallenge');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User profile
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated user
 */
const updateProfile = async (userId, updateData) => {
  const allowedFields = ['name', 'phone', 'profilePicture', 'examPreference'];
  const updateFields = {};

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateFields[key] = updateData[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select('-password').populate('examPreference.examIds examPreference.primaryExamId');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

/**
 * Get user test attempts
 * @param {string} userId - User ID
 * @param {Object} queryParams - Query parameters (page, limit, status)
 * @returns {Promise<Object>} - Test attempts with pagination
 */
const getUserTestAttempts = async (userId, queryParams = {}) => {
  const { page = 1, limit = 10, status, attemptType = 'normal' } = queryParams;
  const skip = (page - 1) * limit;

  const query = { userId };
  if (status) {
    query.status = status;
  }

  // Filter by attempt type
  if (attemptType === 'normal') {
    query.quizRoomId = null; // Only normal attempts
  } else if (attemptType === 'quiz') {
    query.quizRoomId = { $ne: null }; // Only quiz attempts
  }
  // 'all' shows both (no filter on quizRoomId)

  const attempts = await TestAttempt.find(query)
    .populate({
      path: 'testId',
      select: 'testName totalMarks duration',
    })
    .populate({
      path: 'examId',
      select: 'title category',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await TestAttempt.countDocuments(query);

  return {
    attempts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user performance summary
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Performance summary
 */
const getUserPerformanceSummary = async (userId) => {
  const user = await User.findById(userId).select('performanceSummary totalTestsAttempted totalTestsCompleted averageScore');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Get additional stats from test attempts
  // Count ALL completed attempts (including quiz room and daily challenge attempts)
  // This ensures consistency with leaderboard calculations
  // Note: This includes both normal and quiz attempts for overall performance metrics
  // To get separate stats, filter by quizRoomId: null (normal) or { $ne: null } (quiz)
  const completedAttempts = await TestAttempt.find({
    userId,
    status: 'completed',
  });

  // Calculate totals with safe defaults
  const totalScore = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0)
    : 0;
  const totalCorrect = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.correctAnswers || 0), 0)
    : 0;
  const totalWrong = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.wrongAnswers || 0), 0)
    : 0;
  const totalSkipped = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, attempt) => sum + (attempt.skippedAnswers || 0), 0)
    : 0;
  
  // Calculate totalQuestions first before using it in the return object
  const totalQuestions = totalCorrect + totalWrong + totalSkipped;
  const accuracy = totalQuestions > 0 
    ? parseFloat(((totalCorrect / totalQuestions) * 100).toFixed(2))
    : 0;

  // Always use actual count from TestAttempt documents for consistency
  // This ensures the count matches what's shown in the leaderboard
  const actualTestsCompleted = completedAttempts.length;
  const averageScore = actualTestsCompleted > 0 
    ? parseFloat((totalScore / actualTestsCompleted).toFixed(2))
    : 0;

  return {
    totalTestsAttempted: user.totalTestsAttempted || 0,
    totalTestsCompleted: actualTestsCompleted, // Always use actual count from TestAttempt documents
    averageScore: averageScore || user.averageScore || 0,
    totalScore,
    totalCorrect,
    totalWrong,
    totalSkipped,
    totalQuestions,
    accuracy,
  };
};

/**
 * Get user study streak and daily goal progress
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Streak data with daily progress
 */
const getUserStudyStreak = async (userId) => {
  const user = await User.findById(userId).select('studyStreak');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Initialize streak if not exists
  if (!user.studyStreak) {
    user.studyStreak = {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      dailyGoal: 5,
    };
    await user.save();
  }

  // Get today's completed tests count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttempts = await TestAttempt.countDocuments({
    userId,
    status: 'completed',
    submittedAt: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  return {
    currentStreak: user.studyStreak.currentStreak || 0,
    longestStreak: user.studyStreak.longestStreak || 0,
    dailyGoal: user.studyStreak.dailyGoal || 5,
    completedToday: todayAttempts,
    lastActivityDate: user.studyStreak.lastActivityDate || null,
  };
};

/**
 * Get all users (Admin only)
 * @param {Object} queryParams - Query parameters (page, limit, search, role, isActive)
 * @returns {Promise<Object>} - Users with pagination
 */
const getAllUsers = async (queryParams = {}) => {
  const { page = 1, limit = 20, search, role, isActive } = queryParams;
  const skip = (page - 1) * limit;

  const query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get transaction history for XP and Coins
 * @param {string} userId - User ID
 * @param {Object} queryParams - Query parameters (type: 'xp' | 'coins' | 'all', page, limit)
 * @returns {Promise<Object>} - Transaction history with pagination
 */
const getTransactionHistory = async (userId, queryParams = {}) => {
  const { type = 'all', page = 1, limit = 100 } = queryParams;
  const skip = (page - 1) * limit;

  const user = await User.findById(userId).select('gamification createdAt');
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  const transactions = [];

  // Get ALL test attempts with rewards (no limit for accurate totals)
  const allTestAttempts = await TestAttempt.find({
    userId,
    status: 'completed',
    $or: [
      { 'gamificationRewards.xp': { $gt: 0 } },
      { 'gamificationRewards.coins': { $gt: 0 } },
    ],
  })
    .populate('testId', 'testName')
    .populate('examId', 'title')
    .populate('dailyChallengeId', 'title challengeType')
    .sort({ submittedAt: -1 })
    .lean();

  // Get paginated attempts for display
  const testAttempts = allTestAttempts.slice(skip, skip + parseInt(limit));

  for (const attempt of testAttempts) {
    const rewards = attempt.gamificationRewards || {};
    
    // XP Transaction
    if ((type === 'all' || type === 'xp') && rewards.xp > 0) {
      const xpBonuses = rewards.xpBonuses || {};
      transactions.push({
        type: 'xp',
        amount: rewards.xp,
        source: 'test_completion',
        sourceId: attempt._id,
        sourceName: attempt.testId?.testName || 'Test',
        examName: attempt.examId?.title || '',
        isDailyChallenge: !!attempt.dailyChallengeId,
        dailyChallengeName: attempt.dailyChallengeId?.title || null,
        bonuses: {
          base: 50,
          score: xpBonuses.score || 0,
          accuracy: xpBonuses.accuracy || 0,
          streak: xpBonuses.streak || 0,
          speed: xpBonuses.speed || 0,
          perfect: xpBonuses.perfect || 0,
          firstAttempt: xpBonuses.firstAttempt || 0,
        },
        timestamp: attempt.submittedAt || attempt.createdAt,
        testScore: attempt.score,
        testAccuracy: attempt.accuracy,
      });
    }

    // Coins Transaction
    if ((type === 'all' || type === 'coins') && rewards.coins > 0) {
      const coinBonuses = rewards.coinBonuses || {};
      transactions.push({
        type: 'coins',
        amount: rewards.coins,
        source: 'test_completion',
        sourceId: attempt._id,
        sourceName: attempt.testId?.testName || 'Test',
        examName: attempt.examId?.title || '',
        isDailyChallenge: !!attempt.dailyChallengeId,
        dailyChallengeName: attempt.dailyChallengeId?.title || null,
        bonuses: {
          base: 25,
          score: coinBonuses.score || 0,
          streak: coinBonuses.streak || 0,
          level: coinBonuses.level || 0,
          perfect: coinBonuses.perfect || 0,
        },
        timestamp: attempt.submittedAt || attempt.createdAt,
        testScore: attempt.score,
        testAccuracy: attempt.accuracy,
      });
    }

    // Daily Challenge Rewards (if any)
    if (attempt.dailyChallengeId && attempt.gamificationRewards?.completedChallenges) {
      const challenges = attempt.gamificationRewards.completedChallenges || [];
      for (const challenge of challenges) {
        if ((type === 'all' || type === 'xp') && challenge.reward?.xp > 0) {
          transactions.push({
            type: 'xp',
            amount: challenge.reward.xp,
            source: 'daily_challenge',
            sourceId: challenge.challengeId,
            sourceName: challenge.title,
            examName: '',
            isDailyChallenge: true,
            dailyChallengeName: challenge.title,
            bonuses: {},
            timestamp: attempt.submittedAt || attempt.createdAt,
          });
        }
        if ((type === 'all' || type === 'coins') && challenge.reward?.coins > 0) {
          transactions.push({
            type: 'coins',
            amount: challenge.reward.coins,
            source: 'daily_challenge',
            sourceId: challenge.challengeId,
            sourceName: challenge.title,
            examName: '',
            isDailyChallenge: true,
            dailyChallengeName: challenge.title,
            bonuses: {},
            timestamp: attempt.submittedAt || attempt.createdAt,
          });
        }
      }
    }
  }

  // Calculate totals from ALL attempts (not just paginated)
  let totalXP = 0;
  let totalCoins = 0;

  for (const attempt of allTestAttempts) {
    const rewards = attempt.gamificationRewards || {};
    if (rewards.xp > 0) {
      totalXP += rewards.xp;
    }
    if (rewards.coins > 0) {
      totalCoins += rewards.coins;
    }

    // Daily Challenge Rewards
    if (attempt.dailyChallengeId && attempt.gamificationRewards?.completedChallenges) {
      const challenges = attempt.gamificationRewards.completedChallenges || [];
      for (const challenge of challenges) {
        if (challenge.reward?.xp > 0) {
          totalXP += challenge.reward.xp;
        }
        if (challenge.reward?.coins > 0) {
          totalCoins += challenge.reward.coins;
        }
      }
    }
  }

  // Add initial coins (100 coins given on signup)
  const initialCoins = 100;
  totalCoins += initialCoins;

  // Add initial coins transaction if showing coins
  if ((type === 'all' || type === 'coins') && user.createdAt) {
    transactions.push({
      type: 'coins',
      amount: initialCoins,
      source: 'account_creation',
      sourceId: user._id,
      sourceName: 'Welcome Bonus',
      examName: '',
      isDailyChallenge: false,
      dailyChallengeName: null,
      bonuses: {},
      timestamp: user.createdAt,
    });
  }

  // Sort by timestamp (newest first)
  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Get user's actual totals from database
  const userGamification = user.gamification || {};
  const actualTotalXP = userGamification.totalXP || 0;
  const actualTotalCoinsEarned = userGamification.totalCoinsEarned || 0;
  const currentCoins = userGamification.coins || 0;

  return {
    transactions,
    totals: {
      totalXP: actualTotalXP,
      totalCoinsEarned: actualTotalCoinsEarned,
      currentCoins: currentCoins,
      calculatedXP: totalXP,
      calculatedCoins: totalCoins,
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: allTestAttempts.length,
      pages: Math.ceil(allTestAttempts.length / limit),
    },
  };
};

/**
 * Get user by ID (Admin only)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User with all tracking info
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

/**
 * Update user role (Admin only)
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Promise<Object>} - Updated user
 */
const updateUserRole = async (userId, role) => {
  const { USER_ROLES } = require('../config/constants');
  
  if (!Object.values(USER_ROLES).includes(role)) {
    throw new AppError('Invalid role', HTTP_STATUS.BAD_REQUEST);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

/**
 * Update user active status (Admin only)
 * @param {string} userId - User ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<Object>} - Updated user
 */
const updateUserStatus = async (userId, isActive) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

/**
 * Delete user (Admin only)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  getUserTestAttempts,
  getUserPerformanceSummary,
  getUserStudyStreak,
  getTransactionHistory,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};


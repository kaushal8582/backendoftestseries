const mongoose = require('mongoose');
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get global leaderboard
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Leaderboard data
 */
const getGlobalLeaderboard = async (options = {}) => {
  const { limit = 50, offset = 0 } = options;

  // Get users sorted by total XP
  const users = await User.find({
    isActive: true,
    'gamification.totalXP': { $exists: true },
  })
    .select('name email gamification totalTestsCompleted studyStreak')
    .sort({ 'gamification.totalXP': -1, 'gamification.level': -1 })
    .limit(limit)
    .skip(offset)
    .lean();

  // Get actual test completion counts from TestAttempt for accuracy
  // This ensures consistency with profile/performance screens
  const userIds = users.map((u) => u._id);
  const testCounts = await TestAttempt.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$userId',
        totalTests: { $sum: 1 },
      },
    },
  ]);

  // Create a map of userId to test count
  const testCountMap = new Map();
  testCounts.forEach((item) => {
    testCountMap.set(item._id.toString(), item.totalTests);
  });

  // Calculate ranks and format
  const leaderboard = users.map((user, index) => ({
    rank: offset + index + 1,
    userId: user._id,
    name: user.name,
    email: user.email,
    level: user.gamification?.level || 1,
    totalXP: user.gamification?.totalXP || 0,
    coins: user.gamification?.coins || 0,
    totalTests: testCountMap.get(user._id.toString()) || 0, // Use actual count from TestAttempt
    testsCompleted: testCountMap.get(user._id.toString()) || 0, // Also include testsCompleted for frontend compatibility
    streak: user.studyStreak?.currentStreak || 0,
    avatar: user.gamification?.avatar || null,
  }));

  const total = await User.countDocuments({
    isActive: true,
    'gamification.totalXP': { $exists: true },
  });

  return {
    leaderboard,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get weekly leaderboard
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Leaderboard data
 */
const getWeeklyLeaderboard = async (options = {}) => {
  const { limit = 50, offset = 0 } = options;

  // Get start of week (Monday)
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days to subtract: if Sunday (0), subtract 6 days; otherwise subtract (dayOfWeek - 1)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get total count of users with attempts this week (for pagination)
  const totalUsersWithAttempts = await TestAttempt.distinct('userId', {
    submittedAt: { $gte: startOfWeek, $exists: true },
    status: 'completed',
  });

  // Get XP earned this week for each user
  const weeklyXP = await TestAttempt.aggregate([
    {
      $match: {
        submittedAt: { $gte: startOfWeek, $exists: true },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$userId',
        weeklyXP: {
          $sum: {
            $ifNull: ['$gamificationRewards.xp', 0],
          },
        },
        weeklyCoins: {
          $sum: {
            $ifNull: ['$gamificationRewards.coins', 0],
          },
        },
        testsCompleted: { $sum: 1 },
      },
    },
    {
      $match: {
        // Only include users who earned XP this week
        weeklyXP: { $gt: 0 },
      },
    },
    {
      $sort: { weeklyXP: -1, testsCompleted: -1 },
    },
    {
      $skip: offset,
    },
    {
      $limit: limit,
    },
  ]);

  // If no results, return empty leaderboard
  if (!weeklyXP || weeklyXP.length === 0) {
    return {
      leaderboard: [],
      pagination: {
        total: 0,
        limit,
        offset,
        pages: 0,
      },
      weekStart: startOfWeek,
    };
  }

  // Get user details
  const userIds = weeklyXP.map((item) => item._id);
  const users = await User.find({ _id: { $in: userIds }, isActive: true })
    .select('name email gamification totalTestsCompleted studyStreak')
    .lean();

  const userMap = new Map();
  users.forEach((user) => {
    userMap.set(user._id.toString(), user);
  });

  // Combine and format leaderboard
  const leaderboard = weeklyXP
    .map((item, index) => {
      const user = userMap.get(item._id.toString());
      if (!user) return null;

      return {
        rank: offset + index + 1,
        userId: user._id,
        name: user.name,
        email: user.email,
        level: user.gamification?.level || 1,
        weeklyXP: item.weeklyXP || 0,
        weeklyCoins: item.weeklyCoins || 0,
        testsCompleted: item.testsCompleted || 0,
        streak: user.studyStreak?.currentStreak || 0,
        avatar: user.gamification?.avatar || null,
      };
    })
    .filter((item) => item !== null);

  // Get accurate total count from aggregation (users with XP > 0 this week)
  const totalCountResult = await TestAttempt.aggregate([
    {
      $match: {
        submittedAt: { $gte: startOfWeek, $exists: true },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$userId',
        weeklyXP: {
          $sum: {
            $ifNull: ['$gamificationRewards.xp', 0],
          },
        },
      },
    },
    {
      $match: {
        weeklyXP: { $gt: 0 },
      },
    },
    {
      $count: 'total',
    },
  ]);

  const total = totalCountResult && totalCountResult.length > 0 ? totalCountResult[0].total : 0;

  return {
    leaderboard,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
    weekStart: startOfWeek,
  };
};

/**
 * Get category leaderboard
 * @param {string} categoryId - Category ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Leaderboard data
 */
const getCategoryLeaderboard = async (categoryId, options = {}) => {
  const { limit = 50, offset = 0 } = options;

  // Get test attempts for this category
  const Test = require('../models/Test');
  const Exam = require('../models/Exam');

  const exams = await Exam.find({ category: categoryId }).select('_id');
  const examIds = exams.map((e) => e._id);

  const tests = await Test.find({ examId: { $in: examIds } }).select('_id');
  const testIds = tests.map((t) => t._id);

  // Get users with attempts in this category
  const userStats = await TestAttempt.aggregate([
    {
      $match: {
        testId: { $in: testIds },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$userId',
        totalScore: { $sum: '$score' },
        totalMarks: { $sum: '$totalMarks' },
        testsCompleted: { $sum: 1 },
        averageAccuracy: { $avg: '$accuracy' },
      },
    },
    {
      $sort: { averageAccuracy: -1, testsCompleted: -1 },
    },
    {
      $limit: limit + offset,
    },
  ]);

  const userIds = userStats.map((item) => item._id);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name email gamification')
    .lean();

  const userMap = new Map();
  users.forEach((user) => {
    userMap.set(user._id.toString(), user);
  });

  const leaderboard = userStats
    .slice(offset)
    .map((item, index) => {
      const user = userMap.get(item._id.toString());
      if (!user) return null;

      return {
        rank: offset + index + 1,
        userId: user._id,
        name: user.name,
        email: user.email,
        level: user.gamification?.level || 1,
        testsCompleted: item.testsCompleted || 0,
        averageAccuracy: Math.round(item.averageAccuracy || 0),
        totalScore: item.totalScore || 0,
        avatar: user.gamification?.avatar || null,
      };
    })
    .filter((item) => item !== null);

  return {
    leaderboard,
    pagination: {
      total: userStats.length,
      limit,
      offset,
      pages: Math.ceil(userStats.length / limit),
    },
  };
};

/**
 * Get user's rank in leaderboard (global or weekly)
 * @param {string} userId - User ID
 * @param {string} type - Leaderboard type: 'global' or 'weekly'
 * @returns {Promise<Object>} - User rank info
 */
const getUserRank = async (userId, type = 'global') => {
  const user = await User.findById(userId).select('gamification');
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (type === 'weekly') {
    // Calculate weekly rank
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get user's weekly XP
    // Convert userId to ObjectId if it's a string
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const userWeeklyStats = await TestAttempt.aggregate([
      {
        $match: {
          userId: userIdObj,
          submittedAt: { $gte: startOfWeek, $exists: true },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$userId',
          weeklyXP: {
            $sum: {
              $ifNull: ['$gamificationRewards.xp', 0],
            },
          },
          testsCompleted: { $sum: 1 },
        },
      },
    ]);

    const userWeeklyXP = userWeeklyStats && userWeeklyStats.length > 0 ? userWeeklyStats[0].weeklyXP : 0;
    const userTestsCompleted = userWeeklyStats && userWeeklyStats.length > 0 ? userWeeklyStats[0].testsCompleted : 0;

    // Count users with higher weekly XP
    const usersWithHigherXP = await TestAttempt.aggregate([
      {
        $match: {
          submittedAt: { $gte: startOfWeek, $exists: true },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$userId',
          weeklyXP: {
            $sum: {
              $ifNull: ['$gamificationRewards.xp', 0],
            },
          },
          testsCompleted: { $sum: 1 },
        },
      },
      {
        $match: {
          weeklyXP: { $gt: userWeeklyXP },
        },
      },
      {
        $count: 'total',
      },
    ]);

    // Count users with same XP but more tests completed
    const usersWithSameXPMoreTests = await TestAttempt.aggregate([
      {
        $match: {
          submittedAt: { $gte: startOfWeek, $exists: true },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$userId',
          weeklyXP: {
            $sum: {
              $ifNull: ['$gamificationRewards.xp', 0],
            },
          },
          testsCompleted: { $sum: 1 },
        },
      },
      {
        $match: {
          weeklyXP: userWeeklyXP,
          testsCompleted: { $gt: userTestsCompleted },
        },
      },
      {
        $count: 'total',
      },
    ]);

    const higherXPCount = usersWithHigherXP && usersWithHigherXP.length > 0 ? usersWithHigherXP[0].total : 0;
    const sameXPMoreTestsCount = usersWithSameXPMoreTests && usersWithSameXPMoreTests.length > 0 ? usersWithSameXPMoreTests[0].total : 0;
    const rank = higherXPCount + sameXPMoreTestsCount + 1;

    // Get total users with XP > 0 this week
    const totalUsersResult = await TestAttempt.aggregate([
      {
        $match: {
          submittedAt: { $gte: startOfWeek, $exists: true },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$userId',
          weeklyXP: {
            $sum: {
              $ifNull: ['$gamificationRewards.xp', 0],
            },
          },
        },
      },
      {
        $match: {
          weeklyXP: { $gt: 0 },
        },
      },
      {
        $count: 'total',
      },
    ]);

    const totalUsers = totalUsersResult && totalUsersResult.length > 0 ? totalUsersResult[0].total : 0;

    return {
      rank,
      totalUsers,
      percentile: totalUsers > 0 ? Math.round(((totalUsers - rank) / totalUsers) * 100) : 0,
      userXP: userWeeklyXP,
      userLevel: user.gamification?.level || 1,
    };
  } else {
    // Calculate global rank
    const userXP = user.gamification?.totalXP || 0;
    const userLevel = user.gamification?.level || 1;

    // Count users with higher XP
    const rank = await User.countDocuments({
      isActive: true,
      $or: [
        { 'gamification.totalXP': { $gt: userXP } },
        {
          'gamification.totalXP': userXP,
          'gamification.level': { $gt: userLevel },
        },
      ],
    }) + 1;

    const totalUsers = await User.countDocuments({
      isActive: true,
      'gamification.totalXP': { $exists: true },
    });

    return {
      rank,
      totalUsers,
      percentile: totalUsers > 0 ? Math.round(((totalUsers - rank) / totalUsers) * 100) : 0,
      userXP,
      userLevel,
    };
  }
};

/**
 * Get daily challenge leaderboard (for today's daily test challenge)
 * @param {string} challengeId - Daily challenge ID (optional, defaults to today's daily_test challenge)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Leaderboard data
 */
const getDailyChallengeLeaderboard = async (challengeId = null, options = {}) => {
  const { limit = 50, offset = 0 } = options;
  const DailyChallenge = require('../models/DailyChallenge');
  const UserChallenge = require('../models/UserChallenge');

  // Get today's daily test challenge if challengeId not provided
  let challenge;
  if (challengeId) {
    challenge = await DailyChallenge.findById(challengeId);
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    challenge = await DailyChallenge.findOne({
      date: today,
      challengeType: 'daily_test',
      isActive: true,
    });
  }

  if (!challenge) {
    return {
      leaderboard: [],
      pagination: {
        total: 0,
        limit,
        offset,
        pages: 0,
      },
      challenge: null,
    };
  }

  // Get all completed user challenges for this challenge
  const completedUserChallenges = await UserChallenge.find({
    challengeId: challenge._id,
    isCompleted: true,
  })
    .populate('userId', 'name email gamification')
    .sort({ completedAt: 1 }) // First to complete gets better rank
    .limit(limit + offset)
    .skip(offset)
    .lean();

  // Get test attempts for these users to get scores
  // IMPORTANT: Only get attempts that are specifically for this daily challenge
  // Filter by dailyChallengeId to avoid showing duplicate entries from regular test attempts
  const TestAttempt = require('../models/TestAttempt');
  const userIds = completedUserChallenges.map((uc) => uc.userId._id);

  const testAttempts = await TestAttempt.find({
    userId: { $in: userIds },
    testId: challenge.targetTest,
    dailyChallengeId: challenge._id, // Only get attempts for this specific daily challenge
    status: 'completed',
  })
    .sort({ score: -1, accuracy: -1, timeTaken: 1 })
    .lean();

  // Create a map of userId to best attempt
  const userAttemptMap = new Map();
  testAttempts.forEach((attempt) => {
    const userId = attempt.userId.toString();
    if (!userAttemptMap.has(userId)) {
      userAttemptMap.set(userId, attempt);
    } else {
      const existing = userAttemptMap.get(userId);
      // Keep the better attempt (higher score, or same score but better accuracy/time)
      if (
        attempt.score > existing.score ||
        (attempt.score === existing.score && attempt.accuracy > existing.accuracy) ||
        (attempt.score === existing.score &&
          attempt.accuracy === existing.accuracy &&
          attempt.timeTaken < existing.timeTaken)
      ) {
        userAttemptMap.set(userId, attempt);
      }
    }
  });

  // Combine user challenges with attempt data
  const leaderboard = completedUserChallenges
    .map((userChallenge, index) => {
      const user = userChallenge.userId;
      const attempt = userAttemptMap.get(user._id.toString());

      return {
        rank: offset + index + 1,
        userId: user._id,
        name: user.name,
        email: user.email,
        level: user.gamification?.level || 1,
        score: attempt?.score || 0,
        totalMarks: attempt?.totalMarks || 0,
        accuracy: attempt?.accuracy || 0,
        timeTaken: attempt?.timeTaken || 0,
        completedAt: userChallenge.completedAt,
        avatar: user.gamification?.avatar || null,
      };
    })
    .sort((a, b) => {
      // Sort by score (desc), then accuracy (desc), then time (asc), then completion time (asc)
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
      return new Date(a.completedAt) - new Date(b.completedAt);
    })
    .map((item, index) => ({
      ...item,
      rank: offset + index + 1,
    }));

  const total = await UserChallenge.countDocuments({
    challengeId: challenge._id,
    isCompleted: true,
  });

  return {
    leaderboard,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
    challenge: {
      _id: challenge._id,
      title: challenge.title,
      date: challenge.date,
      targetTest: challenge.targetTest,
    },
  };
};

/**
 * Get test-specific leaderboard
 * @param {string} testId - Test ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Leaderboard data
 */
const getTestLeaderboard = async (testId, options = {}) => {
  const { limit = 50, offset = 0 } = options;

  // Get all completed attempts for this test, sorted by score
  // Exclude quiz room attempts - they have their own separate leaderboard
  const attempts = await TestAttempt.find({
    testId,
    status: 'completed',
    quizRoomId: null, // Exclude quiz room attempts from general leaderboard
  })
    .populate('userId', 'name email gamification')
    .sort({ score: -1, accuracy: -1, timeTaken: 1, submittedAt: 1 })
    .limit(limit + offset)
    .skip(offset)
    .lean();

  // Get user details and format leaderboard
  const leaderboard = attempts
    .map((attempt, index) => {
      const user = attempt.userId;
      // Skip if user is null, undefined, or doesn't have required fields
      if (!user || !user._id || !user.name) {
        return null;
      }

      return {
        rank: offset + index + 1,
        userId: user._id.toString(),
        name: user.name || 'Unknown User',
        email: user.email || '',
        level: user.gamification?.level || 1,
        score: attempt.score || 0,
        totalMarks: attempt.totalMarks || 0,
        accuracy: attempt.accuracy || 0,
        timeTaken: attempt.timeTaken || 0,
        correctAnswers: attempt.correctAnswers || 0,
        wrongAnswers: attempt.wrongAnswers || 0,
        skippedAnswers: attempt.skippedAnswers || 0,
        submittedAt: attempt.submittedAt,
        avatar: user.gamification?.avatar || null,
      };
    })
    .filter((item) => item !== null);

  const total = await TestAttempt.countDocuments({
    testId,
    status: 'completed',
    quizRoomId: null, // Exclude quiz room attempts from count
  });

  return {
    leaderboard,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getCategoryLeaderboard,
  getUserRank,
  getDailyChallengeLeaderboard,
  getTestLeaderboard,
};


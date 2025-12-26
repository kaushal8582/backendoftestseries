const TestAttempt = require('../models/TestAttempt');
const User = require('../models/User');
const mongoose = require('mongoose');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get test performance analytics
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Test analytics
 */
const getTestAnalytics = async (testId) => {
  const completedAttempts = await TestAttempt.find({
    testId,
    status: 'completed',
  }).sort({ score: -1 });

  if (completedAttempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      averageAccuracy: 0,
      averageTimeTaken: 0,
      scoreDistribution: {},
    };
  }

  const totalAttempts = completedAttempts.length;
  const totalScore = completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = (totalScore / totalAttempts).toFixed(2);
  const highestScore = completedAttempts[0].score;
  const lowestScore = completedAttempts[totalAttempts - 1].score;

  const totalAccuracy = completedAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0);
  const averageAccuracy = (totalAccuracy / totalAttempts).toFixed(2);

  const totalTime = completedAttempts.reduce((sum, attempt) => sum + attempt.timeTaken, 0);
  const averageTimeTaken = Math.floor(totalTime / totalAttempts);

  // Score distribution (0-25, 26-50, 51-75, 76-100)
  const scoreDistribution = {
    '0-25': 0,
    '26-50': 0,
    '51-75': 0,
    '76-100': 0,
  };

  completedAttempts.forEach((attempt) => {
    const percentage = (attempt.score / attempt.totalMarks) * 100;
    if (percentage <= 25) {
      scoreDistribution['0-25']++;
    } else if (percentage <= 50) {
      scoreDistribution['26-50']++;
    } else if (percentage <= 75) {
      scoreDistribution['51-75']++;
    } else {
      scoreDistribution['76-100']++;
    }
  });

  return {
    totalAttempts,
    averageScore: parseFloat(averageScore),
    highestScore,
    lowestScore,
    averageAccuracy: parseFloat(averageAccuracy),
    averageTimeTaken,
    scoreDistribution,
  };
};

/**
 * Get exam performance analytics
 * @param {string} examId - Exam ID
 * @returns {Promise<Object>} - Exam analytics
 */
const getExamAnalytics = async (examId) => {
  const completedAttempts = await TestAttempt.find({
    examId,
    status: 'completed',
  });

  if (completedAttempts.length === 0) {
    return {
      totalAttempts: 0,
      uniqueUsers: 0,
      averageScore: 0,
      testWiseStats: [],
    };
  }

  const uniqueUsers = new Set(completedAttempts.map((attempt) => attempt.userId.toString())).size;
  const totalScore = completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = (totalScore / completedAttempts.length).toFixed(2);

  // Group by test
  const testStats = {};
  completedAttempts.forEach((attempt) => {
    const testId = attempt.testId.toString();
    if (!testStats[testId]) {
      testStats[testId] = {
        testId,
        totalAttempts: 0,
        averageScore: 0,
        totalScore: 0,
      };
    }
    testStats[testId].totalAttempts++;
    testStats[testId].totalScore += attempt.score;
  });

  const testWiseStats = Object.values(testStats).map((stat) => ({
    testId: stat.testId,
    totalAttempts: stat.totalAttempts,
    averageScore: (stat.totalScore / stat.totalAttempts).toFixed(2),
  }));

  return {
    totalAttempts: completedAttempts.length,
    uniqueUsers,
    averageScore: parseFloat(averageScore),
    testWiseStats,
  };
};

/**
 * Get leaderboard for a test
 * @param {string} testId - Test ID
 * @param {Object} queryParams - Query parameters (page, limit)
 * @returns {Promise<Object>} - Leaderboard with pagination
 */
const getTestLeaderboard = async (testId, queryParams = {}) => {
  if (!testId) {
    throw new AppError('Test ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Convert testId to ObjectId if it's a string
  let testIdObjectId;
  try {
    testIdObjectId = mongoose.Types.ObjectId.isValid(testId) 
      ? new mongoose.Types.ObjectId(testId) 
      : testId;
  } catch (error) {
    throw new AppError('Invalid test ID format', HTTP_STATUS.BAD_REQUEST);
  }

  const { page = 1, limit = 10 } = queryParams;
  const skip = (page - 1) * limit;

  const attempts = await TestAttempt.find({
    testId: testIdObjectId,
    status: 'completed',
  })
    .populate('userId', 'name email')
    .sort({ score: -1, timeTaken: 1 }) // Sort by score (desc) then time (asc)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await TestAttempt.countDocuments({
    testId: testIdObjectId,
    status: 'completed',
  });

  // Add rank
  const rankedAttempts = attempts.map((attempt, index) => ({
    rank: skip + index + 1,
    user: {
      _id: attempt.userId._id,
      name: attempt.userId.name,
      email: attempt.userId.email,
    },
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    accuracy: attempt.accuracy,
    timeTaken: attempt.timeTaken,
    submittedAt: attempt.submittedAt,
  }));

  return {
    leaderboard: rankedAttempts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getTestAnalytics,
  getExamAnalytics,
  getTestLeaderboard,
};


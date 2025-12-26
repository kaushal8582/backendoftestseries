const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
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
  const { page = 1, limit = 10, status } = queryParams;
  const skip = (page - 1) * limit;

  const query = { userId };
  if (status) {
    query.status = status;
  }

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

  return {
    totalTestsAttempted: user.totalTestsAttempted || 0,
    totalTestsCompleted: user.totalTestsCompleted || completedAttempts.length,
    averageScore: user.averageScore || 0,
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
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};


const userService = require('../services/userService');
const { HTTP_STATUS, USER_ROLES } = require('../config/constants');
const { uploadOnCloudinary } = require('../utils/cloudinary');

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
    let profilePictureUrl = req.body.profilePicture;

    // If file is uploaded, upload to Cloudinary
    if (req.file) {
      const localFilePath = req.file.path;
      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
      
      if (cloudinaryResponse && cloudinaryResponse.secure_url) {
        profilePictureUrl = cloudinaryResponse.secure_url;
      }
    }

    const updateData = {
      ...req.body,
      profilePicture: profilePictureUrl || req.body.profilePicture,
    };

    const user = await userService.updateProfile(req.user._id, updateData);

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

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin only)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

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
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (Admin only)
 * @access  Private (Admin only)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await userService.updateUserRole(req.params.id, role);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user active status (Admin only)
 * @access  Private (Admin only)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.updateUserStatus(req.params.id, isActive);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User deleted successfully',
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
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};


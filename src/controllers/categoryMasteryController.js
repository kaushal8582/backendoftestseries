const {
  getCategoryMastery,
  getUserMasteries,
  getCategorySkillTree,
} = require('../services/categoryMasteryService');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/category-mastery/:categoryId
 * @desc    Get user's mastery for a category
 * @access  Private
 */
const getCategoryMasteryHandler = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const mastery = await getCategoryMastery(req.user._id, categoryId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: mastery,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/category-mastery
 * @desc    Get all category masteries for user
 * @access  Private
 */
const getUserMasteriesHandler = async (req, res, next) => {
  try {
    const masteries = await getUserMasteries(req.user._id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: masteries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/category-mastery/:categoryId/skill-tree
 * @desc    Get skill tree for a category
 * @access  Private
 */
const getCategorySkillTreeHandler = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const skillTree = await getCategorySkillTree(categoryId);
    
    // Get user's mastery to show unlocked skills
    const mastery = await getCategoryMastery(req.user._id, categoryId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...skillTree,
        userMastery: mastery,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategoryMastery: getCategoryMasteryHandler,
  getUserMasteries: getUserMasteriesHandler,
  getCategorySkillTree: getCategorySkillTreeHandler,
};


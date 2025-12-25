const categoryService = require('../services/categoryService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin only)
 */
const createCategory = async (req, res, next) => {
  try {
    const categoryData = {
      ...req.body,
      createdBy: req.user._id,
    };
    const category = await categoryService.createCategory(categoryData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Category created successfully',
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getCategories(req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin only)
 */
const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Category updated successfully',
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin only)
 */
const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};


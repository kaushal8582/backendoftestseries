const categoryService = require('../services/categoryService');
const { HTTP_STATUS } = require('../config/constants');
const { uploadOnCloudinary } = require('../utils/cloudinary');
const path = require('path');

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (Admin only)
 */
const createCategory = async (req, res, next) => {
  try {
    let iconUrl = req.body.icon; // If icon URL is provided directly

    // If file is uploaded, upload to Cloudinary
    if (req.file) {
      const localFilePath = req.file.path;
      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
      
      if (cloudinaryResponse && cloudinaryResponse.secure_url) {
        iconUrl = cloudinaryResponse.secure_url;
      }
    }

    const categoryData = {
      ...req.body,
      icon: iconUrl || req.body.icon,
      createdBy: req.user._id,
    };

    // Handle isActive field from FormData (comes as string 'true'/'false')
    if (req.body.isActive !== undefined) {
      categoryData.isActive = req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === '1';
    } else {
      // Default to true if not provided
      categoryData.isActive = true;
    }

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
    let iconUrl = req.body.icon; // If icon URL is provided directly

    // If file is uploaded, upload to Cloudinary
    if (req.file) {
      const localFilePath = req.file.path;
      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
      
      if (cloudinaryResponse && cloudinaryResponse.secure_url) {
        iconUrl = cloudinaryResponse.secure_url;
      }
    }

    const updateData = {
      ...req.body,
      icon: iconUrl !== undefined ? iconUrl : req.body.icon,
    };

    // Handle isActive field from FormData (comes as string 'true'/'false')
    if (req.body.isActive !== undefined) {
      updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === '1';
    }

    const category = await categoryService.updateCategory(req.params.id, updateData);

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


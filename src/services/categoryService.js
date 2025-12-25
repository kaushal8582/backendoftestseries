const Category = require('../models/Category');
const Exam = require('../models/Exam');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @returns {Promise<Object>} - Created category
 */
const createCategory = async (categoryData) => {
  // Check if category with same name already exists
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${categoryData.name}$`, 'i') },
  });

  if (existingCategory) {
    throw new AppError('Category with this name already exists', HTTP_STATUS.CONFLICT);
  }

  const category = await Category.create(categoryData);
  return category;
};

/**
 * Get all categories
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Array>} - Categories array
 */
const getCategories = async (queryParams = {}) => {
  const { isActive, includeInactive } = queryParams;
  
  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  } else if (!includeInactive) {
    query.isActive = true;
  }

  const categories = await Category.find(query)
    .populate('createdBy', 'name email')
    .sort({ order: 1, createdAt: -1 });

  return categories;
};

/**
 * Get category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} - Category details
 */
const getCategoryById = async (categoryId) => {
  const category = await Category.findById(categoryId).populate('createdBy', 'name email');

  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  return category;
};

/**
 * Update category
 * @param {string} categoryId - Category ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated category
 */
const updateCategory = async (categoryId, updateData) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if name is being updated and if it conflicts
  if (updateData.name && updateData.name !== category.name) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      throw new AppError('Category with this name already exists', HTTP_STATUS.CONFLICT);
    }
  }

  Object.keys(updateData).forEach((key) => {
    category[key] = updateData[key];
  });

  await category.save();
  return category;
};

/**
 * Delete category (soft delete)
 * @param {string} categoryId - Category ID
 * @returns {Promise<void>}
 */
const deleteCategory = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if category is being used by any exams
  const examsUsingCategory = await Exam.countDocuments({ category: category.name, isActive: true });

  if (examsUsingCategory > 0) {
    throw new AppError(
      `Cannot delete category. It is being used by ${examsUsingCategory} exam(s).`,
      HTTP_STATUS.CONFLICT
    );
  }

  category.isActive = false;
  await category.save();
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};


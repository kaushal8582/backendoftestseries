const Tab = require('../models/Tab');
const Exam = require('../models/Exam');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create a new tab
 * @param {Object} tabData - Tab data
 * @returns {Promise<Object>} - Created tab
 */
const createTab = async (tabData) => {
  // Verify exam exists
  const exam = await Exam.findById(tabData.examId);
  if (!exam) {
    throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if order already exists for this exam
  const existingTab = await Tab.findOne({
    examId: tabData.examId,
    order: tabData.order,
  });

  if (existingTab) {
    throw new AppError('Tab with this order already exists for this exam', HTTP_STATUS.CONFLICT);
  }

  // If this is being set as default, unset other defaults
  if (tabData.isDefault) {
    await Tab.updateMany(
      { examId: tabData.examId },
      { isDefault: false }
    );
  }

  const tab = await Tab.create(tabData);

  return tab;
};

/**
 * Get all tabs for an exam
 * @param {string} examId - Exam ID
 * @returns {Promise<Array>} - Tabs array
 */
const getTabs = async (examId) => {
  const tabs = await Tab.find({ examId, isActive: true })
    .populate('examId', 'title category')
    .sort({ order: 1 });

  return tabs;
};

/**
 * Get tab by ID
 * @param {string} tabId - Tab ID
 * @returns {Promise<Object>} - Tab details
 */
const getTabById = async (tabId) => {
  const tab = await Tab.findById(tabId)
    .populate('examId', 'title category');

  if (!tab) {
    throw new AppError('Tab not found', HTTP_STATUS.NOT_FOUND);
  }

  return tab;
};

/**
 * Update tab
 * @param {string} tabId - Tab ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated tab
 */
const updateTab = async (tabId, updateData) => {
  const tab = await Tab.findById(tabId);

  if (!tab) {
    throw new AppError('Tab not found', HTTP_STATUS.NOT_FOUND);
  }

  // If order is being updated, check for conflicts
  if (updateData.order && updateData.order !== tab.order) {
    const existingTab = await Tab.findOne({
      examId: tab.examId,
      order: updateData.order,
      _id: { $ne: tabId },
    });

    if (existingTab) {
      throw new AppError('Tab with this order already exists for this exam', HTTP_STATUS.CONFLICT);
    }
  }

  // If this is being set as default, unset other defaults
  if (updateData.isDefault && !tab.isDefault) {
    await Tab.updateMany(
      { examId: tab.examId, _id: { $ne: tabId } },
      { isDefault: false }
    );
  }

  Object.keys(updateData).forEach((key) => {
    tab[key] = updateData[key];
  });

  await tab.save();

  return tab;
};

/**
 * Delete tab (soft delete)
 * @param {string} tabId - Tab ID
 * @returns {Promise<void>}
 */
const deleteTab = async (tabId) => {
  const tab = await Tab.findById(tabId);

  if (!tab) {
    throw new AppError('Tab not found', HTTP_STATUS.NOT_FOUND);
  }

  tab.isActive = false;
  await tab.save();
};

module.exports = {
  createTab,
  getTabs,
  getTabById,
  updateTab,
  deleteTab,
};


const Test = require('../models/Test');
const Exam = require('../models/Exam');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create a new test
 * @param {Object} testData - Test data
 * @returns {Promise<Object>} - Created test
 */
const createTest = async (testData) => {
  // Verify exam exists
  const exam = await Exam.findById(testData.examId);
  if (!exam) {
    throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if order already exists for this exam
  const existingTest = await Test.findOne({
    examId: testData.examId,
    order: testData.order,
  });

  if (existingTest) {
    throw new AppError('Test with this order already exists for this exam', HTTP_STATUS.CONFLICT);
  }

  const test = await Test.create(testData);

  // Update exam's totalTests count
  await Exam.findByIdAndUpdate(testData.examId, {
    $inc: { totalTests: 1 },
  });

  return test;
};

/**
 * Get all tests for an exam
 * @param {string} examId - Exam ID
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} - Tests with pagination
 */
const getTests = async (examId, queryParams = {}) => {
  const { page = 1, limit = 10, tabId, includeInactive } = queryParams;
  const skip = (page - 1) * limit;

  const query = { examId };
  
  // Filter by isActive unless includeInactive is true (for admin panel)
  if (!includeInactive) {
    query.isActive = true;
  }
  
  // Filter by tabId if provided
  if (tabId) {
    query.tabId = tabId;
  }

  const tests = await Test.find(query)
    .populate('examId', 'title category')
    .populate('tabId', 'name')
    .sort({ order: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Test.countDocuments(query);

  return {
    tests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get test by ID
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Test details
 */
const getTestById = async (testId) => {
  const test = await Test.findById(testId)
    .populate('examId', 'title category language');

  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  return test;
};

/**
 * Update test
 * @param {string} testId - Test ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated test
 */
const updateTest = async (testId, updateData) => {
  const test = await Test.findById(testId);

  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  // If order is being updated, check for conflicts
  if (updateData.order && updateData.order !== test.order) {
    const existingTest = await Test.findOne({
      examId: test.examId,
      order: updateData.order,
      _id: { $ne: testId },
    });

    if (existingTest) {
      throw new AppError('Test with this order already exists for this exam', HTTP_STATUS.CONFLICT);
    }
  }

  Object.keys(updateData).forEach((key) => {
    test[key] = updateData[key];
  });

  await test.save();

  return test;
};

/**
 * Delete test (soft delete)
 * @param {string} testId - Test ID
 * @returns {Promise<void>}
 */
const deleteTest = async (testId) => {
  const test = await Test.findById(testId);

  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  test.isActive = false;
  await test.save();

  // Update exam's totalTests count
  await Exam.findByIdAndUpdate(test.examId, {
    $inc: { totalTests: -1 },
  });
};

module.exports = {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
};


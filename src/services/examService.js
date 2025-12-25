const Exam = require('../models/Exam');
const Test = require('../models/Test');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, EXAM_STATUS } = require('../config/constants');

/**
 * Create a new exam
 * @param {Object} examData - Exam data
 * @param {string} createdBy - User ID who created the exam
 * @returns {Promise<Object>} - Created exam
 */
const createExam = async (examData, createdBy) => {
  const exam = await Exam.create({
    ...examData,
    createdBy,
  });

  return exam;
};

/**
 * Get all exams with filters
 * @param {Object} filters - Filter criteria
 * @param {Object} queryParams - Query parameters (page, limit)
 * @returns {Promise<Object>} - Exams with pagination
 */
const getExams = async (filters = {}, queryParams = {}) => {
  const { page = 1, limit = 10 } = queryParams;
  const skip = (page - 1) * limit;

  // Build query
  const query = { isActive: true };
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.language) {
    query.language = filters.language;
  }
  // If showAll is true (for admin), don't filter by status
  // If status is explicitly provided, use it
  // Otherwise, default to published for public access
  if (filters.showAll) {
    // Don't filter by status - show all
  } else if (filters.status) {
    query.status = filters.status;
  } else {
    // By default, show only published exams for non-admin users
    query.status = EXAM_STATUS.PUBLISHED;
  }

  const exams = await Exam.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Exam.countDocuments(query);

  return {
    exams,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get exam by ID
 * @param {string} examId - Exam ID
 * @returns {Promise<Object>} - Exam details
 */
const getExamById = async (examId) => {
  const exam = await Exam.findById(examId)
    .populate('createdBy', 'name email');

  if (!exam) {
    throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);
  }

  return exam;
};

/**
 * Update exam
 * @param {string} examId - Exam ID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Updated exam
 */
const updateExam = async (examId, updateData, userId) => {
  const exam = await Exam.findById(examId);

  if (!exam) {
    throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user is the creator or admin
  if (exam.createdBy.toString() !== userId.toString()) {
    throw new AppError('Not authorized to update this exam', HTTP_STATUS.FORBIDDEN);
  }

  Object.keys(updateData).forEach((key) => {
    exam[key] = updateData[key];
  });

  await exam.save();

  return exam;
};

/**
 * Delete exam (soft delete)
 * @param {string} examId - Exam ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<void>}
 */
const deleteExam = async (examId, userId) => {
  const exam = await Exam.findById(examId);

  if (!exam) {
    throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user is the creator or admin
  if (exam.createdBy.toString() !== userId.toString()) {
    throw new AppError('Not authorized to delete this exam', HTTP_STATUS.FORBIDDEN);
  }

  exam.isActive = false;
  await exam.save();
};

/**
 * Get tests for an exam
 * @param {string} examId - Exam ID
 * @returns {Promise<Array>} - List of tests
 */
const getExamTests = async (examId) => {
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND);
  }

  const tests = await Test.find({ examId, isActive: true })
    .sort({ order: 1 });

  return tests;
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  getExamTests,
};


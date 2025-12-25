const examService = require('../services/examService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/exams
 * @desc    Create a new exam
 * @access  Private (Admin only)
 */
const createExam = async (req, res, next) => {
  try {
    const exam = await examService.createExam(req.body, req.user._id);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Exam created successfully',
      data: {
        exam,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/exams
 * @desc    Get all exams
 * @access  Public
 */
const getExams = async (req, res, next) => {
  try {
    // If user is admin, show all statuses by default; otherwise only published
    const filters = {};
    if (req.user && req.user.role === 'ADMIN') {
      // For admin, show all exams if no status filter is provided
      if (req.query.status) {
        filters.status = req.query.status;
      } else {
        // Admin wants to see all exams (draft + published)
        filters.showAll = true;
      }
    }
    if (req.query.category) {
      filters.category = req.query.category;
    }
    if (req.query.language) {
      filters.language = req.query.language;
    }

    const result = await examService.getExams(filters, req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/exams/:id
 * @desc    Get exam by ID
 * @access  Public
 */
const getExamById = async (req, res, next) => {
  try {
    const exam = await examService.getExamById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        exam,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/exams/:id
 * @desc    Update exam
 * @access  Private (Admin only)
 */
const updateExam = async (req, res, next) => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body, req.user._id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Exam updated successfully',
      data: {
        exam,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete exam
 * @access  Private (Admin only)
 */
const deleteExam = async (req, res, next) => {
  try {
    await examService.deleteExam(req.params.id, req.user._id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/exams/:id/tests
 * @desc    Get all tests for an exam
 * @access  Public
 */
const getExamTests = async (req, res, next) => {
  try {
    const tests = await examService.getExamTests(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        tests,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  getExamTests,
};


const testService = require('../services/testService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/tests
 * @desc    Create a new test
 * @access  Private (Admin only)
 */
const createTest = async (req, res, next) => {
  try {
    const test = await testService.createTest(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Test created successfully',
      data: {
        test,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tests
 * @desc    Get all tests (filtered by examId)
 * @access  Public
 */
const getTests = async (req, res, next) => {
  try {
    if (!req.query.examId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'examId query parameter is required',
      });
    }

    const result = await testService.getTests(req.query.examId, req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tests/:id
 * @desc    Get test by ID
 * @access  Public
 */
const getTestById = async (req, res, next) => {
  try {
    const test = await testService.getTestById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        test,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/tests/:id
 * @desc    Update test
 * @access  Private (Admin only)
 */
const updateTest = async (req, res, next) => {
  try {
    const test = await testService.updateTest(req.params.id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Test updated successfully',
      data: {
        test,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/tests/:id
 * @desc    Delete test
 * @access  Private (Admin only)
 */
const deleteTest = async (req, res, next) => {
  try {
    await testService.deleteTest(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Test deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
};


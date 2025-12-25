const questionService = require('../services/questionService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
const createQuestion = async (req, res, next) => {
  try {
    const question = await questionService.createQuestion(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Question created successfully',
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/questions/bulk
 * @desc    Bulk create questions
 * @access  Private (Admin only)
 */
const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Questions array is required',
      });
    }

    const createdQuestions = await questionService.bulkCreateQuestions(questions);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      data: {
        questions: createdQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/questions
 * @desc    Get all questions (filtered by testId)
 * @access  Public (answers hidden unless admin)
 */
const getQuestions = async (req, res, next) => {
  try {
    if (!req.query.testId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'testId query parameter is required',
      });
    }

    // Only admins can see answers
    const includeAnswers = req.user && req.user.role === 'ADMIN';
    const language = req.query.language || 'english'; // Default to english
    const result = await questionService.getQuestions(req.query.testId, {
      ...req.query,
      includeAnswers,
      language,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Public (answers hidden unless admin)
 */
const getQuestionById = async (req, res, next) => {
  try {
    // Only admins can see answers
    const includeAnswer = req.user && req.user.role === 'ADMIN';
    const question = await questionService.getQuestionById(req.params.id, includeAnswer);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
const updateQuestion = async (req, res, next) => {
  try {
    const question = await questionService.updateQuestion(req.params.id, req.body);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Question updated successfully',
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Private (Admin only)
 */
const deleteQuestion = async (req, res, next) => {
  try {
    await questionService.deleteQuestion(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};


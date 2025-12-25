const testAttemptService = require('../services/testAttemptService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/test-attempts/start/:testId
 * @desc    Start a test attempt
 * @access  Private
 */
const startTest = async (req, res, next) => {
  try {
    const testAttempt = await testAttemptService.startTest(req.user._id, req.params.testId);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Test started successfully',
      data: {
        testAttempt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/test-attempts/:attemptId/answer
 * @desc    Submit answer for a question
 * @access  Private
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { questionId, selectedOption, timeSpent } = req.body;

    if (!questionId || !selectedOption) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'questionId and selectedOption are required',
      });
    }

    const testAttempt = await testAttemptService.submitAnswer(
      req.params.attemptId,
      questionId,
      selectedOption,
      timeSpent || 0
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        testAttempt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/test-attempts/:attemptId/submit
 * @desc    Submit test (finalize attempt)
 * @access  Private
 */
const submitTest = async (req, res, next) => {
  try {
    const testAttempt = await testAttemptService.submitTest(req.params.attemptId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        testAttempt: {
          _id: testAttempt._id,
          testId: testAttempt.testId,
          examId: testAttempt.examId,
          status: testAttempt.status,
          score: testAttempt.score,
          totalMarks: testAttempt.totalMarks,
          accuracy: testAttempt.accuracy,
          correctAnswers: testAttempt.correctAnswers,
          wrongAnswers: testAttempt.wrongAnswers,
          skippedAnswers: testAttempt.skippedAnswers,
          rank: testAttempt.rank,
          timeTaken: testAttempt.timeTaken,
          submittedAt: testAttempt.submittedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/test-attempts/:attemptId
 * @desc    Get test attempt by ID
 * @access  Private
 */
const getTestAttempt = async (req, res, next) => {
  try {
    const testAttempt = await testAttemptService.getTestAttempt(
      req.params.attemptId,
      req.user._id
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        testAttempt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/test-attempts/:attemptId/details
 * @desc    Get test attempt details with questions and answers
 * @access  Private
 */
const getTestAttemptDetails = async (req, res, next) => {
  try {
    const result = await testAttemptService.getTestAttemptDetails(
      req.params.attemptId,
      req.user._id
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/test-attempts/check/:testId
 * @desc    Check if user has completed a test
 * @access  Private
 */
const checkTestCompletion = async (req, res, next) => {
  try {
    const result = await testAttemptService.checkTestCompletion(
      req.user._id,
      req.params.testId
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startTest,
  submitAnswer,
  submitTest,
  getTestAttempt,
  getTestAttemptDetails,
  checkTestCompletion,
};


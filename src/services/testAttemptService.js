const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Question = require('../models/Question');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Update study streak for a user
 * @param {Object} user - User document
 * @returns {Promise<void>}
 */
const updateStudyStreak = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivityDate = user.studyStreak?.lastActivityDate
    ? new Date(user.studyStreak.lastActivityDate)
    : null;

  if (lastActivityDate) {
    lastActivityDate.setHours(0, 0, 0, 0);
  }

  // Initialize streak if not exists
  if (!user.studyStreak) {
    user.studyStreak = {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      dailyGoal: 5,
    };
  }

  // Check if last activity was today
  if (lastActivityDate && lastActivityDate.getTime() === today.getTime()) {
    // Already counted today, no need to update streak
    return;
  }

  // Check if last activity was yesterday (consecutive day)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActivityDate && lastActivityDate.getTime() === yesterday.getTime()) {
    // Consecutive day - increment streak
    user.studyStreak.currentStreak += 1;
  } else if (!lastActivityDate || lastActivityDate.getTime() < yesterday.getTime()) {
    // Gap in activity - reset streak
    user.studyStreak.currentStreak = 1;
  } else {
    // First time - start streak
    user.studyStreak.currentStreak = 1;
  }

  // Update longest streak if current is higher
  if (user.studyStreak.currentStreak > user.studyStreak.longestStreak) {
    user.studyStreak.longestStreak = user.studyStreak.currentStreak;
  }

  // Update last activity date
  user.studyStreak.lastActivityDate = today;
};

/**
 * Start a test attempt
 * @param {string} userId - User ID
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Test attempt object
 */
const startTest = async (userId, testId) => {
  // Check if test exists
  const test = await Test.findById(testId).populate('examId');
  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user already has an in-progress attempt
  const existingAttempt = await TestAttempt.findOne({
    userId,
    testId,
    status: 'in-progress',
  });

  if (existingAttempt) {
    return existingAttempt;
  }

  // Check if user already completed this test
  const completedAttempt = await TestAttempt.findOne({
    userId,
    testId,
    status: 'completed',
  });

  if (completedAttempt) {
    throw new AppError('You have already completed this test', HTTP_STATUS.CONFLICT);
  }

  // Get all questions for the test
  const questions = await Question.find({ testId, isActive: true })
    .sort({ order: 1 })
    .select('_id marks negativeMarks');

  if (questions.length === 0) {
    throw new AppError('No questions found for this test', HTTP_STATUS.NOT_FOUND);
  }

  // Initialize answers array
  const answers = questions.map((q) => ({
    questionId: q._id,
    selectedOption: null,
    isCorrect: false,
    marksObtained: 0,
    timeSpent: 0,
  }));

  // Create test attempt
  const testAttempt = await TestAttempt.create({
    userId,
    testId,
    examId: test.examId._id,
    answers,
    status: 'in-progress',
    totalMarks: test.totalMarks,
    startedAt: new Date(),
  });

  // Update user's totalTestsAttempted
  await User.findByIdAndUpdate(userId, {
    $inc: { totalTestsAttempted: 1 },
  });

  return testAttempt;
};

/**
 * Submit answer for a question
 * @param {string} attemptId - Test attempt ID
 * @param {string} questionId - Question ID
 * @param {string} selectedOption - Selected option (A, B, C, D)
 * @param {number} timeSpent - Time spent on question in seconds
 * @returns {Promise<Object>} - Updated test attempt
 */
const submitAnswer = async (attemptId, questionId, selectedOption, timeSpent = 0) => {
  const testAttempt = await TestAttempt.findById(attemptId);

  if (!testAttempt) {
    throw new AppError('Test attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  if (testAttempt.status !== 'in-progress') {
    throw new AppError('Test attempt is not in progress', HTTP_STATUS.BAD_REQUEST);
  }

  // Find the answer in the answers array
  const answerIndex = testAttempt.answers.findIndex(
    (a) => a.questionId.toString() === questionId.toString()
  );

  if (answerIndex === -1) {
    throw new AppError('Question not found in this test attempt', HTTP_STATUS.NOT_FOUND);
  }

  // Get question details
  const question = await Question.findById(questionId);
  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  // Update answer
  const isCorrect = question.correctOption === selectedOption;
  let marksObtained = 0;

  if (isCorrect) {
    marksObtained = question.marks;
  } else if (selectedOption && selectedOption !== null) {
    marksObtained = -question.negativeMarks;
  }

  testAttempt.answers[answerIndex] = {
    questionId: question._id,
    selectedOption,
    isCorrect,
    marksObtained,
    timeSpent,
  };

  await testAttempt.save();

  return testAttempt;
};

/**
 * Submit test (finalize attempt)
 * @param {string} attemptId - Test attempt ID
 * @returns {Promise<Object>} - Finalized test attempt with results
 */
const submitTest = async (attemptId) => {
  const testAttempt = await TestAttempt.findById(attemptId)
    .populate('testId')
    .populate('examId');

  if (!testAttempt) {
    throw new AppError('Test attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  if (testAttempt.status === 'completed') {
    return testAttempt;
  }

  // Calculate results
  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedAnswers = 0;

  // Get all questions with correct answers
  const questionIds = testAttempt.answers.map((a) => a.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } });

  const questionMap = new Map();
  questions.forEach((q) => {
    questionMap.set(q._id.toString(), q);
  });

  // Calculate score and statistics
  testAttempt.answers.forEach((answer) => {
    const question = questionMap.get(answer.questionId.toString());

    if (!answer.selectedOption || answer.selectedOption === null) {
      skippedAnswers++;
    } else {
      if (answer.isCorrect) {
        correctAnswers++;
        score += answer.marksObtained;
      } else {
        wrongAnswers++;
        score += answer.marksObtained; // This will be negative if negative marking exists
      }
    }
  });

  // Calculate accuracy
  const totalAttempted = correctAnswers + wrongAnswers;
  const accuracy = totalAttempted > 0 ? ((correctAnswers / totalAttempted) * 100).toFixed(2) : 0;

  // Calculate time taken
  const timeTaken = Math.floor((new Date() - testAttempt.startedAt) / 1000); // in seconds

  // Update test attempt
  testAttempt.status = 'completed';
  testAttempt.submittedAt = new Date();
  testAttempt.timeTaken = timeTaken;
  testAttempt.score = score;
  testAttempt.accuracy = parseFloat(accuracy);
  testAttempt.correctAnswers = correctAnswers;
  testAttempt.wrongAnswers = wrongAnswers;
  testAttempt.skippedAnswers = skippedAnswers;

  // Calculate rank (placeholder - simple implementation)
  // In production, this should be more sophisticated
  const betterAttempts = await TestAttempt.countDocuments({
    testId: testAttempt.testId,
    status: 'completed',
    score: { $gt: score },
    _id: { $ne: attemptId },
  });
  testAttempt.rank = betterAttempts + 1;

  await testAttempt.save();

  // Update user statistics
  const user = await User.findById(testAttempt.userId);
  if (user) {
    user.totalTestsCompleted += 1;
    const totalCompleted = user.totalTestsCompleted;
    const currentAvg = user.averageScore || 0;
    user.averageScore = ((currentAvg * (totalCompleted - 1) + score) / totalCompleted).toFixed(2);

    // Update performance summary
    user.performanceSummary.totalScore += score;
    user.performanceSummary.totalQuestionsAttempted += totalAttempted;
    user.performanceSummary.totalCorrectAnswers += correctAnswers;
    user.performanceSummary.totalWrongAnswers += wrongAnswers;
    user.performanceSummary.totalSkipped += skippedAnswers;

    // Update study streak
    await updateStudyStreak(user);

    await user.save();
  }

  return testAttempt;
};

/**
 * Get test attempt by ID
 * @param {string} attemptId - Test attempt ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Test attempt details
 */
const getTestAttempt = async (attemptId, userId) => {
  const testAttempt = await TestAttempt.findById(attemptId)
    .populate({
      path: 'testId',
      select: 'testName totalMarks duration',
    })
    .populate('examId', 'title category')
    .populate('userId', 'name email');

  if (!testAttempt) {
    throw new AppError('Test attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check authorization (user can only see their own attempts unless admin)
  const userIdToCheck = testAttempt.userId._id || testAttempt.userId;
  if (userIdToCheck.toString() !== userId.toString()) {
    throw new AppError('Not authorized to view this test attempt', HTTP_STATUS.FORBIDDEN);
  }

  // Ensure test object is properly populated
  if (!testAttempt.testId || typeof testAttempt.testId === 'string') {
    const test = await Test.findById(testAttempt.testId);
    if (test) {
      testAttempt.testId = test;
    }
  }

  return testAttempt;
};

/**
 * Get test attempt with questions and answers
 * @param {string} attemptId - Test attempt ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} - Test attempt with detailed answers
 */
const getTestAttemptDetails = async (attemptId, userId) => {
  const testAttempt = await TestAttempt.findById(attemptId)
    .populate('testId', 'testName totalMarks duration')
    .populate('examId', 'title category');

  if (!testAttempt) {
    throw new AppError('Test attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check authorization
  if (testAttempt.userId.toString() !== userId.toString()) {
    throw new AppError('Not authorized to view this test attempt', HTTP_STATUS.FORBIDDEN);
  }

  // Get all questions with answers (include solution field)
  const questionIds = testAttempt.answers.map((a) => a.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } })
    .sort({ order: 1 });

  // Map answers to questions
  const answersMap = new Map();
  testAttempt.answers.forEach((answer) => {
    answersMap.set(answer.questionId.toString(), answer);
  });

  const questionsWithAnswers = questions.map((question) => {
    const answer = answersMap.get(question._id.toString());
    return {
      question: {
        _id: question._id,
        questionText: question.questionText,
        options: question.options,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        order: question.order,
        section: question.section,
        // Include correct option only if test is completed
        correctOption: testAttempt.status === 'completed' ? question.correctOption : undefined,
        explanation: testAttempt.status === 'completed' ? question.explanation : undefined,
        // Include solution only if test is completed
        solution: testAttempt.status === 'completed' ? question.solution : undefined,
      },
      answer: {
        selectedOption: answer?.selectedOption || null,
        isCorrect: answer?.isCorrect || false,
        marksObtained: answer?.marksObtained || 0,
        timeSpent: answer?.timeSpent || 0,
      },
    };
  });

  return {
    attempt: {
      _id: testAttempt._id,
      testId: testAttempt.testId,
      examId: testAttempt.examId,
      status: testAttempt.status,
      startedAt: testAttempt.startedAt,
      submittedAt: testAttempt.submittedAt,
      timeTaken: testAttempt.timeTaken,
      score: testAttempt.score,
      totalMarks: testAttempt.totalMarks,
      accuracy: testAttempt.accuracy,
      correctAnswers: testAttempt.correctAnswers,
      wrongAnswers: testAttempt.wrongAnswers,
      skippedAnswers: testAttempt.skippedAnswers,
      rank: testAttempt.rank,
    },
    questions: questionsWithAnswers,
  };
};

/**
 * Check if user has completed a test
 * @param {string} userId - User ID
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Completion status with attempt details if completed
 */
const checkTestCompletion = async (userId, testId) => {
  const completedAttempt = await TestAttempt.findOne({
    userId,
    testId,
    status: 'completed',
  })
    .populate('testId', 'testName totalMarks duration')
    .sort({ submittedAt: -1 }); // Get the most recent completion

  if (completedAttempt) {
    return {
      isCompleted: true,
      attempt: {
        _id: completedAttempt._id,
        score: completedAttempt.score,
        totalMarks: completedAttempt.totalMarks,
        accuracy: completedAttempt.accuracy,
        submittedAt: completedAttempt.submittedAt,
        rank: completedAttempt.rank,
      },
    };
  }

  return {
    isCompleted: false,
    attempt: null,
  };
};

module.exports = {
  startTest,
  submitAnswer,
  submitTest,
  getTestAttempt,
  getTestAttemptDetails,
  checkTestCompletion,
};


const QuizRoomAttempt = require('../models/QuizRoomAttempt');
const QuizRoom = require('../models/QuizRoom');
const TestAttempt = require('../models/TestAttempt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Start quiz room attempt
 */
const startQuizRoomAttempt = async (roomCode, userId) => {
  const quizRoom = await QuizRoom.findOne({ roomCode })
    .populate('testId')
    .populate({
      path: 'customQuestions',
      model: 'CustomQuestion',
    });

  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if user has joined the room
  const participant = quizRoom.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (!participant) {
    throw new AppError('You must join the room first. Please go to the lobby and join the room before starting the quiz.', HTTP_STATUS.FORBIDDEN);
  }

  // Check if room is active
  if (quizRoom.status !== 'active') {
    const statusMessage = quizRoom.status === 'scheduled' 
      ? 'The quiz has not started yet. Please wait for the scheduled start time.'
      : quizRoom.status === 'ended'
      ? 'This quiz room has already ended.'
      : 'The quiz room is not currently active.';
    throw new AppError(statusMessage, HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user already has an attempt for this room
  let existingRoomAttempt = await QuizRoomAttempt.findOne({
    roomId: quizRoom._id,
    userId,
  });

  if (existingRoomAttempt) {
    // Check if attempt is completed
    const testAttempt = await require('../models/TestAttempt').findById(existingRoomAttempt.attemptId);
    if (testAttempt && testAttempt.status === 'completed') {
      // User already completed this room quiz, return the attempt
      // Frontend should redirect to results
      return existingRoomAttempt;
    }
    // If attempt exists but not completed, return it to continue
    return existingRoomAttempt;
  }

  let testAttempt;

  if (quizRoom.roomType === 'platform_test') {
    // For quiz rooms, create a new test attempt regardless of platform test completion
    // Quiz room attempts are separate from platform test attempts
    if (!quizRoom.testId) {
      throw new AppError('This quiz room is configured for a platform test, but no test is assigned. Please contact the room host.', HTTP_STATUS.BAD_REQUEST);
    }
    
    // Check if user has already attempted this test in quiz mode
    // Allow quiz attempts if user has attempted in normal mode first (2nd, 3rd attempt)
    // Also allow if no attempts exist (1st attempt)
    const existingNormalAttempt = await TestAttempt.findOne({
      userId,
      testId: quizRoom.testId._id,
      quizRoomId: null, // Normal attempt
      dailyChallengeId: null,
    }).sort({ createdAt: 1 }); // Get earliest attempt

    if (existingNormalAttempt) {
      // User has attempted in normal mode first, allow quiz attempt (2nd/3rd attempt)
      // Count existing attempts to show attempt number
      const attemptCount = await TestAttempt.countDocuments({
        userId,
        testId: quizRoom.testId._id,
        dailyChallengeId: null,
      });
      // Continue to create quiz attempt - this will be attempt number (attemptCount + 1)
    } else {
      // No normal attempt exists - this will be the first attempt (in quiz mode)
      // This is allowed
    }
    
    // Create a new test attempt for quiz room
    testAttempt = await createTestAttemptForRoom(userId, quizRoom.testId._id);
  } else {
    // Create a virtual test attempt for custom questions
    // We'll create a TestAttempt-like structure but store answers differently
    try {
      testAttempt = await createCustomTestAttempt(userId, quizRoom);
    } catch (customError) {
      throw new AppError(`Failed to initialize custom quiz: ${customError.message || 'Unable to load questions for this quiz.'}`, HTTP_STATUS.BAD_REQUEST);
    }
  }

  // Create quiz room attempt - handle duplicate key error gracefully (race condition)
  try {
    const quizRoomAttempt = await QuizRoomAttempt.create({
      roomId: quizRoom._id,
      userId,
      attemptId: testAttempt._id,
      totalMarks: quizRoom.totalMarks,
    });

    // Update test attempt with quizRoomId to mark it as a quiz room attempt
    testAttempt.quizRoomId = quizRoom._id;
    await testAttempt.save();

    // Update participant with attemptId
    participant.attemptId = testAttempt._id;
    await quizRoom.save();

    return quizRoomAttempt;
  } catch (error) {
    // Handle duplicate key error (race condition - another request created the attempt)
    if (error.code === 11000 || error.message?.includes('duplicate key')) {
      // Fetch the existing attempt that was created by another request
      existingRoomAttempt = await QuizRoomAttempt.findOne({
        roomId: quizRoom._id,
        userId,
      });
      
      if (existingRoomAttempt) {
        // Update test attempt with quizRoomId if not already set
        const existingTestAttempt = await TestAttempt.findById(existingRoomAttempt.attemptId);
        if (existingTestAttempt && !existingTestAttempt.quizRoomId) {
          existingTestAttempt.quizRoomId = quizRoom._id;
          await existingTestAttempt.save();
        }
        
        // Update participant with attemptId if not already set
        if (!participant.attemptId) {
          participant.attemptId = existingRoomAttempt.attemptId;
          await quizRoom.save();
        }
        return existingRoomAttempt;
      }
    }
    // Re-throw if it's a different error
    throw error;
  }
};

/**
 * Create test attempt for quiz room (bypasses platform test completion check)
 * This allows users to take the same test multiple times in different quiz rooms
 */
const createTestAttemptForRoom = async (userId, testId) => {
  const Test = require('../models/Test');
  const Question = require('../models/Question');
  const TestAttempt = require('../models/TestAttempt');

  // Check if test exists
  const test = await Test.findById(testId).populate('examId');
  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
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

  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  // Create test attempt (for quiz room, we allow multiple attempts even if user completed it on platform)
  // Note: quizRoomId will be set after QuizRoomAttempt is created
  const testAttempt = await TestAttempt.create({
    userId,
    testId: test._id,
    examId: test.examId ? test.examId._id : null,
    answers,
    status: 'in-progress',
    totalMarks,
    startedAt: new Date(),
  });

  return testAttempt;
};

/**
 * Create custom test attempt (for custom questions)
 */
const createCustomTestAttempt = async (userId, quizRoom) => {
  // For custom questions, we create a TestAttempt-like document
  // but we'll handle it specially in the answer submission
  
  // Ensure customQuestions are populated (they should be from the populate call)
  let customQuestions = quizRoom.customQuestions;
  
  // Check if customQuestions exist
  if (!quizRoom.customQuestions || quizRoom.customQuestions.length === 0) {
    throw new AppError('This quiz room does not have any questions configured. Please contact the room host.', HTTP_STATUS.BAD_REQUEST);
  }
  
  // If first item is just an ObjectId (not populated), fetch the questions
  if (customQuestions && customQuestions.length > 0) {
    const firstQuestion = customQuestions[0];
    // Check if it's populated (has questionText) or just an ID
    if (!firstQuestion.questionText && firstQuestion.toString) {
      // Not populated, fetch them
      const CustomQuestion = require('../models/CustomQuestion');
      customQuestions = await CustomQuestion.find({ _id: { $in: quizRoom.customQuestions } }).sort({ order: 1 });
    }
  } else {
    // Try to fetch if not populated
    const CustomQuestion = require('../models/CustomQuestion');
    customQuestions = await CustomQuestion.find({ _id: { $in: quizRoom.customQuestions } }).sort({ order: 1 });
  }
  
  if (!customQuestions || customQuestions.length === 0) {
    throw new AppError('Failed to load questions for this quiz room. The questions may have been deleted. Please contact the room host.', HTTP_STATUS.BAD_REQUEST);
  }
  
  const answers = customQuestions.map((q) => ({
    questionId: q._id,
    selectedOption: null,
    isCorrect: false,
    marksObtained: 0,
    timeSpent: 0,
  }));

  // Create a special test attempt for custom questions
  // We'll use a dummy testId or handle it differently
  const TestAttempt = require('../models/TestAttempt');
  
  // Note: For custom questions, we might need to adjust this
  // For now, we'll create a TestAttempt but mark it specially
  // Note: quizRoomId will be set after QuizRoomAttempt is created
  const testAttempt = await TestAttempt.create({
    userId,
    testId: null, // Custom questions don't have a testId
    examId: null,
    answers,
    status: 'in-progress',
    totalMarks: quizRoom.totalMarks,
    startedAt: new Date(),
  });

  return testAttempt;
};

/**
 * Submit answer for quiz room
 */
const submitAnswer = async (roomCode, userId, questionId, selectedOption, timeSpent = 0) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if room is active
  if (quizRoom.status !== 'active') {
    throw new AppError('Room is not active', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if room has ended
  if (new Date() > quizRoom.endTime) {
    throw new AppError('Room has ended', HTTP_STATUS.BAD_REQUEST);
  }

  // Get quiz room attempt
  const quizRoomAttempt = await QuizRoomAttempt.findOne({
    roomId: quizRoom._id,
    userId,
  });

  if (!quizRoomAttempt) {
    throw new AppError('Attempt not found. Please start the quiz first.', HTTP_STATUS.NOT_FOUND);
  }

  // Get question (either from Test or CustomQuestion)
  let question;
  if (quizRoom.roomType === 'platform_test') {
    const Question = require('../models/Question');
    question = await Question.findById(questionId);
  } else {
    question = await require('../models/CustomQuestion').findById(questionId);
  }

  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  // Update test attempt answer
  const testAttempt = await TestAttempt.findById(quizRoomAttempt.attemptId);
  const answerIndex = testAttempt.answers.findIndex(
    a => a.questionId.toString() === questionId.toString()
  );

  if (answerIndex === -1) {
    throw new AppError('Question not found in attempt', HTTP_STATUS.NOT_FOUND);
  }

  const isCorrect = question.correctOption === selectedOption;
  
  // Get marks from question (for custom questions, use marks field; for platform tests, use marks from quizRoom)
  let marksPerQuestion;
  let negativeMarks;
  
  if (quizRoom.roomType === 'custom') {
    // Custom questions have marks and negativeMarks in the question itself
    marksPerQuestion = question.marks || quizRoom.marksPerQuestion || 1;
    negativeMarks = question.negativeMarks !== undefined ? question.negativeMarks : (quizRoom.negativeMarking || 0);
  } else {
    // Platform test questions - get from quizRoom settings
    marksPerQuestion = quizRoom.marksPerQuestion || 1;
    negativeMarks = quizRoom.negativeMarking || 0;
  }
  
  const marksObtained = isCorrect 
    ? marksPerQuestion 
    : (selectedOption ? -negativeMarks : 0);

  testAttempt.answers[answerIndex] = {
    questionId: question._id,
    selectedOption,
    isCorrect,
    marksObtained,
    timeSpent,
  };

  await testAttempt.save();

  return { isCorrect, marksObtained };
};

/**
 * Submit quiz room attempt (finalize)
 */
const submitQuizRoomAttempt = async (roomCode, userId) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  // Get quiz room attempt
  const quizRoomAttempt = await QuizRoomAttempt.findOne({
    roomId: quizRoom._id,
    userId,
  });

  if (!quizRoomAttempt) {
    throw new AppError('Attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  // Get and finalize test attempt
  const testAttempt = await TestAttempt.findById(quizRoomAttempt.attemptId);
  
  if (testAttempt.status === 'completed') {
    return quizRoomAttempt;
  }

  // Calculate final score
  let score = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedAnswers = 0;

  for (const answer of testAttempt.answers) {
    score += answer.marksObtained;
    if (answer.isCorrect) {
      correctAnswers++;
    } else if (answer.selectedOption) {
      wrongAnswers++;
    } else {
      skippedAnswers++;
    }
  }

  const totalQuestions = testAttempt.answers.length;
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const timeTaken = Math.floor((new Date() - testAttempt.startedAt) / 1000);

  // Update test attempt
  testAttempt.status = 'completed';
  testAttempt.submittedAt = new Date();
  testAttempt.score = score;
  testAttempt.correctAnswers = correctAnswers;
  testAttempt.wrongAnswers = wrongAnswers;
  testAttempt.skippedAnswers = skippedAnswers;
  testAttempt.accuracy = accuracy;
  testAttempt.timeTaken = timeTaken;
  await testAttempt.save();

  // Update quiz room attempt
  quizRoomAttempt.score = score;
  quizRoomAttempt.submittedAt = new Date();
  quizRoomAttempt.correctAnswers = correctAnswers;
  quizRoomAttempt.wrongAnswers = wrongAnswers;
  quizRoomAttempt.skippedAnswers = skippedAnswers;
  quizRoomAttempt.accuracy = accuracy;
  quizRoomAttempt.timeTaken = timeTaken;
  await quizRoomAttempt.save();

  // Update rank
  await updateRank(quizRoom._id, userId);

  // Update room stats
  const participant = quizRoom.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  if (participant) {
    participant.score = score;
    participant.attemptId = testAttempt._id;
    await quizRoom.save();
  }

  return quizRoomAttempt;
};

/**
 * Update rank for a user in a room
 */
const updateRank = async (roomId, userId) => {
  const allAttempts = await QuizRoomAttempt.find({ roomId })
    .sort({ score: -1, timeTaken: 1 });

  const userIndex = allAttempts.findIndex(
    a => a.userId.toString() === userId.toString()
  );

  if (userIndex !== -1) {
    const rank = userIndex + 1;
    await QuizRoomAttempt.findOneAndUpdate(
      { roomId, userId },
      { rank }
    );
  }
};

/**
 * Get user's attempt in a room
 */
const getUserAttempt = async (roomCode, userId) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  const quizRoomAttempt = await QuizRoomAttempt.findOne({
    roomId: quizRoom._id,
    userId,
  })
    .populate('userId', 'name email');

  if (!quizRoomAttempt) {
    throw new AppError('Attempt not found', HTTP_STATUS.NOT_FOUND);
  }

  // Get attemptId as string (handle both ObjectId and string cases)
  const attemptIdString = quizRoomAttempt.attemptId 
    ? (quizRoomAttempt.attemptId._id ? quizRoomAttempt.attemptId._id.toString() : quizRoomAttempt.attemptId.toString())
    : null;

  // Check if the underlying test attempt is completed
  if (attemptIdString) {
    const TestAttempt = require('../models/TestAttempt');
    const testAttempt = await TestAttempt.findById(attemptIdString);
    if (testAttempt && testAttempt.status === 'completed') {
      // Mark quiz room attempt as submitted if test attempt is completed
      if (!quizRoomAttempt.submittedAt) {
        quizRoomAttempt.submittedAt = testAttempt.submittedAt || new Date();
        await quizRoomAttempt.save();
      }
    }
  }

  // Convert to plain object and ensure attemptId is always a string
  const attemptData = quizRoomAttempt.toObject();
  attemptData.attemptId = attemptIdString;

  return attemptData;
};

/**
 * Auto-submit all pending attempts when room ends
 */
const autoSubmitAllAttempts = async (roomCode) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    return;
  }

  const pendingAttempts = await QuizRoomAttempt.find({
    roomId: quizRoom._id,
    submittedAt: null,
  });

  for (const attempt of pendingAttempts) {
    try {
      await submitQuizRoomAttempt(roomCode, attempt.userId);
    } catch (error) {
      console.error(`Error auto-submitting attempt ${attempt._id}:`, error);
    }
  }
};

module.exports = {
  startQuizRoomAttempt,
  submitAnswer,
  submitQuizRoomAttempt,
  getUserAttempt,
  autoSubmitAllAttempts,
  updateRank,
};


const QuizRoom = require('../models/QuizRoom');
const Test = require('../models/Test');
const Question = require('../models/Question');
const CustomQuestion = require('../models/CustomQuestion');
const TestAttempt = require('../models/TestAttempt');
const QuizRoomAttempt = require('../models/QuizRoomAttempt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const { getSocketIO } = require('../utils/cronJob');

/**
 * Create a quiz room (Platform Test Mode)
 */
const createPlatformTestRoom = async (roomData) => {
  const { hostId, testId, startTime, duration } = roomData;

  // Verify test exists
  const test = await Test.findById(testId);
  if (!test) {
    throw new AppError('The selected test could not be found. Please choose a different test.', HTTP_STATUS.NOT_FOUND, 'TEST_NOT_FOUND');
  }

  // Always use test's duration from database, ignore duration from request
  const testDuration = test.duration;
  if (!testDuration || testDuration < 1) {
    throw new AppError('The selected test does not have a valid duration. Please contact support.', HTTP_STATUS.BAD_REQUEST, 'INVALID_TEST_DURATION');
  }

  // Calculate end time using test's duration
  const start = new Date(startTime);
  const end = new Date(start.getTime() + testDuration * 60 * 1000);

  // Check if start time is in future
  const now = new Date();
  if (start < now) {
    throw new AppError('Quiz start time must be in the future. Please select a later date and time.', HTTP_STATUS.BAD_REQUEST, 'INVALID_START_TIME');
  }

  // Generate room code
  const roomCode = await QuizRoom.generateRoomCode();

  // Get questions count for total marks calculation
  const questions = await Question.find({ testId, isActive: true });
  if (questions.length === 0) {
    throw new AppError('The selected test has no questions available. Please choose a different test.', HTTP_STATUS.BAD_REQUEST, 'NO_QUESTIONS');
  }

  // Use test-level marks instead of question-level marks
  const correctMark = test.correctMark || 1;
  const negativeMarking = test.negativeMark || 0;
  const totalMarks = correctMark * questions.length;
  const marksPerQuestion = correctMark;

  const quizRoom = await QuizRoom.create({
    roomCode,
    hostId,
    roomType: 'platform_test',
    testId,
    title: test.testName,
    description: test.description,
    startTime: start,
    endTime: end,
    duration: testDuration, // Always use test's duration from database
    totalMarks,
    marksPerQuestion,
    negativeMarking,
    status: 'scheduled',
    participants: [{
      userId: hostId,
      joinedAt: new Date(),
    }],
  });

  return quizRoom;
};

/**
 * Create a custom quiz room
 */
const createCustomRoom = async (roomData) => {
  const { hostId, title, description, startTime, duration, questions, marksPerQuestion, negativeMarking } = roomData;

  // Validate questions
  if (!questions || questions.length === 0) {
    throw new AppError('At least one question is required to create a quiz room.', HTTP_STATUS.BAD_REQUEST, 'NO_QUESTIONS');
  }

  // Calculate end time
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  // Check if start time is in future
  const now = new Date();
  if (start < now) {
    throw new AppError('Quiz start time must be in the future. Please select a later date and time.', HTTP_STATUS.BAD_REQUEST, 'INVALID_START_TIME');
  }

  // Generate room code
  const roomCode = await QuizRoom.generateRoomCode();
  
  // Create room first to get roomId
  const quizRoom = await QuizRoom.create({
    roomCode: roomCode,
    hostId,
    roomType: 'custom',
    customQuestions: [],
    title,
    description,
    startTime: start,
    endTime: end,
    duration,
    totalMarks: questions.length * marksPerQuestion,
    marksPerQuestion,
    negativeMarking: negativeMarking || 0,
    status: 'scheduled',
    participants: [{
      userId: hostId,
      joinedAt: new Date(),
    }],
  });

  // Create custom questions
  const customQuestions = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const customQ = await CustomQuestion.create({
      createdBy: hostId,
      roomId: quizRoom._id,
      questionText: q.questionText,
      questionTextHindi: q.questionTextHindi || '',
      options: q.options,
      optionsHindi: q.optionsHindi || {},
      correctOption: q.correctOption,
      explanation: q.explanation || '',
      explanationHindi: q.explanationHindi || '',
      marks: marksPerQuestion,
      negativeMarks: negativeMarking || 0,
      order: i + 1,
    });
    customQuestions.push(customQ._id);
  }

  // Update room with custom questions
  quizRoom.customQuestions = customQuestions;
  await quizRoom.save();

  return quizRoom;
};

/**
 * Join a quiz room
 */
const joinRoom = async (roomCode, userId) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    throw new AppError('Quiz room not found. Please check the room code and try again.', HTTP_STATUS.NOT_FOUND, 'ROOM_NOT_FOUND');
  }

  // Check if room has ended
  const now = new Date();
  if (quizRoom.status === 'ended' || now > quizRoom.endTime) {
    throw new AppError('This quiz room has already ended. You cannot join it anymore.', HTTP_STATUS.BAD_REQUEST, 'ROOM_ENDED');
  }

  // Check if already joined
  const existingParticipant = quizRoom.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (existingParticipant) {
    return { quizRoom, isNewJoin: false, participant: existingParticipant };
  }

  // Check max participants
  if (quizRoom.participants.length >= quizRoom.settings.maxParticipants) {
    throw new AppError(`This quiz room is full (${quizRoom.settings.maxParticipants} participants). Please try another room.`, HTTP_STATUS.BAD_REQUEST, 'ROOM_FULL');
  }

  // Check if late join is allowed (reuse 'now' from line 161)
  if (!quizRoom.settings.allowLateJoin && now > quizRoom.startTime && quizRoom.status === 'active') {
    throw new AppError('Late joining is not allowed for this quiz room. Please join before the quiz starts.', HTTP_STATUS.BAD_REQUEST, 'LATE_JOIN_NOT_ALLOWED');
  }

  // Add participant
  quizRoom.participants.push({
    userId,
    joinedAt: new Date(),
  });

  quizRoom.stats.totalJoined += 1;
  await quizRoom.save();

  // Broadcast participant update to all users in the room via socket
  try {
    const io = getSocketIO && typeof getSocketIO === 'function' ? getSocketIO() : null;
    if (io && typeof io.to === 'function' && typeof io.emit === 'function') {
      // Populate participants before emitting
      const updatedRoom = await QuizRoom.findOne({ roomCode })
        .populate('participants.userId', 'name email profilePicture');
      
      // Emit room-update with full participant data
      io.to(roomCode).emit('room-update', {
        participantsCount: updatedRoom.participants.length,
        status: updatedRoom.status,
        roomCode,
        participants: updatedRoom.participants.map(p => ({
          userId: p.userId?._id || p.userId,
          userName: p.userId?.name || p.userId?.email || null,
          userEmail: p.userId?.email || null,
          joinedAt: p.joinedAt,
        })),
      });
      
      // Also emit participant-update with full details (for real-time updates)
      io.to(roomCode).emit('participant-update', {
        roomCode,
        participantsCount: updatedRoom.participants.length,
        participants: updatedRoom.participants.map(p => ({
          userId: p.userId?._id || p.userId,
          userName: p.userId?.name || p.userId?.email || null,
          userEmail: p.userId?.email || null,
          joinedAt: p.joinedAt,
        })),
        message: 'A new participant joined',
      });
    }
  } catch (socketError) {
    // If socket is not available, just log and continue (don't block the join)
    console.error('Error broadcasting participant update via socket:', socketError);
  }

  return { quizRoom, isNewJoin: true };
};

/**
 * Get room details
 */
const getRoomDetails = async (roomCode) => {
  const quizRoom = await QuizRoom.findOne({ roomCode })
    .populate('hostId', 'name email')
    .populate('testId')
    .populate('customQuestions')
    .populate('participants.userId', 'name email');

  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  return quizRoom;
};

/**
 * Get room leaderboard with pagination
 */
const getRoomLeaderboard = async (roomId, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  
  // Get total count for pagination
  const total = await QuizRoomAttempt.countDocuments({ roomId });
  
  // Get paginated leaderboard
  const leaderboard = await QuizRoomAttempt.find({ roomId })
    .populate('userId', 'name email profilePicture')
    .sort({ score: -1, timeTaken: 1 })
    .skip(skip)
    .limit(limit);

  // Add ranks (based on overall position, not page position)
  leaderboard.forEach((attempt, index) => {
    attempt.rank = skip + index + 1;
  });

  return {
    leaderboard,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Start room (change status to active)
 */
const startRoom = async (roomCode, hostId) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  if (quizRoom.hostId.toString() !== hostId.toString()) {
    throw new AppError('Only host can start the room', HTTP_STATUS.FORBIDDEN);
  }

  if (quizRoom.status !== 'scheduled') {
    throw new AppError('Room can only be started if it is scheduled', HTTP_STATUS.BAD_REQUEST);
  }

  quizRoom.status = 'active';
  await quizRoom.save();

  return quizRoom;
};

/**
 * End room (auto or manual)
 */
const endRoom = async (roomCode) => {
  const quizRoom = await QuizRoom.findOne({ roomCode });
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  if (quizRoom.status === 'ended') {
    return quizRoom;
  }

  quizRoom.status = 'ended';
  await quizRoom.save();

  // Calculate and update stats
  await updateRoomStats(quizRoom._id);

  return quizRoom;
};

/**
 * Update room statistics
 */
const updateRoomStats = async (roomId) => {
  const attempts = await QuizRoomAttempt.find({ roomId });
  
  if (attempts.length === 0) {
    return;
  }

  const totalCompleted = attempts.length;
  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const averageScore = totalScore / totalCompleted;

  await QuizRoom.findByIdAndUpdate(roomId, {
    'stats.totalCompleted': totalCompleted,
    'stats.averageScore': averageScore,
  });
};

/**
 * Get user's rooms (created or joined) with pagination
 */
const getUserRooms = async (userId, type = 'all', page = 1, limit = 20) => {
  let query = {};
  
  if (type === 'created') {
    query = { hostId: userId };
  } else if (type === 'joined') {
    query = { 'participants.userId': userId, hostId: { $ne: userId } };
  } else {
    query = {
      $or: [
        { hostId: userId },
        { 'participants.userId': userId }
      ]
    };
  }

  const skip = (page - 1) * limit;
  
  // Get total count for pagination
  const total = await QuizRoom.countDocuments(query);

  const rooms = await QuizRoom.find(query)
    .populate('hostId', 'name email')
    .populate('testId', 'testName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    rooms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get active rooms (for discovery) with pagination
 */
const getActiveRooms = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const now = new Date();
  
  const query = {
    status: { $in: ['scheduled', 'active'] },
    startTime: { $gte: now },
  };
  
  // Get total count for pagination
  const total = await QuizRoom.countDocuments(query);

  const rooms = await QuizRoom.find(query)
    .populate('hostId', 'name email')
    .populate('testId', 'testName')
    .sort({ startTime: 1 })
    .skip(skip)
    .limit(limit);

  return {
    rooms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    },
  };
};

module.exports = {
  createPlatformTestRoom,
  createCustomRoom,
  joinRoom,
  getRoomDetails,
  getRoomLeaderboard,
  startRoom,
  endRoom,
  updateRoomStats,
  getUserRooms,
  getActiveRooms,
};


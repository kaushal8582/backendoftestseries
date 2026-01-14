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
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  // Always use test's duration from database, ignore duration from request
  const testDuration = test.duration;
  if (!testDuration || testDuration < 1) {
    throw new AppError('Test does not have a valid duration', HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate end time using test's duration
  const start = new Date(startTime);
  const end = new Date(start.getTime() + testDuration * 60 * 1000);

  // Check if start time is in future
  if (start < new Date()) {
    throw new AppError('Start time must be in the future', HTTP_STATUS.BAD_REQUEST);
  }

  // Generate room code
  const roomCode = await QuizRoom.generateRoomCode();

  // Get questions for total marks calculation
  const questions = await Question.find({ testId, isActive: true });
  if (questions.length === 0) {
    throw new AppError('Test has no questions', HTTP_STATUS.BAD_REQUEST);
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const marksPerQuestion = questions.length > 0 ? totalMarks / questions.length : 0;
  const negativeMarking = questions[0]?.negativeMarks || 0;

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
    throw new AppError('At least one question is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate end time
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  // Check if start time is in future
  if (start < new Date()) {
    throw new AppError('Start time must be in the future', HTTP_STATUS.BAD_REQUEST);
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
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if room has ended
  if (quizRoom.status === 'ended' || new Date() > quizRoom.endTime) {
    throw new AppError('Room has ended', HTTP_STATUS.BAD_REQUEST);
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
    throw new AppError('Room is full', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if late join is allowed
  const now = new Date();
  if (!quizRoom.settings.allowLateJoin && now > quizRoom.startTime && quizRoom.status === 'active') {
    throw new AppError('Late join is not allowed for this room', HTTP_STATUS.BAD_REQUEST);
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
    if (io) {
    // Populate participants before emitting
    const updatedRoom = await QuizRoom.findOne({ roomCode })
      .populate('participants.userId', 'name email profilePicture');
    
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
    
    // Also emit participant-update with full details
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
 * Get room leaderboard
 */
const getRoomLeaderboard = async (roomId) => {
  const leaderboard = await QuizRoomAttempt.find({ roomId })
    .populate('userId', 'name email profilePicture')
    .sort({ score: -1, timeTaken: 1 })
    .limit(100);

  // Add ranks
  leaderboard.forEach((attempt, index) => {
    attempt.rank = index + 1;
  });

  return leaderboard;
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
 * Get user's rooms (created or joined)
 */
const getUserRooms = async (userId, type = 'all') => {
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

  const rooms = await QuizRoom.find(query)
    .populate('hostId', 'name email')
    .populate('testId', 'testName')
    .sort({ createdAt: -1 })
    .limit(50);

  return rooms;
};

/**
 * Get active rooms (for discovery)
 */
const getActiveRooms = async (limit = 20) => {
  const rooms = await QuizRoom.find({
    status: { $in: ['scheduled', 'active'] },
    startTime: { $gte: new Date() },
  })
    .populate('hostId', 'name email')
    .populate('testId', 'testName')
    .sort({ startTime: 1 })
    .limit(limit);

  return rooms;
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


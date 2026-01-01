const quizRoomService = require('../services/quizRoomService');
const quizRoomAttemptService = require('../services/quizRoomAttemptService');
const customQuestionService = require('../services/customQuestionService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/quiz-rooms
 * @desc    Create a quiz room
 * @access  Private
 */
const createRoom = async (req, res, next) => {
  try {
    const { roomType } = req.body;
    
    let room;
    if (roomType === 'platform_test') {
      room = await quizRoomService.createPlatformTestRoom({
        ...req.body,
        hostId: req.user._id,
      });
    } else if (roomType === 'custom') {
      room = await quizRoomService.createCustomRoom({
        ...req.body,
        hostId: req.user._id,
      });
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'roomType must be either "platform_test" or "custom"',
      });
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Quiz room created successfully',
      data: { room },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/quiz-rooms/join
 * @desc    Join a quiz room
 * @access  Private
 */
const joinRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'roomCode is required',
      });
    }

    const result = await quizRoomService.joinRoom(roomCode, req.user._id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.isNewJoin ? 'Joined room successfully' : 'Already in room',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quiz-rooms/:roomCode
 * @desc    Get room details
 * @access  Private
 */
const getRoomDetails = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await quizRoomService.getRoomDetails(roomCode);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { room },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quiz-rooms/:roomId/leaderboard
 * @desc    Get room leaderboard
 * @access  Private
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const leaderboard = await quizRoomService.getRoomLeaderboard(roomId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/quiz-rooms/:roomCode/start
 * @desc    Start a quiz room (host only)
 * @access  Private
 */
const startRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await quizRoomService.startRoom(roomCode, req.user._id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Room started successfully',
      data: { room },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/quiz-rooms/:roomCode/start-attempt
 * @desc    Start quiz room attempt
 * @access  Private
 */
const startAttempt = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const attempt = await quizRoomAttemptService.startQuizRoomAttempt(roomCode, req.user._id);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Quiz started successfully',
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/quiz-rooms/:roomCode/answer
 * @desc    Submit answer in quiz room
 * @access  Private
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const { questionId, selectedOption, timeSpent } = req.body;

    if (!questionId || !selectedOption) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'questionId and selectedOption are required',
      });
    }

    const result = await quizRoomAttemptService.submitAnswer(
      roomCode,
      req.user._id,
      questionId,
      selectedOption,
      timeSpent || 0
    );
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Answer submitted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/quiz-rooms/:roomCode/submit
 * @desc    Submit quiz room attempt
 * @access  Private
 */
const submitAttempt = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const attempt = await quizRoomAttemptService.submitQuizRoomAttempt(roomCode, req.user._id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quiz-rooms/:roomCode/attempt
 * @desc    Get user's attempt in a room
 * @access  Private
 */
const getUserAttempt = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const attempt = await quizRoomAttemptService.getUserAttempt(roomCode, req.user._id);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quiz-rooms/:roomId/questions
 * @desc    Get questions for a room
 * @access  Private
 */
const getRoomQuestions = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const questions = await customQuestionService.getRoomQuestions(roomId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { questions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quiz-rooms/user/rooms
 * @desc    Get user's rooms (created or joined)
 * @access  Private
 */
const getUserRooms = async (req, res, next) => {
  try {
    const { type } = req.query; // 'all', 'created', 'joined'
    const rooms = await quizRoomService.getUserRooms(req.user._id, type || 'all');
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/quiz-rooms/active/list
 * @desc    Get active rooms (for discovery)
 * @access  Private
 */
const getActiveRooms = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const rooms = await quizRoomService.getActiveRooms(limit ? parseInt(limit) : 20);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getRoomDetails,
  getLeaderboard,
  startRoom,
  startAttempt,
  submitAnswer,
  submitAttempt,
  getUserAttempt,
  getRoomQuestions,
  getUserRooms,
  getActiveRooms,
};


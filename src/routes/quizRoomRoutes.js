const express = require('express');
const router = express.Router();
const quizRoomController = require('../controllers/quizRoomController');
const { authenticate } = require('../middlewares/auth');

// Create room
router.post('/', authenticate, quizRoomController.createRoom);

// Join room
router.post('/join', authenticate, quizRoomController.joinRoom);

// Get active rooms (discovery)
router.get('/active/list', authenticate, quizRoomController.getActiveRooms);

// Get user's rooms
router.get('/user/rooms', authenticate, quizRoomController.getUserRooms);

// Get room details
router.get('/:roomCode', authenticate, quizRoomController.getRoomDetails);

// Get room questions
router.get('/:roomId/questions', authenticate, quizRoomController.getRoomQuestions);

// Get leaderboard
router.get('/:roomId/leaderboard', authenticate, quizRoomController.getLeaderboard);

// Start room (host only)
router.post('/:roomCode/start', authenticate, quizRoomController.startRoom);

// Start attempt
router.post('/:roomCode/start-attempt', authenticate, quizRoomController.startAttempt);

// Submit answer
router.post('/:roomCode/answer', authenticate, quizRoomController.submitAnswer);

// Submit attempt
router.post('/:roomCode/submit', authenticate, quizRoomController.submitAttempt);

// Get user attempt
router.get('/:roomCode/attempt', authenticate, quizRoomController.getUserAttempt);

module.exports = router;


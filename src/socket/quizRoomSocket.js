const QuizRoom = require('../models/QuizRoom');
const QuizRoomAttempt = require('../models/QuizRoomAttempt');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a quiz room
    socket.on('join-quiz-room', async (data) => {
      const { roomCode, userId } = data;
      
      try {
        const quizRoom = await QuizRoom.findOne({ roomCode });
        if (!quizRoom) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        socket.join(roomCode);
        
        // Emit room update to all in room
        io.to(roomCode).emit('room-update', {
          participantsCount: quizRoom.participants.length,
          status: quizRoom.status,
          roomCode,
        });

        socket.emit('joined-room', {
          roomCode,
          room: quizRoom,
        });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: error.message || 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-quiz-room', (roomCode) => {
      socket.leave(roomCode);
      socket.emit('left-room', { roomCode });
    });

    // Request leaderboard
    socket.on('request-leaderboard', async (data) => {
      const { roomCode } = data;
      
      try {
        const quizRoom = await QuizRoom.findOne({ roomCode });
        if (!quizRoom) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const leaderboard = await QuizRoomAttempt.find({ roomId: quizRoom._id })
          .populate('userId', 'name email profilePicture')
          .sort({ score: -1, timeTaken: 1 })
          .limit(50);

        socket.emit('leaderboard-update', {
          roomCode,
          leaderboard,
        });
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        socket.emit('error', { message: error.message || 'Failed to fetch leaderboard' });
      }
    });

    // Broadcast leaderboard update (when someone submits)
    socket.on('broadcast-leaderboard', async (data) => {
      const { roomCode } = data;
      
      try {
        const quizRoom = await QuizRoom.findOne({ roomCode });
        if (!quizRoom) {
          return;
        }

        const leaderboard = await QuizRoomAttempt.find({ roomId: quizRoom._id })
          .populate('userId', 'name email profilePicture')
          .sort({ score: -1, timeTaken: 1 })
          .limit(50);

        // Broadcast to all in room
        io.to(roomCode).emit('leaderboard-update', {
          roomCode,
          leaderboard,
        });
      } catch (error) {
        console.error('Error broadcasting leaderboard:', error);
      }
    });

    // Room status update
    socket.on('request-room-status', async (data) => {
      const { roomCode } = data;
      
      try {
        const quizRoom = await QuizRoom.findOne({ roomCode });
        if (!quizRoom) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const now = new Date();
        const timeRemaining = Math.max(0, Math.floor((quizRoom.endTime - now) / 1000));

        socket.emit('room-status', {
          roomCode,
          status: quizRoom.status,
          startTime: quizRoom.startTime,
          endTime: quizRoom.endTime,
          timeRemaining,
          participantsCount: quizRoom.participants.length,
        });
      } catch (error) {
        console.error('Error fetching room status:', error);
        socket.emit('error', { message: error.message || 'Failed to fetch room status' });
      }
    });

    // Participant joined notification
    socket.on('participant-joined', async (data) => {
      const { roomCode } = data;
      
      try {
        const quizRoom = await QuizRoom.findOne({ roomCode });
        if (!quizRoom) {
          return;
        }

        // Broadcast to all except sender
        socket.to(roomCode).emit('participant-update', {
          roomCode,
          participantsCount: quizRoom.participants.length,
          message: 'A new participant joined',
        });
      } catch (error) {
        console.error('Error broadcasting participant update:', error);
      }
    });

    // Answer submitted notification (for live updates)
    socket.on('answer-submitted', async (data) => {
      const { roomCode, userId } = data;
      
      try {
        // Broadcast to all in room (for live leaderboard updates)
        socket.to(roomCode).emit('answer-update', {
          roomCode,
          userId,
          message: 'Someone submitted an answer',
        });
      } catch (error) {
        console.error('Error broadcasting answer update:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Helper function to broadcast room updates
  const broadcastRoomUpdate = async (roomCode) => {
    try {
      const quizRoom = await QuizRoom.findOne({ roomCode });
      if (!quizRoom) {
        return;
      }

      io.to(roomCode).emit('room-update', {
        participantsCount: quizRoom.participants.length,
        status: quizRoom.status,
        roomCode,
      });
    } catch (error) {
      console.error('Error broadcasting room update:', error);
    }
  };

  // Export helper for use in other files
  module.exports.broadcastRoomUpdate = broadcastRoomUpdate;
};


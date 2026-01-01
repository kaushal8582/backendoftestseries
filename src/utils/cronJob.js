const cron = require('node-cron');
const axios = require('axios');
const QuizRoom = require('../models/QuizRoom');
const quizRoomService = require('../services/quizRoomService');
const quizRoomAttemptService = require('../services/quizRoomAttemptService');

const BACKEND_URL = 'https://backendoftestseries.onrender.com';

/**
 * Health check cron job that runs every 5 minutes
 * This keeps the backend server alive on free hosting services like Render
 */
const startHealthCheckCron = () => {
  // Run every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Health check: Pinging backend...`);
      
      const response = await axios.get(`${BACKEND_URL}/health`, {
        timeout: 10000, // 10 seconds timeout
      });
      
      if (response.status === 200) {
        console.log(`[${new Date().toISOString()}] Health check: ✅ Backend is healthy`);
      } else {
        console.warn(`[${new Date().toISOString()}] Health check: ⚠️ Backend returned status ${response.status}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Health check: ❌ Error pinging backend:`, error.message);
      
      // Log more details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error:', error);
      }
    }
  });
  
  console.log('✅ Health check cron job started (runs every 5 minutes)');
};

// Store io instance for cron jobs
let ioInstance = null;

/**
 * Set socket.io instance for cron jobs
 */
const setSocketIO = (io) => {
  ioInstance = io;
};

/**
 * Auto-start quiz rooms cron job
 * Runs every minute to check and start rooms when their start time arrives
 */
const startQuizRoomAutoStartCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find rooms that should be started (scheduled and startTime has passed)
      const roomsToStart = await QuizRoom.find({
        status: 'scheduled',
        startTime: { $lte: now },
      });

      for (const room of roomsToStart) {
        try {
          // Auto-start the room (without hostId check for cron)
          room.status = 'active';
          await room.save();
          
          // Emit socket event to notify all participants
          if (ioInstance) {
            // Emit to the room (socket room name is roomCode)
            ioInstance.to(room.roomCode).emit('room-status', {
              roomCode: room.roomCode,
              status: 'active',
              startTime: room.startTime,
              endTime: room.endTime,
            });
            
            // Also emit room-update
            ioInstance.to(room.roomCode).emit('room-update', {
              participantsCount: room.participants.length,
              status: 'active',
              roomCode: room.roomCode,
            });
          }
          
          console.log(`[${new Date().toISOString()}] Auto-started room: ${room.roomCode}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error auto-starting room ${room.roomCode}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in quiz room auto-start cron:`, error.message);
    }
  });
  
  console.log('✅ Quiz room auto-start cron job started (runs every minute)');
};

/**
 * Auto-end quiz rooms cron job
 * Runs every minute to check and end rooms that have passed their end time
 */
const startQuizRoomAutoEndCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find rooms that should be ended
      const roomsToEnd = await QuizRoom.find({
        status: { $in: ['scheduled', 'active'] },
        endTime: { $lte: now },
      });

      for (const room of roomsToEnd) {
        try {
          // Auto-submit all pending attempts
          await quizRoomAttemptService.autoSubmitAllAttempts(room.roomCode);
          
          // End the room
          await quizRoomService.endRoom(room.roomCode);
          
          console.log(`[${new Date().toISOString()}] Auto-ended room: ${room.roomCode}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error auto-ending room ${room.roomCode}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in quiz room auto-end cron:`, error.message);
    }
  });
  
  console.log('✅ Quiz room auto-end cron job started (runs every minute)');
};

module.exports = { 
  startHealthCheckCron,
  startQuizRoomAutoStartCron,
  startQuizRoomAutoEndCron,
  setSocketIO,
};


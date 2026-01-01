require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const { startHealthCheckCron, startQuizRoomAutoStartCron, startQuizRoomAutoEndCron, setSocketIO } = require('./utils/cronJob');
const { initializeFirebase } = require('./utils/fcm');

// Connect to database
connectDB();

// Initialize Firebase Admin SDK for FCM
initializeFirebase();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Initialize quiz room socket handlers
require('./socket/quizRoomSocket')(io);

// Set socket.io instance for cron jobs
setSocketIO(io);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`WebSocket server initialized`);
  
  // Start health check cron job
  startHealthCheckCron();
  
  // Start quiz room auto-start cron job
  startQuizRoomAutoStartCron();
  
  // Start quiz room auto-end cron job
  startQuizRoomAutoEndCron();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});


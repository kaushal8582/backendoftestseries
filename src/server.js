require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const { startHealthCheckCron } = require('./utils/cronJob');
const { initializeFirebase } = require('./utils/fcm');

// Connect to database
connectDB();

// Initialize Firebase Admin SDK for FCM
initializeFirebase();

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  
  // Start health check cron job
  startHealthCheckCron();
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


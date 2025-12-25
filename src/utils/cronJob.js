const cron = require('node-cron');
const axios = require('axios');

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

module.exports = { startHealthCheckCron };


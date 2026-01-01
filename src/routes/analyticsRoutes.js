const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/auth');

// Track event
router.post('/track', authenticate, analyticsController.trackEvent);

// Get user analytics
router.get('/user', authenticate, analyticsController.getUserAnalytics);

// Get app-wide analytics (admin only)
router.get('/app', authenticate, analyticsController.getAppAnalytics);

// Get test leaderboard
router.get('/test/:testId/leaderboard', authenticate, analyticsController.getTestLeaderboard);

module.exports = router;

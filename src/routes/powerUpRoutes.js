const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const powerUpController = require('../controllers/powerUpController');

/**
 * @route   GET /api/power-ups
 * @desc    Get all available power-ups
 * @access  Private
 */
router.get('/', authenticate, powerUpController.getPowerUps);

/**
 * @route   POST /api/power-ups/use
 * @desc    Use a power-up during test
 * @access  Private
 */
router.post('/use', authenticate, powerUpController.usePowerUp);

/**
 * @route   POST /api/power-ups/activate-boost
 * @desc    Activate a boost before test
 * @access  Private
 */
router.post('/activate-boost', authenticate, powerUpController.activateBoost);

/**
 * @route   GET /api/power-ups/attempt/:attemptId
 * @desc    Get power-ups used in an attempt
 * @access  Private
 */
router.get('/attempt/:attemptId', authenticate, powerUpController.getAttemptPowerUps);

module.exports = router;


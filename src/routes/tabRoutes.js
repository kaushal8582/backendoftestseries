const express = require('express');
const router = express.Router();
const tabController = require('../controllers/tabController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   POST /api/tabs
 * @desc    Create a new tab
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  tabController.createTab
);

/**
 * @route   GET /api/tabs
 * @desc    Get all tabs (filtered by examId)
 * @access  Public
 */
router.get('/', tabController.getTabs);

/**
 * @route   GET /api/tabs/:id
 * @desc    Get tab by ID
 * @access  Public
 */
router.get('/:id', tabController.getTabById);

/**
 * @route   PUT /api/tabs/:id
 * @desc    Update tab
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  tabController.updateTab
);

/**
 * @route   DELETE /api/tabs/:id
 * @desc    Delete tab
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  tabController.deleteTab
);

module.exports = router;


const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const categoryMasteryController = require('../controllers/categoryMasteryController');

/**
 * @route   GET /api/category-mastery
 * @desc    Get all category masteries for user
 * @access  Private
 */
router.get('/', authenticate, categoryMasteryController.getUserMasteries);

/**
 * @route   GET /api/category-mastery/:categoryId
 * @desc    Get user's mastery for a category
 * @access  Private
 */
router.get('/:categoryId', authenticate, categoryMasteryController.getCategoryMastery);

/**
 * @route   GET /api/category-mastery/:categoryId/skill-tree
 * @desc    Get skill tree for a category
 * @access  Private
 */
router.get('/:categoryId/skill-tree', authenticate, categoryMasteryController.getCategorySkillTree);

module.exports = router;


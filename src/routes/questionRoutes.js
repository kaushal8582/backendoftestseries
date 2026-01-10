const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const upload = require('../middlewares/multer');
const {
  validateCreateQuestion,
  validateUpdateQuestion,
} = require('../validations/question');

/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  upload.fields([
    { name: 'questionImage', maxCount: 1 },
    { name: 'optionImageA', maxCount: 1 },
    { name: 'optionImageB', maxCount: 1 },
    { name: 'optionImageC', maxCount: 1 },
    { name: 'optionImageD', maxCount: 1 },
    { name: 'optionImageHindiA', maxCount: 1 },
    { name: 'optionImageHindiB', maxCount: 1 },
    { name: 'optionImageHindiC', maxCount: 1 },
    { name: 'optionImageHindiD', maxCount: 1 },
    { name: 'explanationImageEnglish', maxCount: 1 },
    { name: 'explanationImageHindi', maxCount: 1 },
    { name: 'solutionImageEnglish', maxCount: 1 },
    { name: 'solutionImageHindi', maxCount: 1 },
  ]),
  validateCreateQuestion,
  questionController.createQuestion
);

/**
 * @route   POST /api/questions/bulk
 * @desc    Bulk create questions
 * @access  Private (Admin only)
 */
router.post(
  '/bulk',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  questionController.bulkCreateQuestions
);

/**
 * @route   GET /api/questions
 * @desc    Get all questions (filtered by testId)
 * @access  Public (answers hidden unless admin)
 */
router.get('/', authenticate, questionController.getQuestions);

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Public (answers hidden unless admin)
 */
router.get('/:id', authenticate, questionController.getQuestionById);

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  upload.fields([
    { name: 'questionImage', maxCount: 1 },
    { name: 'optionImageA', maxCount: 1 },
    { name: 'optionImageB', maxCount: 1 },
    { name: 'optionImageC', maxCount: 1 },
    { name: 'optionImageD', maxCount: 1 },
    { name: 'optionImageHindiA', maxCount: 1 },
    { name: 'optionImageHindiB', maxCount: 1 },
    { name: 'optionImageHindiC', maxCount: 1 },
    { name: 'optionImageHindiD', maxCount: 1 },
    { name: 'explanationImageEnglish', maxCount: 1 },
    { name: 'explanationImageHindi', maxCount: 1 },
    { name: 'solutionImageEnglish', maxCount: 1 },
    { name: 'solutionImageHindi', maxCount: 1 },
  ]),
  validateUpdateQuestion,
  questionController.updateQuestion
);

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  questionController.deleteQuestion
);

module.exports = router;


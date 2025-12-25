const Question = require('../models/Question');
const Test = require('../models/Test');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create a new question
 * @param {Object} questionData - Question data
 * @returns {Promise<Object>} - Created question
 */
const createQuestion = async (questionData) => {
  // Verify test exists
  const test = await Test.findById(questionData.testId);
  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if order already exists for this test
  const existingQuestion = await Question.findOne({
    testId: questionData.testId,
    order: questionData.order,
  });

  if (existingQuestion) {
    throw new AppError('Question with this order already exists for this test', HTTP_STATUS.CONFLICT);
  }

  const question = await Question.create(questionData);

  return question;
};

/**
 * Get all questions for a test
 * @param {string} testId - Test ID
 * @param {Object} queryParams - Query parameters (page, limit, includeAnswers, language)
 * @returns {Promise<Object>} - Questions with pagination
 */
const getQuestions = async (testId, queryParams = {}) => {
  const { page = 1, limit = 50, includeAnswers = false, language = 'english' } = queryParams;
  const skip = (page - 1) * limit;

  const query = { testId, isActive: true };

  let questions = await Question.find(query)
    .populate('testId', 'testName totalMarks duration')
    .sort({ order: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Transform questions based on language
  questions = questions.map((q) => {
    const questionObj = q.toObject();
    
    // Use Hindi content if language is hindi and available
    if (language === 'hindi') {
      if (questionObj.questionTextHindi) {
        questionObj.questionText = questionObj.questionTextHindi;
      }
      if (questionObj.optionsHindi && questionObj.optionsHindi.A) {
        questionObj.options = questionObj.optionsHindi;
      }
      if (questionObj.explanationHindi) {
        questionObj.explanation = questionObj.explanationHindi;
      }
      if (questionObj.solution && questionObj.solution.hindi) {
        questionObj.solution = questionObj.solution.hindi;
      } else if (questionObj.solution && questionObj.solution.english) {
        questionObj.solution = questionObj.solution.english;
      }
    } else {
      // English - use solution.english if available, otherwise fallback
      if (questionObj.solution && questionObj.solution.english) {
        questionObj.solution = questionObj.solution.english;
      } else if (questionObj.solution && questionObj.solution.hindi) {
        questionObj.solution = questionObj.solution.hindi;
      }
    }
    
    // Remove correct option if answers should not be included
    if (!includeAnswers) {
      delete questionObj.correctOption;
    }
    
    // Clean up - remove language-specific fields that are not needed
    delete questionObj.questionTextHindi;
    delete questionObj.optionsHindi;
    delete questionObj.explanationHindi;
    
    return questionObj;
  });

  const total = await Question.countDocuments(query);

  // Get sections info for this test
  const allQuestions = await Question.find({ testId, isActive: true })
    .select('section order')
    .sort({ order: 1 });
  
  const sectionsMap = new Map();
  allQuestions.forEach((q) => {
    const section = q.section || 'General';
    if (!sectionsMap.has(section)) {
      sectionsMap.set(section, { name: section, startOrder: q.order, endOrder: q.order, count: 0 });
    }
    const sectionInfo = sectionsMap.get(section);
    sectionInfo.endOrder = q.order;
    sectionInfo.count += 1;
  });

  const sections = Array.from(sectionsMap.values()).sort((a, b) => a.startOrder - b.startOrder);

  return {
    questions,
    sections,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get question by ID
 * @param {string} questionId - Question ID
 * @param {boolean} includeAnswer - Whether to include correct answer
 * @returns {Promise<Object>} - Question details
 */
const getQuestionById = async (questionId, includeAnswer = false) => {
  const question = await Question.findById(questionId)
    .populate('testId', 'testName totalMarks duration');

  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  const questionObj = question.toObject();

  if (!includeAnswer) {
    delete questionObj.correctOption;
  }

  return questionObj;
};

/**
 * Update question
 * @param {string} questionId - Question ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated question
 */
const updateQuestion = async (questionId, updateData) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  // If order is being updated, check for conflicts
  if (updateData.order && updateData.order !== question.order) {
    const existingQuestion = await Question.findOne({
      testId: question.testId,
      order: updateData.order,
      _id: { $ne: questionId },
    });

    if (existingQuestion) {
      throw new AppError('Question with this order already exists for this test', HTTP_STATUS.CONFLICT);
    }
  }

  Object.keys(updateData).forEach((key) => {
    question[key] = updateData[key];
  });

  await question.save();

  return question;
};

/**
 * Delete question (soft delete)
 * @param {string} questionId - Question ID
 * @returns {Promise<void>}
 */
const deleteQuestion = async (questionId) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  question.isActive = false;
  await question.save();
};

/**
 * Bulk create questions
 * @param {Array} questionsData - Array of question data
 * @returns {Promise<Array>} - Created questions
 */
const bulkCreateQuestions = async (questionsData) => {
  // Verify all questions belong to the same test
  const testIds = [...new Set(questionsData.map((q) => q.testId))];
  if (testIds.length > 1) {
    throw new AppError('All questions must belong to the same test', HTTP_STATUS.BAD_REQUEST);
  }

  // Verify test exists
  const test = await Test.findById(testIds[0]);
  if (!test) {
    throw new AppError('Test not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check for duplicate orders
  const orders = questionsData.map((q) => q.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    throw new AppError('Duplicate question orders found', HTTP_STATUS.BAD_REQUEST);
  }

  // Check if any order already exists
  const existingQuestions = await Question.find({
    testId: testIds[0],
    order: { $in: orders },
  });

  if (existingQuestions.length > 0) {
    throw new AppError('Some question orders already exist for this test', HTTP_STATUS.CONFLICT);
  }

  const questions = await Question.insertMany(questionsData);

  return questions;
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
};


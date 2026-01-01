const CustomQuestion = require('../models/CustomQuestion');
const QuizRoom = require('../models/QuizRoom');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create custom questions for a room
 */
const createCustomQuestions = async (roomId, questions, hostId) => {
  const quizRoom = await QuizRoom.findById(roomId);
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  if (quizRoom.hostId.toString() !== hostId.toString()) {
    throw new AppError('Only room host can add questions', HTTP_STATUS.FORBIDDEN);
  }

  if (quizRoom.roomType !== 'custom') {
    throw new AppError('Questions can only be added to custom rooms', HTTP_STATUS.BAD_REQUEST);
  }

  const customQuestions = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const customQ = await CustomQuestion.create({
      createdBy: hostId,
      roomId: quizRoom._id,
      questionText: q.questionText,
      questionTextHindi: q.questionTextHindi || '',
      options: q.options,
      optionsHindi: q.optionsHindi || {},
      correctOption: q.correctOption,
      explanation: q.explanation || '',
      explanationHindi: q.explanationHindi || '',
      marks: q.marks || quizRoom.marksPerQuestion,
      negativeMarks: q.negativeMarks || quizRoom.negativeMarking,
      order: i + 1,
    });
    customQuestions.push(customQ._id);
  }

  // Update room with custom questions
  quizRoom.customQuestions = customQuestions;
  await quizRoom.save();

  return customQuestions;
};

/**
 * Get questions for a room
 */
const getRoomQuestions = async (roomId) => {
  const quizRoom = await QuizRoom.findById(roomId);
  
  if (!quizRoom) {
    throw new AppError('Room not found', HTTP_STATUS.NOT_FOUND);
  }

  if (quizRoom.roomType === 'custom') {
    const questions = await CustomQuestion.find({ roomId })
      .sort({ order: 1 });
    return questions;
  } else {
    // For platform_test, get questions from Test
    const Question = require('../models/Question');
    const questions = await Question.find({ 
      testId: quizRoom.testId,
      isActive: true 
    }).sort({ order: 1 });
    return questions;
  }
};

/**
 * Update a custom question
 */
const updateCustomQuestion = async (questionId, updateData, userId) => {
  const question = await CustomQuestion.findById(questionId);
  
  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  if (question.createdBy.toString() !== userId.toString()) {
    throw new AppError('Only question creator can update it', HTTP_STATUS.FORBIDDEN);
  }

  // Check if room has started
  const quizRoom = await QuizRoom.findById(question.roomId);
  if (quizRoom.status !== 'scheduled') {
    throw new AppError('Cannot update question after room has started', HTTP_STATUS.BAD_REQUEST);
  }

  Object.assign(question, updateData);
  await question.save();

  return question;
};

/**
 * Delete a custom question
 */
const deleteCustomQuestion = async (questionId, userId) => {
  const question = await CustomQuestion.findById(questionId);
  
  if (!question) {
    throw new AppError('Question not found', HTTP_STATUS.NOT_FOUND);
  }

  if (question.createdBy.toString() !== userId.toString()) {
    throw new AppError('Only question creator can delete it', HTTP_STATUS.FORBIDDEN);
  }

  // Check if room has started
  const quizRoom = await QuizRoom.findById(question.roomId);
  if (quizRoom.status !== 'scheduled') {
    throw new AppError('Cannot delete question after room has started', HTTP_STATUS.BAD_REQUEST);
  }

  await CustomQuestion.findByIdAndDelete(questionId);

  // Update room's customQuestions array
  quizRoom.customQuestions = quizRoom.customQuestions.filter(
    q => q.toString() !== questionId.toString()
  );
  await quizRoom.save();

  return { success: true };
};

module.exports = {
  createCustomQuestions,
  getRoomQuestions,
  updateCustomQuestion,
  deleteCustomQuestion,
};


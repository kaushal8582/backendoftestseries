const questionService = require('../services/questionService');
const { HTTP_STATUS } = require('../config/constants');
const { uploadOnCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

/**
 * @route   POST /api/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
const createQuestion = async (req, res, next) => {
  try {
    // Parse nested objects from FormData
    const questionData = {};
    
    // Copy all simple fields
    Object.keys(req.body).forEach(key => {
      if (!key.includes('[') && !key.includes(']')) {
        questionData[key] = req.body[key];
      }
    });
    
    // Parse nested options
    if (req.body['options[A]'] || req.body['options[B]'] || req.body['options[C]'] || req.body['options[D]']) {
      questionData.options = {
        A: req.body['options[A]'] || '',
        B: req.body['options[B]'] || '',
        C: req.body['options[C]'] || '',
        D: req.body['options[D]'] || '',
      };
    } else if (req.body.options) {
      questionData.options = req.body.options;
    }
    
    // Parse nested optionsHindi
    if (req.body['optionsHindi[A]'] || req.body['optionsHindi[B]'] || req.body['optionsHindi[C]'] || req.body['optionsHindi[D]']) {
      questionData.optionsHindi = {
        A: req.body['optionsHindi[A]'] || '',
        B: req.body['optionsHindi[B]'] || '',
        C: req.body['optionsHindi[C]'] || '',
        D: req.body['optionsHindi[D]'] || '',
      };
    } else if (req.body.optionsHindi) {
      questionData.optionsHindi = req.body.optionsHindi;
    }
    
    // Parse nested solution
    if (req.body['solution[english]'] || req.body['solution[hindi]']) {
      questionData.solution = {
        english: req.body['solution[english]'] || '',
        hindi: req.body['solution[hindi]'] || '',
      };
    } else if (req.body.solution) {
      questionData.solution = req.body.solution;
    }
    
    // Handle image uploads
    // Question image
    if (req.files && req.files.questionImage && req.files.questionImage[0]) {
      const cloudinaryResponse = await uploadOnCloudinary(req.files.questionImage[0].path);
      if (cloudinaryResponse) {
        questionData.questionImage = cloudinaryResponse.secure_url;
      }
    }
    
    // English option images
    if (req.files) {
      const optionKeys = ['A', 'B', 'C', 'D'];
      questionData.optionImages = {};
      
      for (const key of optionKeys) {
        const fieldName = `optionImage${key}`;
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const cloudinaryResponse = await uploadOnCloudinary(req.files[fieldName][0].path);
          if (cloudinaryResponse) {
            questionData.optionImages[key] = cloudinaryResponse.secure_url;
          }
        }
      }
      
      // Hindi option images
      questionData.optionImagesHindi = {};
      const reuseEnglishImages = req.body.reuseEnglishImages === 'true' || req.body.reuseEnglishImages === true;
      
      if (reuseEnglishImages) {
        // Copy English images to Hindi
        questionData.optionImagesHindi = { ...questionData.optionImages };
      } else {
        // Upload Hindi images separately
        for (const key of optionKeys) {
          const fieldName = `optionImageHindi${key}`;
          if (req.files[fieldName] && req.files[fieldName][0]) {
            const cloudinaryResponse = await uploadOnCloudinary(req.files[fieldName][0].path);
            if (cloudinaryResponse) {
              questionData.optionImagesHindi[key] = cloudinaryResponse.secure_url;
            }
          }
        }
      }
      
      // Explanation and Solution images
      const reuseEnglishResultImages = req.body.reuseEnglishResultImages === 'true' || req.body.reuseEnglishResultImages === true;
      
      // Explanation image (English)
      if (req.files.explanationImageEnglish && req.files.explanationImageEnglish[0]) {
        const cloudinaryResponse = await uploadOnCloudinary(req.files.explanationImageEnglish[0].path);
        if (cloudinaryResponse) {
          questionData.explanationImageEnglish = cloudinaryResponse.secure_url;
        }
      }
      
      // Solution image (English)
      if (req.files.solutionImageEnglish && req.files.solutionImageEnglish[0]) {
        const cloudinaryResponse = await uploadOnCloudinary(req.files.solutionImageEnglish[0].path);
        if (cloudinaryResponse) {
          questionData.solutionImageEnglish = cloudinaryResponse.secure_url;
        }
      }
      
      // Explanation and Solution images (Hindi)
      if (reuseEnglishResultImages) {
        // Copy English images to Hindi
        if (questionData.explanationImageEnglish) {
          questionData.explanationImageHindi = questionData.explanationImageEnglish;
        }
        if (questionData.solutionImageEnglish) {
          questionData.solutionImageHindi = questionData.solutionImageEnglish;
        }
      } else {
        // Upload Hindi images separately
        if (req.files.explanationImageHindi && req.files.explanationImageHindi[0]) {
          const cloudinaryResponse = await uploadOnCloudinary(req.files.explanationImageHindi[0].path);
          if (cloudinaryResponse) {
            questionData.explanationImageHindi = cloudinaryResponse.secure_url;
          }
        }
        if (req.files.solutionImageHindi && req.files.solutionImageHindi[0]) {
          const cloudinaryResponse = await uploadOnCloudinary(req.files.solutionImageHindi[0].path);
          if (cloudinaryResponse) {
            questionData.solutionImageHindi = cloudinaryResponse.secure_url;
          }
        }
      }
    }
    
    const question = await questionService.createQuestion(questionData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Question created successfully',
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/questions/bulk
 * @desc    Bulk create questions
 * @access  Private (Admin only)
 */
const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Questions array is required',
      });
    }

    const createdQuestions = await questionService.bulkCreateQuestions(questions);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      data: {
        questions: createdQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/questions
 * @desc    Get all questions (filtered by testId)
 * @access  Public (answers hidden unless admin)
 */
const getQuestions = async (req, res, next) => {
  try {
    if (!req.query.testId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'testId query parameter is required',
      });
    }

    // Only admins can see answers
    const includeAnswers = req.user && req.user.role === 'ADMIN';
    const language = req.query.language || 'english'; // Default to english
    const result = await questionService.getQuestions(req.query.testId, {
      ...req.query,
      includeAnswers,
      language,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Public (answers hidden unless admin)
 */
const getQuestionById = async (req, res, next) => {
  try {
    // Only admins can see answers
    const includeAnswer = req.user && req.user.role === 'ADMIN';
    const question = await questionService.getQuestionById(req.params.id, includeAnswer);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
const updateQuestion = async (req, res, next) => {
  try {
    // Parse nested objects from FormData
    const questionData = {};
    
    // Copy all simple fields
    Object.keys(req.body).forEach(key => {
      if (!key.includes('[') && !key.includes(']')) {
        questionData[key] = req.body[key];
      }
    });
    
    // Parse nested options
    if (req.body['options[A]'] || req.body['options[B]'] || req.body['options[C]'] || req.body['options[D]']) {
      questionData.options = {
        A: req.body['options[A]'] || '',
        B: req.body['options[B]'] || '',
        C: req.body['options[C]'] || '',
        D: req.body['options[D]'] || '',
      };
    } else if (req.body.options) {
      questionData.options = req.body.options;
    }
    
    // Parse nested optionsHindi
    if (req.body['optionsHindi[A]'] || req.body['optionsHindi[B]'] || req.body['optionsHindi[C]'] || req.body['optionsHindi[D]']) {
      questionData.optionsHindi = {
        A: req.body['optionsHindi[A]'] || '',
        B: req.body['optionsHindi[B]'] || '',
        C: req.body['optionsHindi[C]'] || '',
        D: req.body['optionsHindi[D]'] || '',
      };
    } else if (req.body.optionsHindi) {
      questionData.optionsHindi = req.body.optionsHindi;
    }
    
    // Parse nested solution
    if (req.body['solution[english]'] || req.body['solution[hindi]']) {
      questionData.solution = {
        english: req.body['solution[english]'] || '',
        hindi: req.body['solution[hindi]'] || '',
      };
    } else if (req.body.solution) {
      questionData.solution = req.body.solution;
    }
    
    // Handle image uploads
    // Question image
    if (req.files && req.files.questionImage && req.files.questionImage[0]) {
      const cloudinaryResponse = await uploadOnCloudinary(req.files.questionImage[0].path);
      if (cloudinaryResponse) {
        questionData.questionImage = cloudinaryResponse.secure_url;
      }
    }
    
    // Get existing question to preserve existing data
    const existingQuestion = await questionService.getQuestionById(req.params.id, true);
    
    // English option images
    if (req.files) {
      const optionKeys = ['A', 'B', 'C', 'D'];
      // Start with existing images
      questionData.optionImages = existingQuestion.optionImages || {};
      
      for (const key of optionKeys) {
        const fieldName = `optionImage${key}`;
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const cloudinaryResponse = await uploadOnCloudinary(req.files[fieldName][0].path);
          if (cloudinaryResponse) {
            questionData.optionImages[key] = cloudinaryResponse.secure_url;
          }
        }
      }
      
      // Hindi option images
      questionData.optionImagesHindi = existingQuestion.optionImagesHindi || {};
      const reuseEnglishImages = req.body.reuseEnglishImages === 'true' || req.body.reuseEnglishImages === true;
      
      if (reuseEnglishImages) {
        // Copy English images to Hindi
        questionData.optionImagesHindi = { ...questionData.optionImages };
      } else {
        // Upload Hindi images separately or keep existing
        for (const key of optionKeys) {
          const fieldName = `optionImageHindi${key}`;
          if (req.files[fieldName] && req.files[fieldName][0]) {
            const cloudinaryResponse = await uploadOnCloudinary(req.files[fieldName][0].path);
            if (cloudinaryResponse) {
              questionData.optionImagesHindi[key] = cloudinaryResponse.secure_url;
            }
          }
        }
      }
      
      // Explanation and Solution images
      const reuseEnglishResultImages = req.body.reuseEnglishResultImages === 'true' || req.body.reuseEnglishResultImages === true;
      
      // Preserve existing images if not being updated
      questionData.explanationImageEnglish = existingQuestion.explanationImageEnglish;
      questionData.solutionImageEnglish = existingQuestion.solutionImageEnglish;
      questionData.explanationImageHindi = existingQuestion.explanationImageHindi;
      questionData.solutionImageHindi = existingQuestion.solutionImageHindi;
      
      // Explanation image (English)
      if (req.files.explanationImageEnglish && req.files.explanationImageEnglish[0]) {
        const cloudinaryResponse = await uploadOnCloudinary(req.files.explanationImageEnglish[0].path);
        if (cloudinaryResponse) {
          questionData.explanationImageEnglish = cloudinaryResponse.secure_url;
        }
      }
      
      // Solution image (English)
      if (req.files.solutionImageEnglish && req.files.solutionImageEnglish[0]) {
        const cloudinaryResponse = await uploadOnCloudinary(req.files.solutionImageEnglish[0].path);
        if (cloudinaryResponse) {
          questionData.solutionImageEnglish = cloudinaryResponse.secure_url;
        }
      }
      
      // Explanation and Solution images (Hindi)
      if (reuseEnglishResultImages) {
        // Copy English images to Hindi
        if (questionData.explanationImageEnglish) {
          questionData.explanationImageHindi = questionData.explanationImageEnglish;
        }
        if (questionData.solutionImageEnglish) {
          questionData.solutionImageHindi = questionData.solutionImageEnglish;
        }
      } else {
        // Upload Hindi images separately
        if (req.files.explanationImageHindi && req.files.explanationImageHindi[0]) {
          const cloudinaryResponse = await uploadOnCloudinary(req.files.explanationImageHindi[0].path);
          if (cloudinaryResponse) {
            questionData.explanationImageHindi = cloudinaryResponse.secure_url;
          }
        }
        if (req.files.solutionImageHindi && req.files.solutionImageHindi[0]) {
          const cloudinaryResponse = await uploadOnCloudinary(req.files.solutionImageHindi[0].path);
          if (cloudinaryResponse) {
            questionData.solutionImageHindi = cloudinaryResponse.secure_url;
          }
        }
      }
    } else {
      // No new files, preserve existing images
      questionData.optionImages = existingQuestion.optionImages || {};
      questionData.optionImagesHindi = existingQuestion.optionImagesHindi || {};
      questionData.explanationImageEnglish = existingQuestion.explanationImageEnglish;
      questionData.solutionImageEnglish = existingQuestion.solutionImageEnglish;
      questionData.explanationImageHindi = existingQuestion.explanationImageHindi;
      questionData.solutionImageHindi = existingQuestion.solutionImageHindi;
      
      // Handle reuseEnglishImages flag even without new files
      const reuseEnglishImages = req.body.reuseEnglishImages === 'true' || req.body.reuseEnglishImages === true;
      if (reuseEnglishImages) {
        questionData.optionImagesHindi = { ...questionData.optionImages };
      }
      
      // Handle reuseEnglishResultImages flag even without new files
      const reuseEnglishResultImages = req.body.reuseEnglishResultImages === 'true' || req.body.reuseEnglishResultImages === true;
      if (reuseEnglishResultImages) {
        if (questionData.explanationImageEnglish) {
          questionData.explanationImageHindi = questionData.explanationImageEnglish;
        }
        if (questionData.solutionImageEnglish) {
          questionData.solutionImageHindi = questionData.solutionImageEnglish;
        }
      }
    }
    
    const question = await questionService.updateQuestion(req.params.id, questionData);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Question updated successfully',
      data: {
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Private (Admin only)
 */
const deleteQuestion = async (req, res, next) => {
  try {
    await questionService.deleteQuestion(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};


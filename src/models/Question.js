const mongoose = require('mongoose');
const { QUESTION_TYPES } = require('../config/constants');

const questionSchema = new mongoose.Schema(
  {
    // English content
    questionText: {
      type: String,
      required: [true, 'Please provide question text in English'],
      trim: true,
    },
    questionTextHindi: {
      type: String,
      trim: true,
    },
    questionImage: {
      type: String, // URL from Cloudinary
      trim: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QUESTION_TYPES),
      default: QUESTION_TYPES.MCQ,
    },
    // English options
    options: {
      A: {
        type: String,
        required: [true, 'Please provide option A in English'],
        trim: true,
      },
      B: {
        type: String,
        required: [true, 'Please provide option B in English'],
        trim: true,
      },
      C: {
        type: String,
        required: [true, 'Please provide option C in English'],
        trim: true,
      },
      D: {
        type: String,
        required: [true, 'Please provide option D in English'],
        trim: true,
      },
    },
    // English option images
    optionImages: {
      A: {
        type: String, // URL from Cloudinary
        trim: true,
      },
      B: {
        type: String,
        trim: true,
      },
      C: {
        type: String,
        trim: true,
      },
      D: {
        type: String,
        trim: true,
      },
    },
    // Hindi options
    optionsHindi: {
      A: {
        type: String,
        trim: true,
      },
      B: {
        type: String,
        trim: true,
      },
      C: {
        type: String,
        trim: true,
      },
      D: {
        type: String,
        trim: true,
      },
    },
    // Hindi option images
    optionImagesHindi: {
      A: {
        type: String, // URL from Cloudinary
        trim: true,
      },
      B: {
        type: String,
        trim: true,
      },
      C: {
        type: String,
        trim: true,
      },
      D: {
        type: String,
        trim: true,
      },
    },
    correctOption: {
      type: String,
      required: [true, 'Please provide correct option'],
      enum: ['A', 'B', 'C', 'D'],
      uppercase: true,
    },
    // English explanation
    explanation: {
      type: String,
      trim: true,
    },
    // Hindi explanation
    explanationHindi: {
      type: String,
      trim: true,
    },
    // Explanation images
    explanationImageEnglish: {
      type: String, // URL from Cloudinary
      trim: true,
    },
    explanationImageHindi: {
      type: String, // URL from Cloudinary
      trim: true,
    },
    // Solution (detailed solution for both languages)
    solution: {
      english: {
        type: String,
        trim: true,
      },
      hindi: {
        type: String,
        trim: true,
      },
    },
    // Solution images
    solutionImageEnglish: {
      type: String, // URL from Cloudinary
      trim: true,
    },
    solutionImageHindi: {
      type: String, // URL from Cloudinary
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, 'Please provide marks'],
      default: 1,
      min: [0, 'Marks cannot be negative'],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be negative'],
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: [true, 'Please provide test ID'],
    },
    order: {
      type: Number,
      required: [true, 'Please provide question order'],
      min: [1, 'Order must be at least 1'],
    },
    section: {
      type: String,
      trim: true,
      default: 'General',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
questionSchema.index({ testId: 1, order: 1 });
questionSchema.index({ testId: 1, isActive: 1 });
questionSchema.index({ testId: 1, section: 1 });

// Compound index for unique question order within test
questionSchema.index({ testId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);


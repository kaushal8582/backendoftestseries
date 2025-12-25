const mongoose = require('mongoose');
const { USER_ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Performance tracking
    totalTestsAttempted: {
      type: Number,
      default: 0,
    },
    totalTestsCompleted: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    // Test performance summary (for analytics)
    performanceSummary: {
      totalScore: { type: Number, default: 0 },
      totalQuestionsAttempted: { type: Number, default: 0 },
      totalCorrectAnswers: { type: Number, default: 0 },
      totalWrongAnswers: { type: Number, default: 0 },
      totalSkipped: { type: Number, default: 0 },
    },
    // Study Streak tracking
    studyStreak: {
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActivityDate: { type: Date, default: null },
      dailyGoal: { type: Number, default: 5 }, // Default: 5 tests per day
    },
    // Exam preference for personalized recommendations
    examPreference: {
      examIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }],
      primaryExamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);


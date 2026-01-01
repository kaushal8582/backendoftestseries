const mongoose = require('mongoose');

const quizRoomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roomType: {
      type: String,
      enum: ['custom', 'platform_test'],
      required: true,
    },
    // For platform_test mode
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      default: null,
    },
    // For custom mode
    customQuestions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomQuestion',
    }],
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: [1, 'Duration must be at least 1 minute'],
    },
    totalMarks: {
      type: Number,
      required: true,
      min: [0, 'Total marks cannot be negative'],
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      min: [0, 'Marks per question cannot be negative'],
    },
    negativeMarking: {
      type: Number,
      default: 0,
      min: [0, 'Negative marking cannot be negative'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended'],
      default: 'scheduled',
      index: true,
    },
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestAttempt',
        default: null,
      },
      score: {
        type: Number,
        default: 0,
      },
      rank: {
        type: Number,
        default: null,
      },
    }],
    settings: {
      allowLateJoin: {
        type: Boolean,
        default: true,
      },
      showLeaderboard: {
        type: Boolean,
        default: true,
      },
      showAnswersAfterEnd: {
        type: Boolean,
        default: true,
      },
      maxParticipants: {
        type: Number,
        default: 100,
        min: [2, 'Minimum 2 participants required'],
        max: [1000, 'Maximum 1000 participants allowed'],
      },
    },
    // Statistics
    stats: {
      totalJoined: {
        type: Number,
        default: 0,
      },
      totalCompleted: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique room code
quizRoomSchema.statics.generateRoomCode = async function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let exists = true;
  
  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    exists = await this.findOne({ roomCode: code });
  }
  
  return code;
};

// Indexes
quizRoomSchema.index({ roomCode: 1 });
quizRoomSchema.index({ hostId: 1, status: 1 });
quizRoomSchema.index({ status: 1, startTime: 1 });
quizRoomSchema.index({ endTime: 1 });

module.exports = mongoose.model('QuizRoom', quizRoomSchema);


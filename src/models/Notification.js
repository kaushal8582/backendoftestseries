const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    deepLink: {
      type: String,
      default: null,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Recipient selection
    recipientType: {
      type: String,
      enum: ['all', 'specific', 'plan', 'category', 'exam'],
      required: true,
    },
    recipients: {
      // For 'specific' - array of user IDs
      userIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      // For 'plan' - subscription plan type
      planType: String,
      // For 'category' - category IDs
      categoryIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      }],
      // For 'exam' - exam IDs
      examIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
      }],
    },
    // Scheduling
    scheduledFor: {
      type: Date,
      default: null,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'monthly'],
        message: '{VALUE} is not a valid enum value for path `{PATH}`',
      },
      default: undefined,
      required: false,
      // Only validate if value is provided
      validate: {
        validator: function(v) {
          // If value is null, undefined, or empty string, it's valid (field is optional)
          if (v === null || v === undefined || v === '') {
            return true;
          }
          // Otherwise, must be one of the enum values
          return ['daily', 'weekly', 'monthly'].includes(v);
        },
        message: 'recurringPattern must be one of: daily, weekly, monthly',
      },
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
      default: 'draft',
    },
    // Delivery tracking
    deliveryStats: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      totalOpened: { type: Number, default: 0 },
      totalClicked: { type: Number, default: 0 },
    },
    // Metadata
    sentAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ createdBy: 1 });
notificationSchema.index({ recipientType: 1 });

module.exports = mongoose.model('Notification', notificationSchema);


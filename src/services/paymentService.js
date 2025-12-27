const Payment = require('../models/Payment');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const { createOrder } = require('../utils/razorpay');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const subscriptionService = require('./subscriptionService');
const promoCodeService = require('./promoCodeService');
const referralService = require('./referralService');

/**
 * Create payment order (initiate payment)
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Payment order details
 */
const createPaymentOrder = async (paymentData) => {
  const { userId, planId, promoCode, referralCode } = paymentData;

  // Get plan
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  // Calculate base amount (in paise)
  let amount = Math.round(plan.price * 100);
  let discountAmount = 0;
  let promoCodeId = null;
  let referralDiscount = 0;

  // Apply promo code if provided
  if (promoCode) {
    const promoResult = await promoCodeService.applyPromoCode(promoCode, userId, amount);
    discountAmount = promoResult.discount;
    promoCodeId = promoResult.promoCodeId;
    amount = promoResult.finalAmount;
  }

  // Apply referral code if provided
  if (referralCode) {
    const referralResult = await referralService.applyReferralCode(referralCode, userId, amount);
    referralDiscount = referralResult.discount;
    amount = referralResult.finalAmount;
  }

  // Get user's payment attempt count for this plan
  const previousPayments = await Payment.find({
    userId,
    subscriptionPlanId: planId,
  }).sort({ createdAt: -1 });

  const attemptNumber = previousPayments.length + 1;

  // Create payment record
  const payment = await Payment.create({
    userId,
    subscriptionPlanId: planId,
    amount: plan.price,
    finalAmount: amount / 100, // Convert back to rupees
    discountAmount: discountAmount / 100,
    referralDiscount: referralDiscount / 100,
    promoCodeId,
    referralCode,
    paymentStatus: 'initiated',
    paymentInitiatedAt: new Date(),
    attemptNumber,
  });

  // Create Razorpay order
  const razorpayOrder = await createOrder(amount, 'INR', {
    receipt: `receipt_${payment._id}`,
    notes: {
      userId: userId.toString(),
      planId: planId.toString(),
      paymentId: payment._id.toString(),
    },
  });

  // Update payment with Razorpay order ID
  payment.razorpayOrderId = razorpayOrder.id;
  await payment.save();

  return {
    payment,
    razorpayOrder: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    },
  };
};

/**
 * Track payment click (user clicked on payment button)
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Updated payment
 */
const trackPaymentClick = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  payment.paymentStatus = 'clicked';
  payment.paymentClickedAt = new Date();
  await payment.save();

  return payment;
};

/**
 * Verify and process payment (webhook)
 * @param {Object} webhookData - Razorpay webhook data
 * @returns {Promise<Object>} - Updated payment and subscription
 */
const verifyAndProcessPayment = async (webhookData) => {
  const { order_id, payment_id, signature, status } = webhookData;

  // Find payment by Razorpay order ID
  const payment = await Payment.findOne({ razorpayOrderId: order_id });
  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  // Update payment with Razorpay details
  payment.razorpayPaymentId = payment_id;
  payment.razorpaySignature = signature;
  payment.webhookData = webhookData;

  if (status === 'captured' || status === 'authorized') {
    // Payment successful
    payment.paymentStatus = 'success';
    payment.paymentCompletedAt = new Date();

    // Create subscription
    const subscription = await subscriptionService.createSubscription({
      userId: payment.userId,
      planId: payment.subscriptionPlanId,
      paymentId: payment._id,
      isTrial: false,
      promoCodeId: payment.promoCodeId,
      referralCode: payment.referralCode,
    });

    payment.subscriptionId = subscription._id;
    await payment.save();

    // Process referral if applicable
    if (payment.referralCode) {
      await referralService.processReferral(payment.userId, payment.referralCode, payment._id);
    }

    return { payment, subscription };
  } else if (status === 'failed') {
    // Payment failed
    payment.paymentStatus = 'failed';
    payment.paymentFailedAt = new Date();
    payment.failureReason = webhookData.error_description || 'Payment failed';
    await payment.save();

    return { payment, subscription: null };
  }

  return { payment, subscription: null };
};

/**
 * Get payment history for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Payment history
 */
const getPaymentHistory = async (userId) => {
  const payments = await Payment.find({ userId })
    .populate('subscriptionPlanId', 'name planType durationLabel price')
    .populate('promoCodeId', 'code name discountType discountValue')
    .sort({ createdAt: -1 });

  return payments;
};

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} - Payment details
 */
const getPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate('userId', 'name email')
    .populate('subscriptionPlanId')
    .populate('promoCodeId')
    .populate('subscriptionId');

  if (!payment) {
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  return payment;
};

/**
 * Get all payments (admin)
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Payments with pagination
 */
const getAllPayments = async (filters = {}) => {
  const { page = 1, limit = 20, userId, status, startDate, endDate } = filters;
  const skip = (page - 1) * limit;

  const query = {};
  if (userId) query.userId = userId;
  if (status) query.paymentStatus = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const payments = await Payment.find(query)
    .populate('userId', 'name email phone')
    .populate('subscriptionPlanId', 'name planType durationLabel price')
    .populate('promoCodeId', 'code name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payment.countDocuments(query);

  return {
    payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createPaymentOrder,
  trackPaymentClick,
  verifyAndProcessPayment,
  getPaymentHistory,
  getPaymentById,
  getAllPayments,
};


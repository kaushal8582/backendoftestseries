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
const { sendPaymentReceipt } = require('../utils/email');

/**
 * Create payment order (initiate payment)
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Payment order details
 */
const createPaymentOrder = async (paymentData) => {
  const { userId, planId, promoCode, referralCode, coinsToRedeem } = paymentData;

  // Get plan
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', HTTP_STATUS.NOT_FOUND);
  }

  // Get user to check coins balance
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Calculate base amount (in paise)
  let amount = Math.round(plan.price * 100);
  let discountAmount = 0;
  let promoCodeId = null;
  let referralDiscount = 0;
  let coinsDiscount = 0;
  let coinsUsed = 0;

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

  // Apply coins redeem if provided
  // 1000 coins = 1 rupee, max 30% of subscription amount
  if (coinsToRedeem && coinsToRedeem > 0) {
    const userCoins = user.gamification?.coins || 0;
    const maxCoinsDiscount = Math.floor((amount * 30) / 100); // 30% of amount in paise
    const maxCoinsCanUse = Math.floor(maxCoinsDiscount / 10); // 1000 coins = 10 paise (1 rupee = 100 paise, so 1000 coins = 100 paise = 10 paise per 100 coins)
    
    // Calculate: coinsToRedeem * 10 paise (since 1000 coins = 100 paise = 1 rupee)
    // But coinsToRedeem is in coins, so we need to convert: coinsToRedeem coins = (coinsToRedeem / 1000) * 100 paise
    const coinsDiscountInPaise = Math.floor((coinsToRedeem / 1000) * 100);
    
    // Validate: user has enough coins and discount doesn't exceed 30%
    if (coinsToRedeem > userCoins) {
      throw new AppError(`Insufficient coins. You have ${userCoins} coins, but trying to redeem ${coinsToRedeem} coins.`, HTTP_STATUS.BAD_REQUEST);
    }
    
    if (coinsDiscountInPaise > maxCoinsDiscount) {
      throw new AppError(`Coins discount cannot exceed 30% of subscription amount. Maximum coins you can use: ${Math.floor(maxCoinsDiscount / 10) * 100}.`, HTTP_STATUS.BAD_REQUEST);
    }
    
    coinsDiscount = coinsDiscountInPaise;
    coinsUsed = coinsToRedeem;
    amount = Math.max(0, amount - coinsDiscount); // Ensure amount doesn't go negative
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
    coinsDiscount: coinsDiscount / 100,
    coinsUsed: coinsUsed || 0,
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
  // Razorpay sends webhook data in nested structure
  // Extract payment data from payload
  let paymentEntity = null;
  let order_id = null;
  let payment_id = null;
  let status = null;
  let signature = null;

  // Handle different webhook event structures
  if (webhookData.payload && webhookData.payload.payment && webhookData.payload.payment.entity) {
    // Structure: { payload: { payment: { entity: {...} } } }
    paymentEntity = webhookData.payload.payment.entity;
    order_id = paymentEntity.order_id;
    payment_id = paymentEntity.id;
    status = paymentEntity.status;
    signature = webhookData.payload.payment.entity.signature || null;
  } else if (webhookData.entity) {
    // Direct entity structure (fallback)
    paymentEntity = webhookData.entity;
    order_id = paymentEntity.order_id;
    payment_id = paymentEntity.id;
    status = paymentEntity.status;
    signature = paymentEntity.signature || null;
  } else {
    // Legacy structure (direct fields)
    order_id = webhookData.order_id;
    payment_id = webhookData.payment_id;
    status = webhookData.status;
    signature = webhookData.signature || null;
  }

  console.log('💰 [PAYMENT SERVICE] Processing payment webhook:', {
    order_id,
    payment_id,
    status,
    event: webhookData.event,
  });

  if (!order_id) {
    console.error('💰 [PAYMENT SERVICE] Missing order_id in webhook data');
    console.error('💰 [PAYMENT SERVICE] Webhook structure:', JSON.stringify(webhookData, null, 2));
    throw new AppError('Missing order_id in webhook data', HTTP_STATUS.BAD_REQUEST);
  }

  // Find payment by Razorpay order ID
  const payment = await Payment.findOne({ razorpayOrderId: order_id });
  if (!payment) {
    console.error('💰 [PAYMENT SERVICE] Payment not found for order_id:', order_id);
    // Log recent payments for debugging
    const recentPayments = await Payment.find({}).select('razorpayOrderId createdAt').sort({ createdAt: -1 }).limit(5);
    console.error('💰 [PAYMENT SERVICE] Recent payments in DB:', recentPayments.map(p => ({
      orderId: p.razorpayOrderId,
      createdAt: p.createdAt
    })));
    throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
  }

  console.log('💰 [PAYMENT SERVICE] Payment found:', {
    paymentId: payment._id,
    userId: payment.userId,
    planId: payment.subscriptionPlanId,
    currentStatus: payment.paymentStatus,
  });

  // Update payment with Razorpay details
  payment.razorpayPaymentId = payment_id;
  if (signature) {
    payment.razorpaySignature = signature;
  }
  payment.webhookData = webhookData;

  if (status === 'captured' || status === 'authorized') {
    console.log('💰 [PAYMENT SERVICE] Payment successful, creating subscription...');
    // Payment successful
    payment.paymentStatus = 'success';
    payment.paymentCompletedAt = new Date();

    // Deduct coins if used for payment (only if payment has coinsUsed)
    if (payment.coinsUsed && payment.coinsUsed > 0) {
      const user = await User.findById(payment.userId);
      if (user && user.gamification) {
        const currentCoins = user.gamification.coins || 0;
        if (currentCoins >= payment.coinsUsed) {
          user.gamification.coins = currentCoins - payment.coinsUsed;
          user.gamification.totalCoinsSpent = (user.gamification.totalCoinsSpent || 0) + payment.coinsUsed;
          await user.save();
          console.log('💰 [PAYMENT SERVICE] Deducted coins:', {
            coinsUsed: payment.coinsUsed,
            remainingCoins: user.gamification.coins,
          });
        } else {
          console.warn('💰 [PAYMENT SERVICE] User coins insufficient, but payment already successful:', {
            currentCoins,
            coinsUsed: payment.coinsUsed,
          });
        }
      }
    }

    // Create subscription
    const subscription = await subscriptionService.createSubscription({
      userId: payment.userId,
      planId: payment.subscriptionPlanId,
      paymentId: payment._id,
      isTrial: false,
      promoCodeId: payment.promoCodeId,
      referralCode: payment.referralCode,
    });

    console.log('💰 [PAYMENT SERVICE] Subscription created:', {
      subscriptionId: subscription._id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    });

    payment.subscriptionId = subscription._id;
    await payment.save();

    console.log('💰 [PAYMENT SERVICE] Payment updated with subscription ID');

    // Process referral if applicable
    if (payment.referralCode) {
      console.log('💰 [PAYMENT SERVICE] Processing referral:', payment.referralCode);
      await referralService.processReferral(payment.userId, payment.referralCode, payment._id);
    }

    // Send payment receipt email
    try {
      // Populate payment details for receipt
      const populatedPayment = await Payment.findById(payment._id)
        .populate('subscriptionPlanId', 'name durationLabel')
        .populate('userId', 'name email')
        .lean();

      if (populatedPayment && populatedPayment.userId && populatedPayment.subscriptionPlanId) {
        const user = populatedPayment.userId;
        const plan = populatedPayment.subscriptionPlanId;
        
        // Original amount is stored in payment.amount (plan price before discounts)
        const originalAmount = payment.amount || plan.price || 0;

        await sendPaymentReceipt({
          email: user.email,
          name: user.name,
          planName: plan.name,
          planDuration: plan.durationLabel || `${plan.duration} days`,
          originalAmount: originalAmount,
          promoCodeDiscount: payment.discountAmount || 0,
          referralDiscount: payment.referralDiscount || 0,
          coinsUsed: payment.coinsUsed || 0,
          coinsDiscount: payment.coinsDiscount || 0,
          finalAmount: payment.finalAmount,
          paymentId: payment.razorpayPaymentId || payment._id.toString(),
          orderId: payment.razorpayOrderId || 'N/A',
          paymentDate: payment.paymentCompletedAt || payment.createdAt,
          subscriptionStartDate: subscription.startDate,
          subscriptionEndDate: subscription.endDate,
          paymentMethod: payment.paymentMethod || 'Razorpay',
        });

        console.log('💰 [PAYMENT SERVICE] Payment receipt email sent successfully');
      } else {
        console.warn('💰 [PAYMENT SERVICE] Could not send receipt email - missing payment/user/plan data');
      }
    } catch (emailError) {
      // Don't fail payment if email fails
      console.error('💰 [PAYMENT SERVICE] Error sending payment receipt email:', emailError);
    }

    console.log('💰 [PAYMENT SERVICE] Payment processing completed successfully');
    return { payment, subscription };
  } else if (status === 'failed') {
    console.log('💰 [PAYMENT SERVICE] Payment failed');
    // Payment failed
    payment.paymentStatus = 'failed';
    payment.paymentFailedAt = new Date();
    payment.failureReason = webhookData.error_description || 'Payment failed';
    await payment.save();

    return { payment, subscription: null };
  }

  console.log('💰 [PAYMENT SERVICE] Unknown payment status:', status);
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


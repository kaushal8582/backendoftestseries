const paymentService = require('../services/paymentService');
const { verifyPayment } = require('../utils/razorpay');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create payment order
 */
const createPaymentOrder = async (req, res, next) => {
  try {
    const { planId, promoCode, referralCode } = req.body;
    const userId = req.user._id;

    const result = await paymentService.createPaymentOrder({
      userId,
      planId,
      promoCode,
      referralCode,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Payment order created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track payment click
 */
const trackPaymentClick = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    const userId = req.user._id;

    const payment = await paymentService.trackPaymentClick(paymentId);

    // Verify payment belongs to user
    if (payment.userId.toString() !== userId.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Unauthorized access',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment click tracked',
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Razorpay webhook handler
 */
const razorpayWebhook = async (req, res, next) => {
  try {
    console.log('🔔 [WEBHOOK] Webhook received at:', new Date().toISOString());
    console.log('🔔 [WEBHOOK] Webhook data:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;

    // Verify webhook signature (Razorpay sends signature in headers)
    const razorpaySignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log('🔔 [WEBHOOK] Signature verification:', {
      hasSignature: !!razorpaySignature,
      hasSecret: !!webhookSecret,
    });

    if (razorpaySignature && webhookSecret) {
      const crypto = require('crypto');
      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      console.log('🔔 [WEBHOOK] Signature comparison:', {
        received: razorpaySignature.substring(0, 20) + '...',
        generated: generatedSignature.substring(0, 20) + '...',
        match: generatedSignature === razorpaySignature,
      });

      if (generatedSignature !== razorpaySignature) {
        console.error('🔔 [WEBHOOK] Invalid webhook signature');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }
    }

    console.log('🔔 [WEBHOOK] Processing payment...');
    // Process payment
    const { payment, subscription } = await paymentService.verifyAndProcessPayment(webhookData);

    console.log('🔔 [WEBHOOK] Payment processed successfully:', {
      paymentId: payment?._id,
      paymentStatus: payment?.paymentStatus,
      subscriptionId: subscription?._id,
      subscriptionStatus: subscription?.status,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Webhook processed successfully',
      data: { payment, subscription },
    });
  } catch (error) {
    console.error('🔔 [WEBHOOK] Error processing webhook:', error);
    console.error('🔔 [WEBHOOK] Error stack:', error.stack);
    // Still return 200 to Razorpay to prevent retries
    res.status(HTTP_STATUS.OK).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get payment history
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const payments = await paymentService.getPaymentHistory(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { payments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment by ID
 */
const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);

    // Verify user has access
    if (req.user.role !== 'ADMIN' && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Unauthorized access',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments (admin)
 */
const getAllPayments = async (req, res, next) => {
  try {
    const result = await paymentService.getAllPayments(req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentOrder,
  trackPaymentClick,
  razorpayWebhook,
  getPaymentHistory,
  getPaymentById,
  getAllPayments,
};


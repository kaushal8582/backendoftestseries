const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config({ path: './.env' });

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order
 * @param {Number} amount - Amount in paise (smallest currency unit)
 * @param {String} currency - Currency code (default: INR)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Razorpay order
 */
const createOrder = async (amount, currency = 'INR', options = {}) => {
  try {
    const orderOptions = {
      amount: amount, // Amount in paise
      currency: currency,
      receipt: options.receipt || `receipt_${Date.now()}`,
      notes: options.notes || {},
      ...options,
    };

    const order = await razorpay.orders.create(orderOptions);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error(error.message || 'Failed to create Razorpay order');
  }
};

/**
 * Verify Razorpay payment signature
 * @param {String} razorpayOrderId - Order ID
 * @param {String} razorpayPaymentId - Payment ID
 * @param {String} razorpaySignature - Signature
 * @returns {Boolean} - True if signature is valid
 */
const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    return generatedSignature === razorpaySignature;
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
};

/**
 * Get Razorpay payment details
 * @param {String} paymentId - Payment ID
 * @returns {Promise<Object>} - Payment details
 */
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay get payment error:', error);
    throw new Error(error.message || 'Failed to fetch payment details');
  }
};

/**
 * Refund payment
 * @param {String} paymentId - Payment ID
 * @param {Number} amount - Amount to refund in paise (optional, full refund if not provided)
 * @returns {Promise<Object>} - Refund details
 */
const refundPayment = async (paymentId, amount = null) => {
  try {
    const refundOptions = {
      payment_id: paymentId,
    };

    if (amount) {
      refundOptions.amount = amount;
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error);
    throw new Error(error.message || 'Failed to process refund');
  }
};

module.exports = {
  razorpay,
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
};


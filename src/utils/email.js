/**
 * Email service using relay server
 */
const axios = require('axios');

/**
 * Send email using relay server
 * @param {Object} mailOptions - Email options
 * @returns {Promise<Object>} - Response from relay server
 */
const sendEmail = async (mailOptions) => {
  try {
    const response = await axios.post('https://relayserver-wheat.vercel.app/send-mail', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      attachments:
        Array.isArray(mailOptions.attachments) && mailOptions.attachments.length
          ? mailOptions.attachments
          : undefined,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Generate OTP (6-digit)
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email for email verification
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Response from email service
 */
const sendVerificationOTP = async (email, name, otp) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Email Verification</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello ${name},</p>
        <p>Thank you for registering with us! Please verify your email address by entering the OTP below:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #667eea;">
          <h2 style="color: #667eea; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
        </div>
        <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Verify Your Email Address - OTP Required',
    html: htmlContent,
  });
};

/**
 * Send OTP email for password reset
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Response from email service
 */
const sendPasswordResetOTP = async (email, name, otp) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Password Reset</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Please use the OTP below to reset your password:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #f5576c;">
          <h2 style="color: #f5576c; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
        </div>
        <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
        <p style="color: #d32f2f; font-size: 14px;"><strong>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Password Reset - OTP Required',
    html: htmlContent,
  });
};

/**
 * Send payment receipt email
 * @param {Object} receiptData - Receipt data
 * @returns {Promise<Object>} - Response from email service
 */
const sendPaymentReceipt = async (receiptData) => {
  const {
    email,
    name,
    planName,
    planDuration,
    originalAmount,
    promoCodeDiscount = 0,
    referralDiscount = 0,
    coinsUsed = 0,
    coinsDiscount = 0,
    finalAmount,
    paymentId,
    orderId,
    paymentDate,
    subscriptionStartDate,
    subscriptionEndDate,
    paymentMethod = 'Razorpay',
  } = receiptData;

  // Calculate total discount
  const totalDiscount = promoCodeDiscount + referralDiscount + coinsDiscount;

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Payment Receipt</h1>
        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Thank you for your subscription!</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Greeting -->
        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>
        <p style="font-size: 14px; color: #666; margin-bottom: 30px;">This is your payment receipt for the subscription purchase. Please keep this receipt for your records.</p>

        <!-- Receipt Details -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #667eea; margin-top: 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Subscription Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;"><strong>Plan Name:</strong></td>
              <td style="padding: 8px 0; color: #333; font-weight: 600;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Duration:</strong></td>
              <td style="padding: 8px 0; color: #333;">${planDuration}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Start Date:</strong></td>
              <td style="padding: 8px 0; color: #333;">${formatDate(subscriptionStartDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>End Date:</strong></td>
              <td style="padding: 8px 0; color: #333; font-weight: 600; color: #667eea;">${formatDate(subscriptionEndDate)}</td>
            </tr>
          </table>
        </div>

        <!-- Payment Details -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #667eea; margin-top: 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Payment Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;"><strong>Original Amount:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${formatCurrency(originalAmount)}</td>
            </tr>
            ${promoCodeDiscount > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Promo Code Discount:</strong></td>
              <td style="padding: 8px 0; color: #28a745; text-align: right;">- ${formatCurrency(promoCodeDiscount)}</td>
            </tr>
            ` : ''}
            ${referralDiscount > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Referral Discount:</strong></td>
              <td style="padding: 8px 0; color: #28a745; text-align: right;">- ${formatCurrency(referralDiscount)}</td>
            </tr>
            ` : ''}
            ${coinsUsed > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Coins Used:</strong></td>
              <td style="padding: 8px 0; color: #333; text-align: right;">${coinsUsed.toLocaleString()} coins</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Coins Discount:</strong></td>
              <td style="padding: 8px 0; color: #28a745; text-align: right;">- ${formatCurrency(coinsDiscount)}</td>
            </tr>
            ` : ''}
            ${totalDiscount > 0 ? `
            <tr style="border-top: 1px solid #ddd; margin-top: 10px;">
              <td style="padding: 12px 0 8px 0; color: #666;"><strong>Total Discount:</strong></td>
              <td style="padding: 12px 0 8px 0; color: #28a745; text-align: right; font-weight: 600;">- ${formatCurrency(totalDiscount)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #667eea; margin-top: 10px;">
              <td style="padding: 15px 0 8px 0; color: #333; font-size: 18px;"><strong>Amount Paid:</strong></td>
              <td style="padding: 15px 0 8px 0; color: #667eea; font-size: 20px; font-weight: 700; text-align: right;">${formatCurrency(finalAmount)}</td>
            </tr>
          </table>
        </div>

        <!-- Transaction Info -->
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #667eea; margin-top: 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Transaction Information</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;"><strong>Payment ID:</strong></td>
              <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 12px;">${paymentId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Order ID:</strong></td>
              <td style="padding: 8px 0; color: #333; font-family: monospace; font-size: 12px;">${orderId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px 0; color: #333;">${paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Payment Date:</strong></td>
              <td style="padding: 8px 0; color: #333;">${formatDate(paymentDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; color: #28a745; font-weight: 600;">✓ Successful</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 10px 0;">If you have any questions or concerns, please contact our support team.</p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">This is an automated receipt. Please do not reply to this email.</p>
          <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} ExamZen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: `Payment Receipt - ${planName} Subscription`,
    html: htmlContent,
  });
};

module.exports = {
  sendEmail,
  generateOTP,
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendPaymentReceipt,
};


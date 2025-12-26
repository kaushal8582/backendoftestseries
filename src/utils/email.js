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

module.exports = {
  sendEmail,
  generateOTP,
  sendVerificationOTP,
  sendPasswordResetOTP,
};


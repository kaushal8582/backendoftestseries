const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const { getUserTrackingInfo, getLocationFromIp } = require('../utils/userTracking');
const { generateOTP, sendVerificationOTP, sendPasswordResetOTP } = require('../utils/email');

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - User object and token
 */
const register = async (userData) => {
  const { name, email, password, phone } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists with this email', HTTP_STATUS.CONFLICT);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate OTP for email verification
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

  // Create user - only set specific fields to avoid unwanted fields
  try {
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || undefined,
      emailVerificationOTP: otp,
      emailVerificationOTPExpiry: otpExpiry,
      isEmailVerified: false,
      // Explicitly set referralCode to null to avoid any issues
      referralCode: null,
    });

    // Send verification OTP email (don't wait for it to complete)
    sendVerificationOTP(email, name, otp).catch((err) => {
      console.error('Error sending verification email:', err);
      // Don't throw error - user is already created
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password and OTP from response
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.emailVerificationOTP;
    delete userObject.emailVerificationOTPExpiry;

    return {
      user: userObject,
      token,
    };
  } catch (error) {
    // Handle duplicate key errors (e.g., referralCode, email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      if (field === 'referralCode') {
        // Retry with null referralCode
        try {
          const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone: phone || undefined,
            emailVerificationOTP: otp,
            emailVerificationOTPExpiry: otpExpiry,
            isEmailVerified: false,
            referralCode: null,
          });

          sendVerificationOTP(email, name, otp).catch((err) => {
            console.error('Error sending verification email:', err);
          });

          const token = generateToken(user._id, user.role);
          const userObject = user.toObject();
          delete userObject.password;
          delete userObject.emailVerificationOTP;
          delete userObject.emailVerificationOTPExpiry;

          return {
            user: userObject,
            token,
          };
        } catch (retryError) {
          throw new AppError('Registration failed. Please try again.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
      } else if (field === 'email') {
        throw new AppError('User already exists with this email', HTTP_STATUS.CONFLICT);
      } else {
        throw new AppError(`Registration failed: ${field} already exists`, HTTP_STATUS.CONFLICT);
      }
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} req - Express request object (for tracking)
 * @returns {Promise<Object>} - User object and token
 */
const login = async (email, password, req = null) => {
  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
  }

  if (!user.isActive) {
    throw new AppError('User account is deactivated', HTTP_STATUS.FORBIDDEN);
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
  }

  // Track user information (silently, without user knowledge)
  if (req) {
    try {
      const trackingInfo = getUserTrackingInfo(req);
      const location = await getLocationFromIp(trackingInfo.ipAddress);

      // Update tracking info
      const updateData = {
        'trackingInfo.lastLoginAt': new Date(),
        'trackingInfo.lastLoginIp': trackingInfo.ipAddress,
        'trackingInfo.lastActivityAt': new Date(),
        'trackingInfo.deviceInfo': trackingInfo.deviceInfo,
        'trackingInfo.location': location,
        'trackingInfo.appVersion': trackingInfo.appVersion,
        'trackingInfo.appPlatform': trackingInfo.appPlatform,
        'trackingInfo.networkInfo': trackingInfo.networkInfo,
      };

      // Add IP to IP addresses array if not exists
      if (trackingInfo.ipAddress && trackingInfo.ipAddress !== 'unknown') {
        const ipExists = user.trackingInfo?.ipAddresses?.some(
          (ip) => ip.ip === trackingInfo.ipAddress
        );
        if (!ipExists) {
          updateData.$push = {
            'trackingInfo.ipAddresses': {
              ip: trackingInfo.ipAddress,
              timestamp: new Date(),
            },
          };
        }
      }

      // Add to login history
      const loginEntry = {
        ipAddress: trackingInfo.ipAddress,
        userAgent: trackingInfo.deviceInfo.userAgent,
        deviceType: trackingInfo.deviceInfo.deviceType,
        location: {
          country: location.country,
          region: location.region,
          city: location.city,
        },
        timestamp: new Date(),
        loginMethod: 'email',
      };

      if (!updateData.$push) {
        updateData.$push = {};
      }
      updateData.$push['trackingInfo.loginHistory'] = loginEntry;

      // Update user tracking (don't wait for this to complete)
      User.findByIdAndUpdate(user._id, updateData, { new: true }).catch((err) => {
        console.error('Error updating user tracking:', err);
      });
    } catch (error) {
      // Silently fail tracking - don't affect login
      console.error('Error tracking user info:', error);
    }
  }

  // Generate token
  const token = generateToken(user._id, user.role);

  // Remove password from response
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    token,
  };
};

/**
 * Verify email with OTP
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Updated user
 */
const verifyEmail = async (email, otp) => {
  const user = await User.findOne({ email }).select('+emailVerificationOTP +emailVerificationOTPExpiry');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email already verified', HTTP_STATUS.BAD_REQUEST);
  }

  if (!user.emailVerificationOTP || !user.emailVerificationOTPExpiry) {
    throw new AppError('No verification OTP found. Please request a new one.', HTTP_STATUS.BAD_REQUEST);
  }

  if (user.emailVerificationOTP !== otp) {
    throw new AppError('Invalid OTP', HTTP_STATUS.BAD_REQUEST);
  }

  if (new Date() > user.emailVerificationOTPExpiry) {
    throw new AppError('OTP has expired. Please request a new one.', HTTP_STATUS.BAD_REQUEST);
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationOTP = undefined;
  user.emailVerificationOTPExpiry = undefined;
  await user.save();

  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.emailVerificationOTP;
  delete userObject.emailVerificationOTPExpiry;

  return userObject;
};

/**
 * Resend verification OTP
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const resendVerificationOTP = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email already verified', HTTP_STATUS.BAD_REQUEST);
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  user.emailVerificationOTP = otp;
  user.emailVerificationOTPExpiry = otpExpiry;
  await user.save();

  // Send verification OTP email
  await sendVerificationOTP(email, user.name, otp);
};

/**
 * Request password reset (send OTP)
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists or not for security
    return;
  }

  if (!user.isActive) {
    throw new AppError('User account is deactivated', HTTP_STATUS.FORBIDDEN);
  }

  // Generate OTP for password reset
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

  user.passwordResetOTP = otp;
  user.passwordResetOTPExpiry = otpExpiry;
  await user.save();

  // Send password reset OTP email
  await sendPasswordResetOTP(email, user.name, otp);
};

/**
 * Reset password with OTP
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Updated user
 */
const resetPassword = async (email, otp, newPassword) => {
  const user = await User.findOne({ email }).select('+passwordResetOTP +passwordResetOTPExpiry');

  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!user.passwordResetOTP || !user.passwordResetOTPExpiry) {
    throw new AppError('No password reset OTP found. Please request a new one.', HTTP_STATUS.BAD_REQUEST);
  }

  if (user.passwordResetOTP !== otp) {
    throw new AppError('Invalid OTP', HTTP_STATUS.BAD_REQUEST);
  }

  if (new Date() > user.passwordResetOTPExpiry) {
    throw new AppError('OTP has expired. Please request a new one.', HTTP_STATUS.BAD_REQUEST);
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear OTP
  user.password = hashedPassword;
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpiry = undefined;
  await user.save();

  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.passwordResetOTP;
  delete userObject.passwordResetOTPExpiry;

  return userObject;
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationOTP,
  forgotPassword,
  resetPassword,
};


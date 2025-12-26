const authService = require('../services/authService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification OTP.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password, req);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await authService.verifyEmail(email, otp);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification OTP
 * @access  Public
 */
const resendVerificationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.resendVerificationOTP(email);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Verification OTP sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (send OTP)
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    // Always return success message (don't reveal if user exists)
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'If an account exists with this email, a password reset OTP has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await authService.resetPassword(email, otp, newPassword);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerificationOTP,
  forgotPassword,
  resetPassword,
};


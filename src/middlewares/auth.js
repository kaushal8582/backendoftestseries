const { verifyToken } = require('../utils/jwt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', HTTP_STATUS.UNAUTHORIZED));
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Get user from token
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new AppError('User not found', HTTP_STATUS.NOT_FOUND));
      }

      if (!user.isActive) {
        return next(new AppError('User account is deactivated', HTTP_STATUS.FORBIDDEN));
      }

      req.user = user;
      next();
    } catch (error) {
      return next(new AppError('Invalid token', HTTP_STATUS.UNAUTHORIZED));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          HTTP_STATUS.FORBIDDEN
        )
      );
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};


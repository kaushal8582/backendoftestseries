const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

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

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    phone: phone || undefined,
  });

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
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User object and token
 */
const login = async (email, password) => {
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

module.exports = {
  register,
  login,
};


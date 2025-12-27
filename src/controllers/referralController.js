const referralService = require('../services/referralService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Get referral code
 */
const getReferralCode = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const referralCode = await referralService.getOrCreateReferralCode(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { referralCode },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get referral stats
 */
const getReferralStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const stats = await referralService.getReferralStats(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all referrals (admin)
 */
const getAllReferrals = async (req, res, next) => {
  try {
    const result = await referralService.getAllReferrals(req.query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReferralCode,
  getReferralStats,
  getAllReferrals,
};


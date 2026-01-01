const { 
  getTodayChallenges, 
  claimReward,
  createDailyChallenge,
  updateDailyChallenge,
  getAllChallenges,
  deleteDailyChallenge,
} = require('../services/dailyChallengeService');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   GET /api/daily-challenges
 * @desc    Get today's daily challenges
 * @access  Private
 */
const getTodayChallengesHandler = async (req, res, next) => {
  console.log('🔵 [Backend Controller] getTodayChallengesHandler - START');
  console.log('🔵 [Backend Controller] User ID:', req.user._id);
  try {
    console.log('🔵 [Backend Controller] Calling getTodayChallenges service...');
    const challenges = await getTodayChallenges(req.user._id);
    console.log('🔵 [Backend Controller] Service returned:', {
      challengesCount: challenges?.length || 0,
      challenges: challenges?.map((c) => ({
        _id: c._id?.toString(),
        title: c.title,
        challengeType: c.challengeType,
        progress: c.progress,
        target: c.target,
        progressPercentage: c.progressPercentage,
        isCompleted: c.isCompleted,
        rewardClaimed: c.rewardClaimed,
      })),
    });
    
    const response = {
      success: true,
      data: challenges,
    };
    
    console.log('🔵 [Backend Controller] Sending response:', {
      success: response.success,
      dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
    });
    
    res.status(HTTP_STATUS.OK).json(response);
    console.log('🔵 [Backend Controller] Response sent successfully');
  } catch (error) {
    console.error('❌ [Backend Controller] Error in getTodayChallengesHandler:', error);
    next(error);
  } finally {
    console.log('🔵 [Backend Controller] getTodayChallengesHandler - END');
  }
};

/**
 * @route   POST /api/daily-challenges/:challengeId/claim
 * @desc    Claim challenge reward
 * @access  Private
 */
const claimRewardHandler = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const userChallenge = await claimReward(req.user._id, challengeId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Reward claimed successfully',
      data: userChallenge,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/daily-challenges/admin/create
 * @desc    Create a daily challenge (Admin only)
 * @access  Private (Admin)
 */
const createDailyChallengeHandler = async (req, res, next) => {
  try {
    const challenge = await createDailyChallenge(req.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Daily challenge created successfully',
      data: challenge,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/daily-challenges/admin/:challengeId
 * @desc    Update a daily challenge (Admin only)
 * @access  Private (Admin)
 */
const updateDailyChallengeHandler = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const challenge = await updateDailyChallenge(challengeId, req.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Daily challenge updated successfully',
      data: challenge,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/daily-challenges/admin/all
 * @desc    Get all daily challenges (Admin only)
 * @access  Private (Admin)
 */
const getAllChallengesHandler = async (req, res, next) => {
  try {
    const challenges = await getAllChallenges(req.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/daily-challenges/admin/:challengeId
 * @desc    Delete a daily challenge (Admin only)
 * @access  Private (Admin)
 */
const deleteDailyChallengeHandler = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    await deleteDailyChallenge(challengeId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Daily challenge deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodayChallenges: getTodayChallengesHandler,
  claimReward: claimRewardHandler,
  createDailyChallenge: createDailyChallengeHandler,
  updateDailyChallenge: updateDailyChallengeHandler,
  getAllChallenges: getAllChallengesHandler,
  deleteDailyChallenge: deleteDailyChallengeHandler,
};


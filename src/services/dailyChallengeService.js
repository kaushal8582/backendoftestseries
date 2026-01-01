const DailyChallenge = require('../models/DailyChallenge');
const UserChallenge = require('../models/UserChallenge');
const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Category = require('../models/Category');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../config/constants');
const { awardTestRewards } = require('./gamificationService');

/**
 * Generate today's daily challenges
 * @returns {Promise<Array>} - Array of created challenges
 */
const generateDailyChallenges = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if challenges already exist for today
  const existing = await DailyChallenge.findOne({ date: today });
  if (existing) {
    return [existing];
  }

  const challenges = [];

  // 1. Daily Test Challenge - Pick a random test
  const randomTest = await Test.aggregate([
    { $match: { isActive: true } },
    { $sample: { size: 1 } },
  ]);

  if (randomTest.length > 0) {
    const dailyTestChallenge = await DailyChallenge.create({
      date: today,
      challengeType: 'daily_test',
      title: 'Daily Test Challenge',
      description: `Complete today's featured test`,
      target: 1,
      targetTest: randomTest[0]._id,
      reward: { xp: 25, coins: 25 },
    });
    challenges.push(dailyTestChallenge);
  }

  // 2. Accuracy Challenge
  const accuracyChallenge = await DailyChallenge.create({
    date: today,
    challengeType: 'accuracy',
    title: 'Accuracy Master',
    description: 'Complete a test with 85%+ accuracy',
    target: 85,
      reward: { xp: 37, coins: 37 },
  });
  challenges.push(accuracyChallenge);

  // 3. Speed Challenge
  const speedChallenge = await DailyChallenge.create({
    date: today,
    challengeType: 'speed',
    title: 'Speed Demon',
    description: 'Complete a test in 60% of the allocated time',
    target: 60, // 60% of time
      reward: { xp: 50, coins: 50 },
  });
  challenges.push(speedChallenge);

  // 4. Category Focus - Pick a random category
  const randomCategory = await Category.aggregate([
    { $match: { isActive: true } },
    { $sample: { size: 1 } },
  ]);

  if (randomCategory.length > 0) {
    const categoryChallenge = await DailyChallenge.create({
      date: today,
      challengeType: 'category_focus',
      title: 'Category Focus',
      description: `Complete 3 tests in ${randomCategory[0].name} category`,
      target: 3,
      targetCategory: randomCategory[0]._id,
      reward: { xp: 75, coins: 75 },
    });
    challenges.push(categoryChallenge);
  }

  return challenges;
};

/**
 * Get today's challenges for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Challenges with user progress
 */
const getTodayChallenges = async (userId) => {
  console.log('🟢 [Backend Service] getTodayChallenges - START');
  console.log('🟢 [Backend Service] User ID:', userId);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('🟢 [Backend Service] Today date:', today.toISOString());

  // Generate challenges if they don't exist
  console.log('🟢 [Backend Service] Generating daily challenges if needed...');
  await generateDailyChallenges();

  // Get user's exam preferences
  console.log('🟢 [Backend Service] Fetching user exam preferences...');
  const user = await User.findById(userId).select('examPreference');
  const userExamIds = user?.examPreference?.examIds || [];
  console.log('🟢 [Backend Service] User exam IDs:', userExamIds);

  // Get today's challenges
  console.log('🟢 [Backend Service] Fetching today\'s challenges from DB...');
  const allChallenges = await DailyChallenge.find({
    date: today,
    isActive: true,
  }).populate('targetTest', 'testName').populate('targetCategory', 'name').populate('examIds', 'title');
  console.log('🟢 [Backend Service] Found challenges:', allChallenges.length);

  // Filter challenges based on user's exam preferences
  let challenges = [];
  
  if (userExamIds.length > 0) {
    // Filter challenges that match user's exams OR have no examIds (available for all)
    challenges = allChallenges.filter((challenge) => {
      // If challenge has no examIds, it's available for all
      if (!challenge.examIds || challenge.examIds.length === 0) {
        return true;
      }
      // Check if any of challenge's examIds match user's examIds
      const challengeExamIds = challenge.examIds.map((exam) => exam._id?.toString() || exam.toString());
      return challengeExamIds.some((examId) => 
        userExamIds.some((userExamId) => 
          userExamId.toString() === examId
        )
      );
    });
  } else {
    // If user has no exam preferences, show challenges with no examIds (available for all)
    challenges = allChallenges.filter((challenge) => 
      !challenge.examIds || challenge.examIds.length === 0
    );
  }

  // Fallback: If no matching challenges, show at least one (any challenge)
  if (challenges.length === 0 && allChallenges.length > 0) {
    challenges = [allChallenges[0]]; // Show first challenge as fallback
  }

  // Get user's progress
  console.log('🟢 [Backend Service] Fetching user challenge progress...');
  const challengeIds = challenges.map((c) => c._id);
  console.log('🟢 [Backend Service] Challenge IDs to check:', challengeIds);
  
  const userChallenges = await UserChallenge.find({
    userId,
    challengeId: { $in: challengeIds },
  });
  console.log('🟢 [Backend Service] Found user challenges:', userChallenges.length);
  userChallenges.forEach((uc) => {
    console.log('🟢 [Backend Service] User Challenge:', {
      challengeId: uc.challengeId.toString(),
      progress: uc.progress,
      isCompleted: uc.isCompleted,
      rewardClaimed: uc.rewardClaimed,
    });
  });

  const userChallengeMap = new Map();
  userChallenges.forEach((uc) => {
    userChallengeMap.set(uc.challengeId.toString(), uc);
  });

  // Combine challenges with user progress
  console.log('🟢 [Backend Service] Combining challenges with user progress...');
  const result = challenges.map((challenge) => {
    const userChallenge = userChallengeMap.get(challenge._id.toString());
    const progress = userChallenge?.progress || 0;
    const target = challenge.target || 1;
    
    console.log('🟢 [Backend Service] Processing challenge:', {
      challengeId: challenge._id.toString(),
      title: challenge.title,
      target,
      userProgress: progress,
      userIsCompleted: userChallenge?.isCompleted || false,
    });
    
    // Calculate progress percentage
    let progressPercentage = 0;
    if (target > 0) {
      progressPercentage = Math.min(Math.round((progress / target) * 100), 100);
    }
    
    // If completed, ensure it shows 100% and progress equals target
    if (userChallenge?.isCompleted) {
      progressPercentage = 100;
      // Ensure progress is set to target if completed
      const finalProgress = progress < target ? target : progress;
      console.log('🟢 [Backend Service] Challenge completed! Setting:', {
        progress: finalProgress,
        target,
        progressPercentage: 100,
      });
      
      const challengeData = {
        ...challenge.toObject(),
        progress: finalProgress,
        isCompleted: true,
        completedAt: userChallenge?.completedAt || null,
        rewardClaimed: userChallenge?.rewardClaimed || false,
        progressPercentage: 100,
      };
      
      console.log('🟢 [Backend Service] Final challenge data:', {
        _id: challengeData._id,
        title: challengeData.title,
        progress: challengeData.progress,
        target: challengeData.target,
        progressPercentage: challengeData.progressPercentage,
        isCompleted: challengeData.isCompleted,
        rewardClaimed: challengeData.rewardClaimed,
      });
      
      return challengeData;
    }
    
    const challengeData = {
      ...challenge.toObject(),
      progress: progress,
      isCompleted: false,
      completedAt: null,
      rewardClaimed: false,
      progressPercentage: progressPercentage,
    };
    
    console.log('🟢 [Backend Service] Challenge not completed:', {
      _id: challengeData._id,
      title: challengeData.title,
      progress: challengeData.progress,
      target: challengeData.target,
      progressPercentage: challengeData.progressPercentage,
    });
    
    return challengeData;
  });
  
  console.log('🟢 [Backend Service] Returning', result.length, 'challenges');
  console.log('🟢 [Backend Service] getTodayChallenges - END');
  return result;
};

/**
 * Check and update challenge progress after test completion
 * @param {string} userId - User ID
 * @param {Object} attempt - Test attempt object (should have dailyChallengeId if from daily challenge)
 * @returns {Promise<Array>} - Array of completed challenges
 */
const checkChallengeProgress = async (userId, attempt) => {
  console.log('🟡 [checkChallengeProgress] START - Checking challenge progress');
  console.log('🟡 [checkChallengeProgress] User ID:', userId);
  console.log('🟡 [checkChallengeProgress] Attempt data:', {
    testId: attempt.testId?.toString(),
    dailyChallengeId: attempt.dailyChallengeId?.toString(),
    score: attempt.score,
    accuracy: attempt.accuracy,
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('🟡 [checkChallengeProgress] Today date:', today.toISOString());

  const challenges = await DailyChallenge.find({
    date: today,
    isActive: true,
  });
  console.log('🟡 [checkChallengeProgress] Found', challenges.length, 'challenges for today');

  const completedChallenges = [];

  for (const challenge of challenges) {
    console.log('🟡 [checkChallengeProgress] Processing challenge:', {
      challengeId: challenge._id.toString(),
      title: challenge.title,
      challengeType: challenge.challengeType,
      targetTest: challenge.targetTest?.toString(),
    });
    
    let shouldUpdate = false;
    let newProgress = 0;
    let isCompleted = false;

    // Get or create user challenge
    let userChallenge = await UserChallenge.findOne({
      userId,
      challengeId: challenge._id,
    });

    if (!userChallenge) {
      console.log('🟡 [checkChallengeProgress] Creating new UserChallenge');
      userChallenge = await UserChallenge.create({
        userId,
        challengeId: challenge._id,
        progress: 0,
      });
    } else {
      console.log('🟡 [checkChallengeProgress] Existing UserChallenge found:', {
        progress: userChallenge.progress,
        isCompleted: userChallenge.isCompleted,
      });
    }

    // Skip if already completed
    if (userChallenge.isCompleted) {
      console.log('🟡 [checkChallengeProgress] Challenge already completed, skipping');
      continue;
    }

    // Check challenge type and update progress
    switch (challenge.challengeType) {
      case 'daily_test':
        // Check if this attempt is for this specific daily challenge
        // by checking if attempt.dailyChallengeId matches challenge._id
        // Extract IDs properly - handle both ObjectId and string
        let attemptTestId = attempt.testId;
        if (attemptTestId && typeof attemptTestId === 'object') {
          attemptTestId = attemptTestId._id?.toString() || attemptTestId.toString();
        } else if (attemptTestId) {
          attemptTestId = attemptTestId.toString();
        }
        
        let challengeTestId = challenge.targetTest;
        if (challengeTestId && typeof challengeTestId === 'object') {
          challengeTestId = challengeTestId._id?.toString() || challengeTestId.toString();
        } else if (challengeTestId) {
          challengeTestId = challengeTestId.toString();
        }
        
        let attemptChallengeId = attempt.dailyChallengeId;
        if (attemptChallengeId && typeof attemptChallengeId === 'object') {
          attemptChallengeId = attemptChallengeId._id?.toString() || attemptChallengeId.toString();
        } else if (attemptChallengeId) {
          attemptChallengeId = attemptChallengeId.toString();
        }
        
        const challengeId = challenge._id.toString();
        
        // Debug logging
        console.log('🟡 [checkChallengeProgress] Daily Challenge Check:', {
          attemptTestId,
          challengeTestId,
          attemptChallengeId,
          challengeId,
          testIdMatch: attemptTestId === challengeTestId,
          challengeIdMatch: attemptChallengeId === challengeId,
          fullMatch: attemptTestId === challengeTestId && attemptChallengeId === challengeId
        });
        
        if (
          attemptTestId === challengeTestId &&
          attemptChallengeId === challengeId
        ) {
          newProgress = 1;
          isCompleted = true;
          shouldUpdate = true;
          console.log('🟡 [checkChallengeProgress] ✅ Daily Challenge matched! Updating progress...');
        } else {
          console.log('🟡 [checkChallengeProgress] ❌ Daily Challenge NOT matched:', {
            testIdMatch: attemptTestId === challengeTestId,
            challengeIdMatch: attemptChallengeId === challengeId,
            reason: !(attemptTestId === challengeTestId) ? 'testId mismatch' : 'challengeId mismatch'
          });
        }
        break;

      case 'accuracy':
        if (attempt.accuracy >= challenge.target) {
          newProgress = challenge.target;
          isCompleted = true;
          shouldUpdate = true;
        }
        break;

      case 'speed':
        // Calculate if test was completed in target % of time
        const test = await Test.findById(attempt.testId);
        if (test && test.duration) {
          const allocatedTime = test.duration * 60; // Convert to seconds
          const timePercentage = (attempt.timeTaken / allocatedTime) * 100;
          if (timePercentage <= challenge.target) {
            newProgress = challenge.target;
            isCompleted = true;
            shouldUpdate = true;
          }
        }
        break;

      case 'category_focus':
        // Check if test belongs to target category
        const testDoc = await Test.findById(attempt.testId).populate('examId');
        if (testDoc?.examId?.category?.toString() === challenge.targetCategory?.toString()) {
          newProgress = (userChallenge.progress || 0) + 1;
          if (newProgress >= challenge.target) {
            isCompleted = true;
          }
          shouldUpdate = true;
        }
        break;
    }

    if (shouldUpdate) {
      console.log('🟡 [checkChallengeProgress] Updating UserChallenge:', {
        challengeId: challenge._id.toString(),
        newProgress,
        isCompleted,
      });
      
      userChallenge.progress = newProgress;
      userChallenge.isCompleted = isCompleted;
      if (isCompleted) {
        userChallenge.completedAt = new Date();
        console.log('🟡 [checkChallengeProgress] Awarding rewards:', challenge.reward);
        // Award rewards
        await User.findByIdAndUpdate(userId, {
          $inc: {
            'gamification.totalXP': challenge.reward.xp,
            'gamification.xp': challenge.reward.xp,
            'gamification.coins': challenge.reward.coins,
            'gamification.totalCoinsEarned': challenge.reward.coins,
          },
        });
        // Update challenge completion count
        await DailyChallenge.findByIdAndUpdate(challenge._id, {
          $inc: { completionsCount: 1 },
        });
        completedChallenges.push({
          challengeId: challenge._id,
          title: challenge.title,
          reward: challenge.reward,
        });
        console.log('🟡 [checkChallengeProgress] ✅ Challenge completed and rewards awarded');
      }
      
      await userChallenge.save();
      console.log('🟡 [checkChallengeProgress] UserChallenge saved:', {
        challengeId: challenge._id.toString(),
        progress: userChallenge.progress,
        isCompleted: userChallenge.isCompleted,
      });
      
      // Debug logging
      console.log('🟡 [checkChallengeProgress] Daily Challenge Progress Updated:', {
        challengeId: challenge._id.toString(),
        challengeType: challenge.challengeType,
        userId: userId.toString(),
        progress: userChallenge.progress,
        target: challenge.target,
        isCompleted: userChallenge.isCompleted,
        progressPercentage: userChallenge.isCompleted ? 100 : Math.round((userChallenge.progress / challenge.target) * 100),
      });
    } else {
      console.log('🟡 [checkChallengeProgress] No update needed for challenge:', challenge._id.toString());
    }
  }

  console.log('🟡 [checkChallengeProgress] END - Completed challenges:', completedChallenges.length);
  console.log('🟡 [checkChallengeProgress] Completed challenges:', completedChallenges);
  return completedChallenges;
};

/**
 * Claim challenge reward
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object>} - Updated user challenge
 */
const claimReward = async (userId, challengeId) => {
  const userChallenge = await UserChallenge.findOne({
    userId,
    challengeId,
  });

  if (!userChallenge) {
    throw new AppError('Challenge not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!userChallenge.isCompleted) {
    throw new AppError('Challenge not completed yet', HTTP_STATUS.BAD_REQUEST);
  }

  if (userChallenge.rewardClaimed) {
    throw new AppError('Reward already claimed', HTTP_STATUS.BAD_REQUEST);
  }

  userChallenge.rewardClaimed = true;
  await userChallenge.save();

  return userChallenge;
};

/**
 * Create a daily challenge (Admin only)
 * @param {Object} challengeData - Challenge data
 * @returns {Promise<Object>} - Created challenge
 */
const createDailyChallenge = async (challengeData) => {
  const {
    date,
    challengeType,
    title,
    description,
    target,
    targetCategory,
    targetTest,
    reward,
    examIds, // Array of exam IDs
  } = challengeData;

  // Set date to start of day
  const challengeDate = new Date(date);
  challengeDate.setHours(0, 0, 0, 0);

  const challenge = await DailyChallenge.create({
    date: challengeDate,
    challengeType,
    title,
    description,
    target,
    targetCategory,
    targetTest,
    reward: reward || { xp: 25, coins: 25 },
    examIds: examIds || [], // Empty array = available for all exams
  });

  return DailyChallenge.findById(challenge._id)
    .populate('targetTest', 'testName')
    .populate('targetCategory', 'name')
    .populate('examIds', 'title');
};

/**
 * Update a daily challenge (Admin only)
 * @param {string} challengeId - Challenge ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} - Updated challenge
 */
const updateDailyChallenge = async (challengeId, updateData) => {
  const challenge = await DailyChallenge.findByIdAndUpdate(
    challengeId,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('targetTest', 'testName')
    .populate('targetCategory', 'name')
    .populate('examIds', 'title');

  if (!challenge) {
    throw new AppError('Challenge not found', HTTP_STATUS.NOT_FOUND);
  }

  return challenge;
};

/**
 * Get all challenges (Admin only)
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} - All challenges
 */
const getAllChallenges = async (filters = {}) => {
  const query = {};

  if (filters.date) {
    const date = new Date(filters.date);
    date.setHours(0, 0, 0, 0);
    query.date = date;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  const challenges = await DailyChallenge.find(query)
    .populate('targetTest', 'testName')
    .populate('targetCategory', 'name')
    .populate('examIds', 'title')
    .sort({ date: -1, createdAt: -1 });

  return challenges;
};

/**
 * Delete a daily challenge (Admin only)
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<void>}
 */
const deleteDailyChallenge = async (challengeId) => {
  const challenge = await DailyChallenge.findById(challengeId);
  
  if (!challenge) {
    throw new AppError('Challenge not found', HTTP_STATUS.NOT_FOUND);
  }

  // Delete the challenge
  await DailyChallenge.findByIdAndDelete(challengeId);
  
  // Also delete all associated UserChallenge records
  await UserChallenge.deleteMany({ challengeId });
};

module.exports = {
  generateDailyChallenges,
  getTodayChallenges,
  checkChallengeProgress,
  claimReward,
  createDailyChallenge,
  updateDailyChallenge,
  getAllChallenges,
  deleteDailyChallenge,
};


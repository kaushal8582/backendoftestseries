require('dotenv').config();
const mongoose = require('mongoose');
const { initializeAchievements } = require('../services/achievementService');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  await initializeAchievements();
  console.log('✅ Achievements initialized successfully');
  process.exit(0);
};

run();


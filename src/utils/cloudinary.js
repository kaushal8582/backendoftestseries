const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config({ path: './.env' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const fileExtension = localFilePath.split('.').pop().toLowerCase();
    let resourceType = 'auto';
    if (fileExtension === 'pdf') {
      resourceType = 'raw';
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: resourceType,
    });

    // Delete local file after upload
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    // Delete local file if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.log('Cloudinary upload error:', error.message);
    return null;
  }
};

module.exports = { uploadOnCloudinary };


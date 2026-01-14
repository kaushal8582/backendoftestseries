const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const upload = require('../middlewares/multer');
const { uploadOnCloudinary } = require('../utils/cloudinary');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @route   POST /api/upload/image
 * @desc    Upload image to Cloudinary
 * @access  Private (Admin only)
 */
router.post(
  '/image',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'No image file provided',
        });
      }

      const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
      
      if (!cloudinaryResponse) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: 'Failed to upload image to Cloudinary',
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          url: cloudinaryResponse.secure_url,
          publicId: cloudinaryResponse.public_id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

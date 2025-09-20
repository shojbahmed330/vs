const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinary');
const { authenticateToken, uploadRateLimit, asyncHandler } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');

// Configure multer for different upload types
const imageUpload = cloudinary.getUploadMiddleware('files', {
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  folder: 'voice-social/images'
});

const videoUpload = cloudinary.getUploadMiddleware('files', {
  allowedTypes: ['video/mp4', 'video/mov', 'video/avi'],
  maxSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 1,
  folder: 'voice-social/videos'
});

const audioUpload = cloudinary.getUploadMiddleware('files', {
  allowedTypes: ['audio/mp3', 'audio/wav', 'audio/mpeg'],
  maxSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 1,
  folder: 'voice-social/audio'
});

const avatarUpload = cloudinary.getUploadMiddleware('avatar', {
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  maxSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 1,
  folder: 'voice-social/avatars'
});

// @route   POST /api/upload/images
// @desc    Upload multiple images
// @access  Private
router.post('/images',
  authenticateToken,
  uploadRateLimit,
  imageUpload.array('files'),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    try {
      const uploadResults = [];
      
      for (const file of req.files) {
        const result = {
          success: true,
          url: file.path,
          publicId: file.filename,
          originalName: file.originalname,
          size: file.size,
          format: file.format || 'jpg',
          width: file.width,
          height: file.height
        };
        
        uploadResults.push(result);
      }

      logger.logUserAction(req.user._id, 'images_uploaded', {
        count: uploadResults.length,
        totalSize: req.files.reduce((sum, file) => sum + file.size, 0)
      });

      res.json({
        success: true,
        message: `${uploadResults.length} image(s) uploaded successfully`,
        data: {
          files: uploadResults,
          count: uploadResults.length
        }
      });
    } catch (error) {
      logger.logError(error, 'image_upload');
      res.status(500).json({
        success: false,
        message: 'Image upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   POST /api/upload/video
// @desc    Upload single video
// @access  Private
router.post('/video',
  authenticateToken,
  uploadRateLimit,
  videoUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    try {
      const result = {
        success: true,
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        format: req.file.format || 'mp4',
        duration: req.file.duration,
        width: req.file.width,
        height: req.file.height,
        thumbnail: cloudinary.getOptimizedUrl(req.file.filename, {
          resourceType: 'video',
          transformation: [
            { width: 300, height: 300, crop: 'fill' },
            { format: 'jpg', quality: 'auto' }
          ]
        })
      };

      logger.logUserAction(req.user._id, 'video_uploaded', {
        size: req.file.size,
        duration: req.file.duration
      });

      res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: { file: result }
      });
    } catch (error) {
      logger.logError(error, 'video_upload');
      res.status(500).json({
        success: false,
        message: 'Video upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   POST /api/upload/audio
// @desc    Upload single audio file
// @access  Private
router.post('/audio',
  authenticateToken,
  uploadRateLimit,
  audioUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file uploaded'
      });
    }

    try {
      const result = {
        success: true,
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        format: req.file.format || 'mp3',
        duration: req.file.duration
      };

      logger.logUserAction(req.user._id, 'audio_uploaded', {
        size: req.file.size,
        duration: req.file.duration
      });

      res.json({
        success: true,
        message: 'Audio uploaded successfully',
        data: { file: result }
      });
    } catch (error) {
      logger.logError(error, 'audio_upload');
      res.status(500).json({
        success: false,
        message: 'Audio upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar',
  authenticateToken,
  uploadRateLimit,
  avatarUpload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file uploaded'
      });
    }

    try {
      // Delete old avatar if exists
      if (req.user.avatar?.publicId) {
        await cloudinary.deleteFile(req.user.avatar.publicId);
      }

      // Update user avatar
      const avatarData = {
        url: req.file.path,
        publicId: req.file.filename
      };

      await User.findByIdAndUpdate(req.user._id, {
        avatar: avatarData
      });

      logger.logUserAction(req.user._id, 'avatar_updated', {
        publicId: req.file.filename
      });

      res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
          avatar: {
            ...avatarData,
            size: req.file.size,
            format: req.file.format
          }
        }
      });
    } catch (error) {
      logger.logError(error, 'avatar_upload');
      res.status(500).json({
        success: false,
        message: 'Avatar upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   POST /api/upload/cover
// @desc    Upload user cover image
// @access  Private
router.post('/cover',
  authenticateToken,
  uploadRateLimit,
  imageUpload.single('cover'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No cover image uploaded'
      });
    }

    try {
      // Delete old cover image if exists
      if (req.user.coverImage?.publicId) {
        await cloudinary.deleteFile(req.user.coverImage.publicId);
      }

      // Update user cover image
      const coverData = {
        url: req.file.path,
        publicId: req.file.filename
      };

      await User.findByIdAndUpdate(req.user._id, {
        coverImage: coverData
      });

      logger.logUserAction(req.user._id, 'cover_updated', {
        publicId: req.file.filename
      });

      res.json({
        success: true,
        message: 'Cover image updated successfully',
        data: {
          coverImage: {
            ...coverData,
            size: req.file.size,
            format: req.file.format,
            width: req.file.width,
            height: req.file.height
          }
        }
      });
    } catch (error) {
      logger.logError(error, 'cover_upload');
      res.status(500).json({
        success: false,
        message: 'Cover image upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   DELETE /api/upload/file/:publicId
// @desc    Delete uploaded file
// @access  Private
router.delete('/file/:publicId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    const { resourceType = 'auto' } = req.query;

    try {
      // Check if user owns this file (optional security check)
      // You might want to implement a files collection to track ownership
      
      const result = await cloudinary.deleteFile(publicId, resourceType);
      
      if (result.success) {
        logger.logUserAction(req.user._id, 'file_deleted', {
          publicId,
          resourceType
        });

        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found or already deleted'
        });
      }
    } catch (error) {
      logger.logError(error, 'file_delete');
      res.status(500).json({
        success: false,
        message: 'File deletion failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// @route   POST /api/upload/signature
// @desc    Generate upload signature for client-side uploads
// @access  Private
router.post('/signature',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { 
      folder = 'voice-social',
      resourceType = 'auto',
      transformation,
      tags = ['voice-social']
    } = req.body;

    try {
      const signature = await cloudinary.generateUploadSignature({
        folder: `${folder}/${req.user._id}`,
        resourceType,
        transformation,
        tags: [...tags, `user_${req.user._id}`],
        uploadParams: {
          // Add any additional parameters
          context: `user_id=${req.user._id}|uploaded_at=${Date.now()}`
        }
      });

      res.json({
        success: true,
        data: signature
      });
    } catch (error) {
      logger.logError(error, 'signature_generation');
      res.status(500).json({
        success: false,
        message: 'Signature generation failed'
      });
    }
  })
);

// @route   GET /api/upload/optimize/:publicId
// @desc    Get optimized URL for a file
// @access  Public
router.get('/optimize/:publicId',
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    const {
      width,
      height,
      quality = 'auto',
      format = 'auto',
      crop = 'fill',
      resourceType = 'auto'
    } = req.query;

    try {
      const optimizedUrl = cloudinary.getOptimizedUrl(publicId, {
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        quality,
        format,
        crop,
        resourceType
      });

      res.json({
        success: true,
        data: {
          originalPublicId: publicId,
          optimizedUrl,
          parameters: {
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            quality,
            format,
            crop,
            resourceType
          }
        }
      });
    } catch (error) {
      logger.logError(error, 'url_optimization');
      res.status(500).json({
        success: false,
        message: 'URL optimization failed'
      });
    }
  })
);

// @route   GET /api/upload/info/:publicId
// @desc    Get file information
// @access  Private
router.get('/info/:publicId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    const { resourceType = 'auto' } = req.query;

    try {
      const fileInfo = await cloudinary.getFileInfo(publicId, resourceType);

      res.json({
        success: true,
        data: fileInfo
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      } else {
        logger.logError(error, 'file_info');
        res.status(500).json({
          success: false,
          message: 'Failed to get file information'
        });
      }
    }
  })
);

// @route   GET /api/upload/user-files
// @desc    Get user's uploaded files
// @access  Private
router.get('/user-files',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type = 'all', // all, image, video, audio
      sortBy = 'created_at',
      order = 'desc'
    } = req.query;

    try {
      let expression = `folder:voice-social/${req.user._id}`;
      
      if (type !== 'all') {
        expression += ` AND resource_type:${type}`;
      }

      const searchOptions = {
        expression,
        sortBy: [{ [sortBy]: order }],
        maxResults: parseInt(limit),
        nextCursor: page > 1 ? `page_${page}` : undefined
      };

      const result = await cloudinary.searchFiles(searchOptions);

      res.json({
        success: true,
        data: {
          files: result.resources,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.totalCount,
            hasNext: !!result.nextCursor
          }
        }
      });
    } catch (error) {
      logger.logError(error, 'user_files_search');
      res.status(500).json({
        success: false,
        message: 'Failed to get user files'
      });
    }
  })
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        maxSize: '100MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
        maxFiles: 5
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }
  
  if (error.message && error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;
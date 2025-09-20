const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const { logger } = require('./logger');

class CloudinaryManager {
  constructor() {
    this.isConfigured = false;
    this.storage = null;
    this.uploader = null;
  }

  configure() {
    try {
      if (this.isConfigured) {
        return;
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });

      this.isConfigured = true;
      logger.info('Cloudinary configured successfully');
    } catch (error) {
      logger.error('Cloudinary configuration failed:', error.message);
      throw error;
    }
  }

  getStorage(options = {}) {
    if (!this.isConfigured) {
      this.configure();
    }

    // Use memory storage with custom filename
    this.storage = multer.memoryStorage();
    
    return this.storage;
  }

  getUploadMiddleware(fieldName = 'file', options = {}) {
    const storage = this.getStorage(options);
    
    const upload = multer({
      storage: storage,
      limits: {
        fileSize: options.maxSize || 50 * 1024 * 1024, // 50MB default
        files: options.maxFiles || 5
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, options, cb);
      }
    });

    return upload;
  }

  validateFile(file, options = {}, callback) {
    try {
      const allowedTypes = options.allowedTypes || [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'video/mp4',
        'video/mov',
        'video/avi',
        'audio/mp3',
        'audio/wav',
        'audio/mpeg'
      ];

      const maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB
      
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return callback(new Error(`File type ${file.mimetype} is not allowed`));
      }

      // Check file size (if available)
      if (file.size && file.size > maxSize) {
        return callback(new Error(`File size ${file.size} exceeds maximum allowed size ${maxSize}`));
      }

      callback(null, true);
    } catch (error) {
      callback(error);
    }
  }

  async uploadFile(file, options = {}) {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      const uploadOptions = {
        folder: options.folder || 'voice-social',
        resource_type: options.resourceType || 'auto',
        public_id: options.publicId,
        transformation: options.transformation,
        tags: options.tags || ['voice-social'],
        context: options.context,
        ...options.cloudinaryOptions
      };

      let result;
      
      if (typeof file === 'string') {
        // File path or URL
        result = await cloudinary.uploader.upload(file, uploadOptions);
      } else if (file.buffer) {
        // Buffer
        result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });
      } else {
        throw new Error('Invalid file format');
      }

      logger.logFileOperation('upload', result.public_id, true);
      
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
        createdAt: result.created_at
      };
    } catch (error) {
      logger.logFileOperation('upload', 'unknown', false);
      logger.error('Cloudinary upload failed:', error.message);
      throw error;
    }
  }

  async uploadMultiple(files, options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, options));
      const results = await Promise.allSettled(uploadPromises);
      
      const successful = [];
      const failed = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({
            index,
            error: result.reason.message
          });
        }
      });
      
      return {
        successful,
        failed,
        total: files.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      logger.error('Multiple upload failed:', error.message);
      throw error;
    }
  }

  async deleteFile(publicId, resourceType = 'auto') {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      
      logger.logFileOperation('delete', publicId, result.result === 'ok');
      
      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      logger.logFileOperation('delete', publicId, false);
      logger.error('Cloudinary delete failed:', error.message);
      throw error;
    }
  }

  async deleteMultiple(publicIds, resourceType = 'auto') {
    try {
      const deletePromises = publicIds.map(id => this.deleteFile(id, resourceType));
      const results = await Promise.allSettled(deletePromises);
      
      const successful = [];
      const failed = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successful.push(publicIds[index]);
        } else {
          failed.push({
            publicId: publicIds[index],
            error: result.reason?.message || 'Delete failed'
          });
        }
      });
      
      return {
        successful,
        failed,
        total: publicIds.length,
        successCount: successful.length,
        failureCount: failed.length
      };
    } catch (error) {
      logger.error('Multiple delete failed:', error.message);
      throw error;
    }
  }

  generateTransformation(options = {}) {
    const transformations = [];
    
    // Image transformations
    if (options.width || options.height) {
      transformations.push({
        width: options.width,
        height: options.height,
        crop: options.crop || 'fill',
        gravity: options.gravity || 'auto'
      });
    }
    
    if (options.quality) {
      transformations.push({ quality: options.quality });
    }
    
    if (options.format) {
      transformations.push({ format: options.format });
    }
    
    // Video transformations
    if (options.videoBitrate) {
      transformations.push({ video_codec: 'auto', bit_rate: options.videoBitrate });
    }
    
    if (options.audioBitrate) {
      transformations.push({ audio_codec: 'auto', bit_rate: options.audioBitrate });
    }
    
    // Effects
    if (options.effects && options.effects.length > 0) {
      options.effects.forEach(effect => {
        transformations.push({ effect });
      });
    }
    
    return transformations;
  }

  getOptimizedUrl(publicId, options = {}) {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      const transformation = this.generateTransformation(options);
      
      return cloudinary.url(publicId, {
        secure: true,
        transformation: transformation,
        resource_type: options.resourceType || 'auto',
        ...options.urlOptions
      });
    } catch (error) {
      logger.error('URL generation failed:', error.message);
      throw error;
    }
  }

  async generateUploadSignature(options = {}) {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      
      const params = {
        timestamp,
        folder: options.folder || 'voice-social',
        ...options.uploadParams
      };
      
      const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
      
      return {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        ...params
      };
    } catch (error) {
      logger.error('Signature generation failed:', error.message);
      throw error;
    }
  }

  async getFileInfo(publicId, resourceType = 'auto') {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });
      
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
        createdAt: result.created_at,
        tags: result.tags,
        folder: result.folder
      };
    } catch (error) {
      logger.error('Get file info failed:', error.message);
      throw error;
    }
  }

  async searchFiles(options = {}) {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      const searchOptions = {
        expression: options.expression || 'folder:voice-social',
        sort_by: options.sortBy || [{ created_at: 'desc' }],
        max_results: options.maxResults || 50,
        next_cursor: options.nextCursor,
        ...options.searchParams
      };
      
      const result = await cloudinary.search.execute(searchOptions);
      
      return {
        resources: result.resources,
        totalCount: result.total_count,
        nextCursor: result.next_cursor,
        rateLimitAllowed: result.rate_limit_allowed,
        rateLimitResetAt: result.rate_limit_reset_at,
        rateLimitRemaining: result.rate_limit_remaining
      };
    } catch (error) {
      logger.error('Search files failed:', error.message);
      throw error;
    }
  }

  async cleanupUnusedFiles(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const searchResult = await this.searchFiles({
        expression: `folder:voice-social AND uploaded_at<${cutoffDate.toISOString()}`,
        maxResults: 500
      });
      
      if (searchResult.resources.length === 0) {
        return { deletedCount: 0, message: 'No files to cleanup' };
      }
      
      const publicIds = searchResult.resources.map(resource => resource.public_id);
      const deleteResult = await this.deleteMultiple(publicIds);
      
      logger.info(`Cleaned up ${deleteResult.successCount} unused files`);
      
      return {
        deletedCount: deleteResult.successCount,
        failedCount: deleteResult.failureCount,
        totalChecked: searchResult.resources.length
      };
    } catch (error) {
      logger.error('Cleanup failed:', error.message);
      throw error;
    }
  }
}

module.exports = new CloudinaryManager();
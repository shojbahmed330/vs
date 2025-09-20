class CloudinaryUploader {
  constructor() {
    this.cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    this.apiKey = process.env.REACT_APP_CLOUDINARY_API_KEY;
    this.uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    this.baseUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}`;
  }

  // Validate configuration
  validateConfig() {
    if (!this.cloudName || !this.apiKey || !this.uploadPreset) {
      throw new Error('Missing Cloudinary configuration');
    }
  }

  // Upload single file
  async uploadFile(file, options = {}) {
    try {
      this.validateConfig();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('api_key', this.apiKey);
      
      // Add optional parameters
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      
      if (options.public_id) {
        formData.append('public_id', options.public_id);
      }
      
      if (options.tags) {
        formData.append('tags', Array.isArray(options.tags) ? options.tags.join(',') : options.tags);
      }
      
      if (options.transformation) {
        formData.append('transformation', JSON.stringify(options.transformation));
      }
      
      if (options.context) {
        formData.append('context', options.context);
      }

      // Determine resource type
      const resourceType = this.getResourceType(file.type);
      const uploadUrl = `${this.baseUrl}/${resourceType}/upload`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }
      
      const result = await response.json();
      
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
        createdAt: result.created_at,
        originalFilename: result.original_filename,
        transformation: result.transformation,
        version: result.version
      };
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultiple(files, options = {}) {
    try {
      const uploadPromises = Array.from(files).map((file, index) => 
        this.uploadFile(file, {
          ...options,
          public_id: options.public_id ? `${options.public_id}_${index}` : undefined
        })
      );
      
      const results = await Promise.allSettled(uploadPromises);
      
      const successful = [];
      const failed = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push({
            index,
            file: files[index],
            result: result.value
          });
        } else {
          failed.push({
            index,
            file: files[index],
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
      console.error('Multiple upload failed:', error);
      throw error;
    }
  }

  // Upload with progress tracking
  async uploadWithProgress(file, options = {}, onProgress) {
    try {
      this.validateConfig();
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        formData.append('file', file);
        formData.append('upload_preset', this.uploadPreset);
        formData.append('api_key', this.apiKey);
        
        // Add optional parameters
        Object.keys(options).forEach(key => {
          if (options[key] !== undefined) {
            if (Array.isArray(options[key])) {
              formData.append(key, options[key].join(','));
            } else if (typeof options[key] === 'object') {
              formData.append(key, JSON.stringify(options[key]));
            } else {
              formData.append(key, options[key]);
            }
          }
        });
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round(percentComplete)
            });
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve({
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
              });
            } catch (parseError) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error?.message || 'Upload failed'));
            } catch (parseError) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload request failed'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
        
        // Start upload
        const resourceType = this.getResourceType(file.type);
        const uploadUrl = `${this.baseUrl}/${resourceType}/upload`;
        
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload with progress failed:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(publicId, resourceType = 'auto') {
    try {
      this.validateConfig();
      
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = await this.generateSignature({
        public_id: publicId,
        timestamp
      });
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('signature', signature);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp);
      
      const deleteUrl = `${this.baseUrl}/${resourceType}/destroy`;
      
      const response = await fetch(deleteUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Delete failed');
      }
      
      const result = await response.json();
      
      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
      throw error;
    }
  }

  // Generate optimized URL
  generateOptimizedUrl(publicId, transformations = {}) {
    try {
      let transformString = '';
      
      if (Object.keys(transformations).length > 0) {
        const transformArray = [];
        
        Object.keys(transformations).forEach(key => {
          const value = transformations[key];
          if (value !== undefined && value !== null) {
            transformArray.push(`${key}_${value}`);
          }
        });
        
        if (transformArray.length > 0) {
          transformString = transformArray.join(',') + '/';
        }
      }
      
      return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformString}${publicId}`;
    } catch (error) {
      console.error('URL generation failed:', error);
      throw error;
    }
  }

  // Generate video URL
  generateVideoUrl(publicId, transformations = {}) {
    try {
      let transformString = '';
      
      if (Object.keys(transformations).length > 0) {
        const transformArray = [];
        
        Object.keys(transformations).forEach(key => {
          const value = transformations[key];
          if (value !== undefined && value !== null) {
            transformArray.push(`${key}_${value}`);
          }
        });
        
        if (transformArray.length > 0) {
          transformString = transformArray.join(',') + '/';
        }
      }
      
      return `https://res.cloudinary.com/${this.cloudName}/video/upload/${transformString}${publicId}`;
    } catch (error) {
      console.error('Video URL generation failed:', error);
      throw error;
    }
  }

  // Get thumbnail for video
  getVideoThumbnail(publicId, transformations = {}) {
    const defaultTransforms = {
      resource_type: 'video',
      format: 'jpg',
      ...transformations
    };
    
    return this.generateOptimizedUrl(publicId, defaultTransforms);
  }

  // Validate file type and size
  validateFile(file, options = {}) {
    const { 
      maxSize = 50 * 1024 * 1024, // 50MB default
      allowedTypes = ['image/*', 'video/*', 'audio/*']
    } = options;
    
    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(maxSize)}`);
    }
    
    // Check file type
    const isValidType = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });
    
    if (!isValidType) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return true;
  }

  // Get resource type from MIME type
  getResourceType(mimeType) {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'video'; // Cloudinary uses 'video' for audio files
    } else {
      return 'raw';
    }
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate signature (simplified - in production, this should be done server-side)
  async generateSignature(params) {
    // Note: In production, signature generation should be done on the server
    // This is a simplified version for client-side usage
    
    try {
      const response = await fetch('/api/upload/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate signature');
      }
      
      const data = await response.json();
      return data.signature;
    } catch (error) {
      console.error('Signature generation failed:', error);
      throw error;
    }
  }

  // Get upload configuration
  getConfig() {
    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      uploadPreset: this.uploadPreset,
      baseUrl: this.baseUrl
    };
  }
}

// Create singleton instance
const cloudinaryUploader = new CloudinaryUploader();

export default cloudinaryUploader;
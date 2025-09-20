const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('../utils/jwt');
const { logger } = require('../utils/logger');
const { asyncHandler, authRateLimit, validateRequest } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(2).max(50).required(),
  bio: Joi.string().max(160).optional()
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(), // email or username
  password: Joi.string().required(),
  deviceInfo: Joi.object({
    deviceId: Joi.string().required(),
    deviceType: Joi.string().valid('web', 'mobile', 'tablet').required(),
    fcmToken: Joi.string().optional()
  }).optional()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', 
  authRateLimit,
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const { username, email, password, fullName, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      fullName,
      bio: bio || ''
    });

    await user.save();

    // Generate tokens
    const tokens = await jwt.generateTokenPair({
      id: user._id,
      username: user.username,
      email: user.email
    });

    // Save refresh token
    await user.addRefreshToken(tokens.refreshToken);

    // Log user action
    logger.logUserAction(user._id, 'user_registered', {
      username,
      email,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toPublicProfile(),
        tokens
      }
    });
  })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
  authRateLimit,
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password, deviceInfo } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      await User.findOneAndUpdate(
        { $or: [{ email: identifier }, { username: identifier }] },
        { $inc: { loginAttempts: 1 } }
      );
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.logSecurityEvent('login_attempt_locked_account', {
        userId: user._id,
        ip: req.ip
      });
      
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed attempts'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}`
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      
      logger.logSecurityEvent('login_failed_invalid_password', {
        userId: user._id,
        ip: req.ip,
        attemptCount: user.loginAttempts + 1
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const tokens = await jwt.generateTokenPair({
      id: user._id,
      username: user.username,
      email: user.email
    });

    // Save refresh token
    await user.addRefreshToken(tokens.refreshToken);

    // Update online status
    await user.updateOnlineStatus(true);

    // Save device info if provided
    if (deviceInfo) {
      await user.addDevice(deviceInfo);
    }

    // Log successful login
    logger.logUserAction(user._id, 'user_login', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      deviceInfo
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toPublicProfile(),
        tokens
      }
    });
  })
);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh',
  authRateLimit,
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    try {
      const tokens = await jwt.refreshAccessToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens }
      });
    } catch (error) {
      logger.logSecurityEvent('refresh_token_failed', {
        error: error.message,
        ip: req.ip
      });
      
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  })
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout',
  require('../middleware/auth').authenticateToken,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    // Remove refresh token from user
    if (refreshToken) {
      await req.user.removeRefreshToken(refreshToken);
    }

    // Blacklist current access token
    await jwt.blacklistToken(req.token);

    // Update offline status
    await req.user.updateOnlineStatus(false);

    // Log logout
    logger.logUserAction(req.user._id, 'user_logout', {
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all',
  require('../middleware/auth').authenticateToken,
  asyncHandler(async (req, res) => {
    // Clear all refresh tokens
    req.user.refreshTokens = [];
    req.user.devices = [];
    await req.user.save({ validateBeforeSave: false });

    // Update offline status
    await req.user.updateOnlineStatus(false);

    // Log logout from all devices
    logger.logUserAction(req.user._id, 'user_logout_all', {
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password',
  authRateLimit,
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If the email exists, password reset instructions have been sent'
      });
    }

    // Generate reset token
    const resetToken = await jwt.generatePasswordResetToken({
      id: user._id,
      email: user.email
    });

    // Save reset token to user (hashed)
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with reset token
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.logUserAction(user._id, 'password_reset_requested', {
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
      // Remove in production
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  })
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password',
  authRateLimit,
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    try {
      // Verify reset token
      const decoded = await jwt.verifyPasswordResetToken(token);
      
      // Hash the token to compare with stored one
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const user = await User.findOne({
        _id: decoded.id,
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+password');

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Update password
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.refreshTokens = []; // Invalidate all refresh tokens
      await user.save();

      logger.logUserAction(user._id, 'password_reset_completed', {
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      logger.logSecurityEvent('password_reset_failed', {
        error: error.message,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  })
);

// @route   POST /api/auth/change-password
// @desc    Change password (authenticated)
// @access  Private
router.post('/change-password',
  require('../middleware/auth').authenticateToken,
  validateRequest(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    logger.logUserAction(user._id, 'password_changed', {
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me',
  require('../middleware/auth').authenticateToken,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user.toPublicProfile()
      }
    });
  })
);

// @route   GET /api/auth/sessions
// @desc    Get user active sessions
// @access  Private
router.get('/sessions',
  require('../middleware/auth').authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('devices refreshTokens');
    
    const sessions = user.devices.map(device => ({
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      lastUsed: device.lastUsed,
      isActive: user.refreshTokens.some(token => 
        // You would need to decode and check if token belongs to this device
        true // Simplified for now
      )
    }));

    res.json({
      success: true,
      data: { sessions }
    });
  })
);

// @route   DELETE /api/auth/sessions/:deviceId
// @desc    Revoke specific session
// @access  Private
router.delete('/sessions/:deviceId',
  require('../middleware/auth').authenticateToken,
  asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    
    await req.user.removeDevice(deviceId);
    
    logger.logUserAction(req.user._id, 'session_revoked', {
      deviceId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  })
);

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Public
router.post('/verify-token',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    try {
      const decoded = await jwt.verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshTokens');
      
      if (!user || user.accountStatus !== 'active') {
        throw new Error('User not found or inactive');
      }

      res.json({
        success: true,
        valid: true,
        data: {
          user: user.toPublicProfile(),
          expiresAt: new Date(decoded.exp * 1000)
        }
      });
    } catch (error) {
      res.json({
        success: true,
        valid: false,
        message: error.message
      });
    }
  })
);

module.exports = router;
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class JWTManager {
  constructor() {
    this.signAsync = promisify(jwt.sign);
    this.verifyAsync = promisify(jwt.verify);
  }

  // Generate Access Token
  async generateAccessToken(payload, options = {}) {
    try {
      const defaultOptions = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: process.env.APP_NAME || 'Voice Social',
        audience: process.env.APP_URL || 'localhost'
      };

      const tokenOptions = { ...defaultOptions, ...options };
      
      const token = await this.signAsync(
        {
          ...payload,
          type: 'access',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        tokenOptions
      );

      return token;
    } catch (error) {
      logger.error('Error generating access token:', error.message);
      throw new Error('Token generation failed');
    }
  }

  // Generate Refresh Token
  async generateRefreshToken(payload, options = {}) {
    try {
      const defaultOptions = {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        issuer: process.env.APP_NAME || 'Voice Social',
        audience: process.env.APP_URL || 'localhost'
      };

      const tokenOptions = { ...defaultOptions, ...options };
      
      const token = await this.signAsync(
        {
          ...payload,
          type: 'refresh',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_REFRESH_SECRET,
        tokenOptions
      );

      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error.message);
      throw new Error('Refresh token generation failed');
    }
  }

  // Verify Access Token
  async verifyAccessToken(token) {
    try {
      const decoded = await this.verifyAsync(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        logger.error('Error verifying access token:', error.message);
        throw new Error('Token verification failed');
      }
    }
  }

  // Verify Refresh Token
  async verifyRefreshToken(token) {
    try {
      const decoded = await this.verifyAsync(token, process.env.JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        logger.error('Error verifying refresh token:', error.message);
        throw new Error('Refresh token verification failed');
      }
    }
  }

  // Generate Token Pair
  async generateTokenPair(payload) {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken({ id: payload.id })
      ]);

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.getTokenExpiry(process.env.JWT_EXPIRES_IN || '7d')
      };
    } catch (error) {
      logger.error('Error generating token pair:', error.message);
      throw new Error('Token pair generation failed');
    }
  }

  // Refresh Access Token
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // Find user and verify refresh token exists
      const user = await User.findById(decoded.id).select('refreshTokens username email');
      if (!user) {
        throw new Error('User not found');
      }

      // Check if refresh token exists in user's refresh tokens
      const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
      if (!tokenExists) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const newAccessToken = await this.generateAccessToken({
        id: user._id,
        username: user.username,
        email: user.email
      });

      return {
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        expiresIn: this.getTokenExpiry(process.env.JWT_EXPIRES_IN || '7d')
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error.message);
      throw error;
    }
  }

  // Generate Email Verification Token
  async generateEmailVerificationToken(payload) {
    try {
      const token = await this.signAsync(
        {
          ...payload,
          type: 'email_verification',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return token;
    } catch (error) {
      logger.error('Error generating email verification token:', error.message);
      throw new Error('Email verification token generation failed');
    }
  }

  // Generate Password Reset Token
  async generatePasswordResetToken(payload) {
    try {
      const token = await this.signAsync(
        {
          ...payload,
          type: 'password_reset',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return token;
    } catch (error) {
      logger.error('Error generating password reset token:', error.message);
      throw new Error('Password reset token generation failed');
    }
  }

  // Verify Email Verification Token
  async verifyEmailVerificationToken(token) {
    try {
      const decoded = await this.verifyAsync(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Email verification token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid email verification token');
      } else {
        logger.error('Error verifying email verification token:', error.message);
        throw new Error('Email verification token verification failed');
      }
    }
  }

  // Verify Password Reset Token
  async verifyPasswordResetToken(token) {
    try {
      const decoded = await this.verifyAsync(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Password reset token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid password reset token');
      } else {
        logger.error('Error verifying password reset token:', error.message);
        throw new Error('Password reset token verification failed');
      }
    }
  }

  // Decode Token Without Verification
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding token:', error.message);
      return null;
    }
  }

  // Check if Token is Expired
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Get Token Expiry in Seconds
  getTokenExpiry(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      y: 31536000
    };

    const match = expiry.match(/^(\d+)([smhdwy])$/);
    if (!match) {
      return 604800; // Default to 7 days
    }

    const [, value, unit] = match;
    return parseInt(value) * (units[unit] || 1);
  }

  // Blacklist Token (for logout)
  async blacklistToken(token) {
    try {
      // In a production environment, you might want to store blacklisted tokens
      // in Redis or a database with TTL equal to token expiry
      // For now, we'll just log it
      logger.info('Token blacklisted:', token.substring(0, 20) + '...');
      return true;
    } catch (error) {
      logger.error('Error blacklisting token:', error.message);
      throw error;
    }
  }

  // Validate Token Format
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }

  // Extract Token from Authorization Header
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Generate API Key
  async generateApiKey(payload) {
    try {
      const token = await this.signAsync(
        {
          ...payload,
          type: 'api_key',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: '1y' } // API keys expire in 1 year
      );

      return token;
    } catch (error) {
      logger.error('Error generating API key:', error.message);
      throw new Error('API key generation failed');
    }
  }

  // Verify API Key
  async verifyApiKey(token) {
    try {
      const decoded = await this.verifyAsync(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'api_key') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('API key expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid API key');
      } else {
        logger.error('Error verifying API key:', error.message);
        throw new Error('API key verification failed');
      }
    }
  }
}

module.exports = new JWTManager();
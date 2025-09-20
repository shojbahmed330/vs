const jwt = require('../utils/jwt');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = jwt.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    if (!jwt.isValidTokenFormat(token)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const decoded = await jwt.verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}`
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.logSecurityEvent('authentication_failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = jwt.extractTokenFromHeader(authHeader);
    
    if (token && jwt.isValidTokenFormat(token)) {
      const decoded = await jwt.verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshTokens');
      
      if (user && user.accountStatus === 'active') {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Log but don't fail
    logger.logSecurityEvent('optional_auth_failed', {
      error: error.message,
      ip: req.ip
    });
    next();
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has admin privileges (you can customize this logic)
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    next();
  } catch (error) {
    logger.logSecurityEvent('admin_auth_failed', {
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      message: 'Admin authentication failed'
    });
  }
};

// API Key authentication middleware
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }

    const decoded = await jwt.verifyApiKey(apiKey);
    req.apiKey = decoded;
    
    next();
  } catch (error) {
    logger.logSecurityEvent('api_key_auth_failed', {
      error: error.message,
      ip: req.ip
    });
    
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MongoStore({
      uri: process.env.MONGODB_URI,
      collectionName: 'rate_limits',
      expireTimeMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000
    }),
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user_${req.user._id}` : req.ip;
    },
    handler: (req, res) => {
      logger.logSecurityEvent('rate_limit_exceeded', {
        ip: req.ip,
        userId: req.user?._id,
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.round(options.windowMs / 1000) || 900
      });
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Specific rate limiters
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
});

const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: {
    success: false,
    message: 'API rate limit exceeded'
  }
});

const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    message: 'Upload rate limit exceeded'
  }
});

// CORS middleware
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-domain.com',
      'https://your-app.vercel.app'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Device-ID',
    'X-Platform'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Security headers middleware
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.logError(err, 'errorHandler');
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
  }
  
  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Not found middleware
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// Permission middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has the required permission
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Owner or admin middleware
const ownerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const ownerId = typeof getOwnerId === 'function' 
        ? await getOwnerId(req) 
        : req.params[getOwnerId] || req.body[getOwnerId];
      
      if (req.user._id.toString() === ownerId.toString() || 
          req.user.role === 'admin' || 
          req.user.isAdmin) {
        next();
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authenticateAdmin,
  authenticateApiKey,
  createRateLimit,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  corsOptions,
  securityHeaders,
  requestLogger,
  errorHandler,
  notFound,
  asyncHandler,
  validateRequest,
  requirePermission,
  ownerOrAdmin
};
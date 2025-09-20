require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import configurations
const databaseConnection = require('./config/database');
const socketManager = require('./config/socket');
const firebaseAdmin = require('./config/firebase');
const { logger } = require('./utils/logger');

// Import middleware
const {
  corsOptions,
  securityHeaders,
  requestLogger,
  errorHandler,
  notFound,
  apiRateLimit
} = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const searchRoutes = require('./routes/search');

// Create Express app
const app = express();
const server = http.createServer(app);

// Environment variables validation
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Global middleware
app.use(helmet(securityHeaders));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = databaseConnection.isConnectionActive();
  const socketStats = socketManager.getStats();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: dbStatus ? 'connected' : 'disconnected',
      socket: socketManager.isInitialized ? 'initialized' : 'not_initialized',
      firebase: firebaseAdmin.isInitialized ? 'initialized' : 'not_initialized'
    },
    stats: {
      ...socketStats,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Voice Social API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      upload: '/api/upload',
      search: '/api/search'
    },
    status: 'active',
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await databaseConnection.connect();
    
    // Initialize Firebase
    logger.info('Initializing Firebase...');
    firebaseAdmin.initialize();
    
    // Initialize Socket.io
    logger.info('Initializing Socket.io...');
    socketManager.initialize(server);
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed:', error.message);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  server.close(async () => {
    try {
      await databaseConnection.disconnect();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  server.close(async () => {
    try {
      await databaseConnection.disconnect();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  logger.error(error.stack);
  
  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 API base: http://localhost:${PORT}/api`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`💻 Socket.io running on port ${process.env.SOCKET_PORT || PORT}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = { app, server };
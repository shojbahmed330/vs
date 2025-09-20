const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'blue',
  debug: 'white',
  silly: 'grey'
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  exitOnError: false
});

// Stream for morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Additional helper methods
logger.logError = (error, context = '') => {
  const errorMessage = error.stack || error.message || error;
  logger.error(`${context ? `[${context}] ` : ''}${errorMessage}`);
};

logger.logRequest = (req, res, responseTime) => {
  const { method, originalUrl, ip } = req;
  const { statusCode } = res;
  const contentLength = res.get('Content-Length') || 0;
  
  logger.http(
    `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms - ${ip}`
  );
};

logger.logUserAction = (userId, action, details = {}) => {
  logger.info(`User Action [${userId}]: ${action}`, details);
};

logger.logSystemEvent = (event, details = {}) => {
  logger.info(`System Event: ${event}`, details);
};

logger.logSecurityEvent = (event, details = {}) => {
  logger.warn(`Security Event: ${event}`, details);
};

logger.logDatabaseQuery = (query, duration) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`DB Query (${duration}ms): ${query}`);
  }
};

logger.logApiCall = (service, endpoint, duration, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level](`API Call [${service}]: ${endpoint} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
};

logger.logSocketEvent = (event, socketId, data = {}) => {
  logger.debug(`Socket Event [${socketId}]: ${event}`, data);
};

logger.logNotification = (type, recipient, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Notification [${type}] to ${recipient}: ${success ? 'SENT' : 'FAILED'}`);
};

logger.logFileOperation = (operation, file, success = true) => {
  const level = success ? 'info' : 'error';
  logger[level](`File ${operation}: ${file} - ${success ? 'SUCCESS' : 'FAILED'}`);
};

module.exports = { logger };
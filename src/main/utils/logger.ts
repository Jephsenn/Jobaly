import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { LOGS_DIR, LOG_LEVEL, LOG_MAX_SIZE, LOG_MAX_FILES } from '@shared/constants';

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Custom format to redact PII
const redactPII = winston.format((info) => {
  // Redact email addresses
  if (typeof info.message === 'string') {
    info.message = info.message.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL_REDACTED]');
  }
  
  // Redact phone numbers
  if (typeof info.message === 'string') {
    info.message = info.message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
  }
  
  return info;
});

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    redactPII(),
    winston.format.json()
  ),
  transports: [
    // Error log
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
    }),
    // Combined log
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'app.log'),
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
    }),
  ],
});

// Console output in development
if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;

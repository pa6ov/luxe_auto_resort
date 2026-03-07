/**
 * Custom Error Classes and Error Handling Utilities
 */

// Error codes for better frontend handling
const ErrorCodes = {
  // Auth errors (1000-1099)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EMAIL_REQUIRED: 'EMAIL_REQUIRED',
  EMAIL_INVALID: 'EMAIL_INVALID',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  PASSWORD_WEAK: 'PASSWORD_WEAK',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Resource errors (2000-2099)
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  IN_USE: 'IN_USE',
  
  // Validation errors (3000-3099)
  INVALID_DATE: 'INVALID_DATE',
  DATE_IN_PAST: 'DATE_IN_PAST',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  FIELD_TOO_SHORT: 'FIELD_TOO_SHORT',
  FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  INVALID_VALUE: 'INVALID_VALUE',
  
  // Server errors (5000-5099)
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

// Custom Application Error
class AppError extends Error {
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational vs programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.errorCode,
        ...(this.details && { details: this.details })
      }
    };
  }
}

// Validation Error - 400
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

// Authentication Error - 401
class AuthError extends AppError {
  constructor(message, errorCode = ErrorCodes.UNAUTHORIZED) {
    super(message, 401, errorCode);
  }
}

// Forbidden Error - 403
class ForbiddenError extends AppError {
  constructor(message = 'Достъп отказан') {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}

// Not Found Error - 404
class NotFoundError extends AppError {
  constructor(resource = 'Ресурс') {
    super(`${resource} не е намерен`, 404, ErrorCodes.NOT_FOUND);
  }
}

// Conflict Error - 409
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, ErrorCodes.ALREADY_EXISTS);
  }
}

// Database Error - 500
class DatabaseError extends AppError {
  constructor(message = 'Грешка при работа с базата данни') {
    super(message, 500, ErrorCodes.DATABASE_ERROR);
  }
}

// Async Handler Wrapper - eliminates try-catch in route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation Helpers
const validators = {
  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password strength validation (min 6 chars, at least one letter and one number)
  isStrongPassword(password) {
    if (!password || password.length < 6) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
  },

  // Date validation
  isValidDate(dateStr) {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  },

  // Check if date is in the past
  isPastDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date < now;
  },

  // Required field checker
  required(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} е задължително поле`;
    }
    return null;
  },

  // Min length checker
  minLength(value, length, fieldName) {
    if (value && value.length < length) {
      return `${fieldName} трябва да е поне ${length} символа`;
    }
    return null;
  },

  // Max length checker
  maxLength(value, length, fieldName) {
    if (value && value.length > length) {
      return `${fieldName} не може да надвишава ${length} символа`;
    }
    return null;
  }
};

// Validate and throw error helper
const validate = {
  required: (value, fieldName, message) => {
    const error = validators.required(value, fieldName);
    if (error) throw new ValidationError(message || error);
  },

  email: (email, fieldName = 'Имейл') => {
    validators.required(email, fieldName);
    if (!validators.isValidEmail(email)) {
      throw new ValidationError('Невалиден имейл адрес');
    }
  },

  password: (password, minLength = 6) => {
    validators.required(password, 'Парола');
    if (!validators.isStrongPassword(password) && password.length < minLength) {
      throw new ValidationError(`Паролата трябва да е поне ${minLength} символа`);
    }
  },

  date: (dateStr, fieldName = 'Дата') => {
    validators.required(dateStr, fieldName);
    if (!validators.isValidDate(dateStr)) {
      throw new ValidationError(`Невалидна ${fieldName.toLowerCase()}`);
    }
  },

  dateNotPast: (dateStr, fieldName = 'Дата') => {
    validate.date(dateStr, fieldName);
    if (validators.isPastDate(dateStr)) {
      throw new ValidationError(`${fieldName} не може да бъде в миналото`);
    }
  },

  minLength: (value, length, fieldName) => {
    const error = validators.minLength(value, length, fieldName);
    if (error) throw new ValidationError(error);
  },

  maxLength: (value, length, fieldName) => {
    const error = validators.maxLength(value, length, fieldName);
    if (error) throw new ValidationError(error);
  },

  inRange: (value, min, max, fieldName) => {
    if (value < min || value > max) {
      throw new ValidationError(`${fieldName} трябва да е между ${min} и ${max}`);
    }
  },

  oneOf: (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(`Невалидна стойност за ${fieldName}`);
    }
  }
};

// Centralized error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    code: err.errorCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle operational errors (known errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Невалиден токен за достъп',
        code: ErrorCodes.TOKEN_INVALID
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Токенът е изтекъл. Моля, влезте отново',
        code: ErrorCodes.TOKEN_EXPIRED
      }
    });
  }

  // Handle MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: {
        message: 'Този запис вече съществува',
        code: ErrorCodes.ALREADY_EXISTS
      }
    });
  }

  // Handle MySQL foreign key constraint error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Невалидна референция към свързан запис',
        code: ErrorCodes.INVALID_VALUE
      }
    });
  }

  // Handle other database errors
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Грешка при работа с базата данни',
        code: ErrorCodes.DATABASE_ERROR
      }
    });
  }

  // Handle unknown errors - don't leak internal details
  res.status(500).json({
    success: false,
    error: {
      message: 'Възникна неочаквана грешка. Моля, опитайте по-късно',
      code: ErrorCodes.INTERNAL_ERROR
    }
  });
};

// Not Found handler for undefined routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Страницата или ресурсът не е намерен',
      code: ErrorCodes.NOT_FOUND
    }
  });
};

module.exports = {
  ErrorCodes,
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  asyncHandler,
  validators,
  validate,
  errorHandler,
  notFoundHandler
};


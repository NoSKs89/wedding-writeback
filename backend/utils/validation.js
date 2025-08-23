const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

// --- INPUT SANITIZATION UTILITIES ---

/**
 * Sanitize and validate MongoDB query objects to prevent NoSQL injection
 * @param {Object} query - The query object to sanitize
 * @returns {Object} - Sanitized query object
 */
const sanitizeMongoQuery = (query) => {
  if (!query || typeof query !== 'object') {
    return {};
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Remove any keys that start with $ (MongoDB operators)
    if (key.startsWith('$')) {
      console.warn(`[SECURITY] Rejected MongoDB operator in query key: ${key}`);
      continue;
    }
    
    // Sanitize the key
    const cleanKey = validator.escape(key);
    
    // Sanitize the value
    if (typeof value === 'string') {
      // Remove any MongoDB operators from string values
      if (value.includes('$') || value.includes('{') || value.includes('}')) {
        console.warn(`[SECURITY] Suspicious MongoDB operators detected in value: ${value}`);
        sanitized[cleanKey] = validator.escape(value.replace(/[\$\{\}]/g, ''));
      } else {
        sanitized[cleanKey] = validator.escape(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects, but limit depth
      sanitized[cleanKey] = sanitizeMongoQuery(value);
    } else {
      sanitized[cleanKey] = value;
    }
  }
  
  return sanitized;
};

/**
 * Sanitize user text input to prevent XSS and other attacks
 * @param {string} input - The input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
const sanitizeTextInput = (input, options = {}) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const { 
    maxLength = 1000,
    allowHTML = false,
    stripNewlines = false 
  } = options;

  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove or escape HTML
  if (allowHTML) {
    // Use DOMPurify to allow safe HTML
    sanitized = DOMPurify.sanitize(sanitized);
  } else {
    // Escape all HTML
    sanitized = validator.escape(sanitized);
  }

  // Remove newlines if requested
  if (stripNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  return sanitized;
};

/**
 * Validate and sanitize email addresses
 * @param {string} email - Email to validate
 * @returns {string|null} - Sanitized email or null if invalid
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  
  if (!validator.isEmail(trimmed)) {
    return null;
  }

  // Additional security: ensure no dangerous characters
  if (trimmed.includes('<') || trimmed.includes('>') || trimmed.includes('"')) {
    return null;
  }

  return trimmed;
};

/**
 * Validate custom ID format (wedding IDs, etc.)
 * @param {string} customId - The custom ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
const validateCustomId = (customId) => {
  if (!customId || typeof customId !== 'string') {
    return false;
  }

  // Only allow alphanumeric, hyphens, and underscores
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(customId) && customId.length >= 3 && customId.length <= 50;
};

/**
 * Sanitize file names for S3 uploads
 * @param {string} fileName - The file name to sanitize
 * @returns {string} - Sanitized file name
 */
const sanitizeFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return 'unnamed_file';
  }

  return fileName
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[\/\\]/g, '')        // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscores
    .substring(0, 100);            // Limit length
};

/**
 * Rate limiting check (simple in-memory implementation)
 * For production, use Redis or similar
 */
const rateLimiters = new Map();

const checkRateLimit = (identifier, maxRequests = 10, windowMs = 60000) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimiters.has(identifier)) {
    rateLimiters.set(identifier, []);
  }
  
  const requests = rateLimiters.get(identifier);
  
  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimiters.set(identifier, recentRequests);
  
  return true; // Request allowed
};

/**
 * Validate RSVP input data
 * @param {Object} rsvpData - RSVP data to validate
 * @returns {Object} - { isValid: boolean, errors: string[], sanitized: Object }
 */
const validateRSVPData = (rsvpData) => {
  const errors = [];
  const sanitized = {};

  // Validate wedding ID
  if (!validateCustomId(rsvpData.weddingId)) {
    errors.push('Invalid wedding ID format');
  } else {
    sanitized.weddingId = rsvpData.weddingId;
  }

  // Validate names
  const firstName = sanitizeTextInput(rsvpData.firstName, { maxLength: 50, stripNewlines: true });
  const lastName = sanitizeTextInput(rsvpData.lastName, { maxLength: 50, stripNewlines: true });
  
  if (!firstName || firstName.length < 1) {
    errors.push('First name is required');
  } else {
    sanitized.firstName = firstName;
  }
  
  if (!lastName || lastName.length < 1) {
    errors.push('Last name is required');
  } else {
    sanitized.lastName = lastName;
  }

  // Validate email (optional)
  if (rsvpData.email) {
    const email = sanitizeEmail(rsvpData.email);
    if (!email) {
      errors.push('Invalid email format');
    } else {
      sanitized.email = email;
    }
  }

  // Validate boolean fields
  if (typeof rsvpData.attending !== 'boolean') {
    errors.push('Attending must be true or false');
  } else {
    sanitized.attending = rsvpData.attending;
  }

  // Validate numeric fields
  const guestCount = parseInt(rsvpData.guestCount, 10);
  if (isNaN(guestCount) || guestCount < 0 || guestCount > 20) {
    errors.push('Guest count must be between 0 and 20');
  } else {
    sanitized.guestCount = guestCount;
  }

  // Validate message (optional)
  if (rsvpData.message) {
    const message = sanitizeTextInput(rsvpData.message, { maxLength: 500 });
    sanitized.message = message;
  }

  // Validate meal choices (if provided)
  if (rsvpData.mealChoices && typeof rsvpData.mealChoices === 'object') {
    const sanitizedMealChoices = {};
    for (const [key, value] of Object.entries(rsvpData.mealChoices)) {
      const cleanKey = sanitizeTextInput(key, { maxLength: 50, stripNewlines: true });
      const cleanValue = sanitizeTextInput(String(value), { maxLength: 100, stripNewlines: true });
      if (cleanKey && cleanValue) {
        sanitizedMealChoices[cleanKey] = cleanValue;
      }
    }
    sanitized.mealChoices = sanitizedMealChoices;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate prompt response data
 * @param {Object} promptData - Prompt response data to validate
 * @returns {Object} - { isValid: boolean, errors: string[], sanitized: Object }
 */
const validatePromptResponseData = (promptData) => {
  const errors = [];
  const sanitized = {};

  // Validate wedding ID
  if (!validateCustomId(promptData.weddingId)) {
    errors.push('Invalid wedding ID format');
  } else {
    sanitized.weddingId = promptData.weddingId;
  }

  // Validate names (if not anonymous)
  if (!promptData.isAnonymous) {
    const firstName = sanitizeTextInput(promptData.firstName, { maxLength: 50, stripNewlines: true });
    const lastName = sanitizeTextInput(promptData.lastName, { maxLength: 50, stripNewlines: true });
    
    if (!firstName || firstName.length < 1) {
      errors.push('First name is required for non-anonymous responses');
    } else {
      sanitized.firstName = firstName;
    }
    
    if (!lastName || lastName.length < 1) {
      errors.push('Last name is required for non-anonymous responses');
    } else {
      sanitized.lastName = lastName;
    }

    // Validate email (optional)
    if (promptData.email) {
      const email = sanitizeEmail(promptData.email);
      if (!email) {
        errors.push('Invalid email format');
      } else {
        sanitized.email = email;
      }
    }
  } else {
    sanitized.isAnonymous = true;
  }

  // Validate responses object
  if (!promptData.responses || typeof promptData.responses !== 'object') {
    errors.push('Responses must be provided as an object');
  } else {
    const sanitizedResponses = {};
    for (const [questionId, response] of Object.entries(promptData.responses)) {
      // Validate question ID format
      if (!questionId.match(/^[a-zA-Z0-9_-]+$/)) {
        continue; // Skip invalid question IDs
      }
      
      // Sanitize response text
      const sanitizedResponse = sanitizeTextInput(String(response), { maxLength: 5000 });
      if (sanitizedResponse) {
        sanitizedResponses[questionId] = sanitizedResponse;
      }
    }
    sanitized.responses = sanitizedResponses;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

module.exports = {
  sanitizeMongoQuery,
  sanitizeTextInput,
  sanitizeEmail,
  validateCustomId,
  sanitizeFileName,
  checkRateLimit,
  validateRSVPData,
  validatePromptResponseData
}; 
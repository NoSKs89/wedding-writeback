/**
 * SENSITIVE CONFIGURATION TEMPLATE
 * Copy this file to config/secrets.js and fill in your actual values
 * DO NOT commit config/secrets.js to version control
 */

// =============================================================================
// PRODUCTION CONFIGURATION
// =============================================================================

// Production URLs and Domains
const PRODUCTION = {
  // Main application domain
  SITE_URL: 'https://yourdomain.com', // Replace with your actual domain

  // AWS Configuration
  AWS_REGION_S3: 'us-east-2',
  AWS_REGION_SES: 'us-east-2',
  AWS_S3_BUCKET_NAME: 'your-production-bucket', // Replace with your actual S3 bucket

  // AWS API Gateway URL
  AWS_API_BASE_URL: 'https://your-api-gateway-url.execute-api.us-east-2.amazonaws.com/dev/api', // Replace with your actual API Gateway URL

  // Email Configuration
  RSVP_TO_EMAIL: 'your-email@example.com', // Replace with your actual email
  RSVP_FROM_EMAIL: 'noreply@yourdomain.com', // Replace with your actual noreply email

  // Database
  MONGO_URI: 'mongodb+srv://username:password@cluster.mongodb.net/wedding-writeback?retryWrites=true&w=majority',

  // CORS Allowed Origins
  ALLOWED_ORIGINS: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ]
};

// =============================================================================
// DEVELOPMENT CONFIGURATION
// =============================================================================

const DEVELOPMENT = {
  // Test credentials for development
  TEST_CUSTOM_ID: 'test',
  TEST_EMAIL: 'test@example.com',
  TEST_PASSWORD: 'test',

  // Development URLs
  SITE_URL: 'http://localhost:3000',

  // AWS Configuration (use localstack if needed)
  AWS_REGION_S3: 'us-east-2',
  AWS_REGION_SES: 'us-east-2',
  AWS_S3_BUCKET_NAME: 'dev-wedding-app-bucket',

  // Local API URL for development
  LOCAL_API_BASE_URL: 'http://localhost:5000/api',
  AWS_API_BASE_URL: 'https://your-dev-api-gateway-url.execute-api.us-east-2.amazonaws.com/dev/api',

  // Development email configuration
  RSVP_TO_EMAIL: 'dev@localhost',
  RSVP_FROM_EMAIL: 'noreply@localhost',

  // Development database
  MONGO_URI: 'mongodb://localhost:27017/wedding-writeback',

  // CORS Allowed Origins for development
  ALLOWED_ORIGINS: [
    'http://localhost:3000'
  ]
};

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST = {
  // Test credentials
  TEST_CUSTOM_ID: 'test',
  TEST_EMAIL: 'test@example.com',
  TEST_PASSWORD: 'test',

  SITE_URL: 'http://localhost:3001',

  // Test AWS Configuration
  AWS_REGION_S3: 'us-east-2',
  AWS_REGION_SES: 'us-east-2',
  AWS_S3_BUCKET_NAME: 'test-wedding-app-bucket',

  // Test API URLs
  LOCAL_API_BASE_URL: 'http://localhost:5001/api',
  AWS_API_BASE_URL: 'https://test-api-gateway-url.execute-api.us-east-2.amazonaws.com/dev/api',

  // Test email configuration
  RSVP_TO_EMAIL: 'test@localhost',
  RSVP_FROM_EMAIL: 'test-noreply@localhost',

  // Test database
  MONGO_URI: 'mongodb://localhost:27017/wedding-writeback-test',

  // CORS Allowed Origins for testing
  ALLOWED_ORIGINS: [
    'http://localhost:3001'
  ]
};

// =============================================================================
// ENVIRONMENT DETECTION & CONFIGURATION
// =============================================================================

/**
 * Get the current environment
 * @returns {string} Current environment (production, development, test)
 */
function getEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  return env.toLowerCase();
}

/**
 * Get configuration for the current environment
 * @returns {object} Environment-specific configuration
 */
function getConfig() {
  const env = getEnvironment();

  switch (env) {
    case 'production':
    case 'prod':
      return PRODUCTION;
    case 'test':
    case 'testing':
      return TEST;
    case 'development':
    case 'dev':
    default:
      return DEVELOPMENT;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export configuration object
const config = getConfig();

// Individual exports for backward compatibility
module.exports = {
  // Current environment config
  ...config,

  // Environment detection
  getEnvironment,
  getConfig,

  // Direct environment objects
  PRODUCTION,
  DEVELOPMENT,
  TEST
};

// ES Module support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = module.exports;
}

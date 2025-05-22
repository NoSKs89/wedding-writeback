// src/config/apiConfig.js

// --- Backend Configuration ---
// Set this to true to use the local backend, false for the AWS backend.
export const USE_LOCAL_BACKEND = false; // Example: true for local, false for AWS

export const LOCAL_API_BASE_URL = 'http://localhost:5000/api';
export const AWS_API_BASE_URL = 'https://dzqec1uyx0.execute-api.us-east-1.amazonaws.com/dev/api'; // Ensure this is your correct AWS URL

/**
 * Returns the appropriate API base URL based on the USE_LOCAL_BACKEND setting.
 * @returns {string} The API base URL.
 */
export const getApiBaseUrl = () => {
  return USE_LOCAL_BACKEND ? LOCAL_API_BASE_URL : AWS_API_BASE_URL;
};

// You can also export the determined apiBaseUrl directly if you prefer not to call a function everywhere
export const API_BASE_URL = getApiBaseUrl(); 
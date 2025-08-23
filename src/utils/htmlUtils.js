/**
 * Utility functions for handling HTML entities and text formatting
 */

/**
 * Decodes HTML entities in a string
 * Handles common entities like &#x27; (apostrophe), &amp; (ampersand), etc.
 * @param {string} text - The text containing HTML entities
 * @returns {string} - The decoded text
 */
export const decodeHtmlEntities = (text) => {
  if (typeof text !== 'string') {
    return text;
  }

  // Create a temporary DOM element to leverage browser's built-in HTML entity decoding
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

/**
 * Safely decodes HTML entities with fallback
 * @param {string} text - The text to decode
 * @returns {string} - The decoded text or original text if decoding fails
 */
export const safeDecodeHtmlEntities = (text) => {
  try {
    return decodeHtmlEntities(text);
  } catch (error) {
    console.warn('Failed to decode HTML entities:', error);
    return text;
  }
};

/**
 * Decodes HTML entities and preserves line breaks for display
 * @param {string} text - The text to process
 * @returns {string} - The processed text
 */
export const decodeAndFormatText = (text) => {
  if (typeof text !== 'string') {
    return text;
  }
  
  // First decode HTML entities
  const decoded = safeDecodeHtmlEntities(text);
  
  // Return the decoded text (React will handle line breaks in most cases)
  return decoded;
};

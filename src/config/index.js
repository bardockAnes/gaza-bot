/**
 * @file index.js
 * @description Configuration loader for YouTube automation bot
 */

require('dotenv').config();
const defaultConfig = require('./default');

/**
 * Configuration system that merges default settings with environment variables
 * and custom overrides
 */
const config = {
  ...defaultConfig,
  
  // Override settings from environment variables
  urls: {
    ...defaultConfig.urls,
    youtube: process.env.YOUTUBE_URL || defaultConfig.urls.youtube
  }
};

/**
 * Allows access to configuration by path
 * @param {string} path - Dot notation path (e.g., 'browser.headless')
 * @param {any} defaultValue - Value to return if path doesn't exist
 * @returns {any} Configuration value
 */
config.get = function(path, defaultValue = undefined) {
  const parts = path.split('.');
  let current = this;
  
  for (const part of parts) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  
  return current;
};

module.exports = config;

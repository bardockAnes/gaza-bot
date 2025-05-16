/**
 * @file dataService.js
 * @description Service for handling data loading and saving
 */

const fs = require('fs-extra');

class DataService {
  constructor(config) {
    this.channelsPath = config.channelsPath;
    this.commentsPath = config.commentsPath;
    this.settingsPath = config.settingsPath;
  }
  
  /**
   * Load channels from file
   * @returns {Promise<Array>} Channels array
   */
  async loadChannels() {
    try {
      if (!await fs.pathExists(this.channelsPath)) {
        return [];
      }
      
      return await fs.readJson(this.channelsPath);
    } catch (error) {
      console.error(`Error loading channels: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Save channels to file
   * @param {Array} channels - Channels array
   */
  async saveChannels(channels) {
    try {
      await fs.writeJson(this.channelsPath, channels, { spaces: 2 });
    } catch (error) {
      console.error(`Error saving channels: ${error.message}`);
    }
  }
  
  /**
   * Load comments from file
   * @returns {Promise<Array>} Comments array
   */
  async loadComments() {
    try {
      if (!await fs.pathExists(this.commentsPath)) {
        return [];
      }
      
      return await fs.readJson(this.commentsPath);
    } catch (error) {
      console.error(`Error loading comments: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Load settings from file
   * @returns {Promise<Object>} Settings object
   */
  async loadSettings() {
    // Default settings
    const defaultSettings = {
      watchTimePercentage: 70,
      minWatchTimeSeconds: 60,
      maxWatchTimeSeconds: 600,
      likeVideos: true,
      subscribeToChannels: true,
      pauseBetweenChannelsSeconds: 30
    };
    
    try {
      if (!await fs.pathExists(this.settingsPath)) {
        return defaultSettings;
      }
      
      return await fs.readJson(this.settingsPath);
    } catch (error) {
      console.error(`Error loading settings: ${error.message}`);
      return defaultSettings;
    }
  }
  
  /**
   * Save settings to file
   * @param {Object} settings - Settings object
   */
  async saveSettings(settings) {
    try {
      await fs.writeJson(this.settingsPath, settings, { spaces: 2 });
    } catch (error) {
      console.error(`Error saving settings: ${error.message}`);
    }
  }
  
  /**
   * Save comments to file
   * @param {Array} comments - Comments array
   */
  async saveComments(comments) {
    try {
      await fs.writeJson(this.commentsPath, comments, { spaces: 2 });
    } catch (error) {
      console.error(`Error saving comments: ${error.message}`);
    }
  }
}

module.exports = DataService;

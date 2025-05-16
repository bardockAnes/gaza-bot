/**
 * @file supportSettingsMenu.js
 * @description Support settings menu for Gaza Support
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('./menu');

/**
 * Support Settings menu handler
 */
class SupportSettingsMenuHandler {
  constructor() {
    this.settingsPath = path.resolve(__dirname, '../data/gazaSupport/settings.json');
  }
  
  /**
   * Display the support settings menu
   */
  async showMenu() {
    try {
      // Load current settings
      const settings = await this.loadSettings();
      
      const options = [
        `Watch Time: ${settings.watchTimePercentage}%`,
        `Min Watch Time: ${settings.minWatchTimeSeconds}s`,
        `Max Watch Time: ${settings.maxWatchTimeSeconds}s`,
        `Like Videos: ${settings.likeVideos ? 'Enabled' : 'Disabled'}`,
        `Subscribe to Channels: ${settings.subscribeToChannels ? 'Enabled' : 'Disabled'}`,
        `Pause Between Channels: ${settings.pauseBetweenChannelsSeconds}s`,
        'Reset to Defaults'
      ];
      
      menu.showMenu('Support Settings', options);
      
      const choice = await menu.getInput('Enter your choice');
      await this.handleChoice(choice, settings);
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Handle settings menu choices
   * @param {string} choice - User's menu choice
   * @param {Object} settings - Current settings
   */
  async handleChoice(choice, settings) {
    switch(choice) {
      case '1': // Watch Time Percentage
        await this.changeWatchTimePercentage(settings);
        break;
        
      case '2': // Min Watch Time
        await this.changeMinWatchTime(settings);
        break;
        
      case '3': // Max Watch Time
        await this.changeMaxWatchTime(settings);
        break;
        
      case '4': // Toggle Like Videos
        await this.toggleLikeVideos(settings);
        break;
        
      case '5': // Toggle Subscribe
        await this.toggleSubscribe(settings);
        break;
        
      case '6': // Pause Between Channels
        await this.changePauseTime(settings);
        break;
        
      case '7': // Reset to Defaults
        await this.resetToDefaults();
        break;
        
      case '0': // Back to Gaza Support menu
        return; // Will return to parent menu
        
      default:
        console.log('\nu274c Invalid option. Please try again.');
        await menu.waitForEnter();
        break;
    }
    
    // After executing an action, show this menu again
    await this.showMenu();
  }
  
  /**
   * Load settings from file
   * @returns {Object} Settings object
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
      // Check if settings file exists
      if (!await fs.pathExists(this.settingsPath)) {
        // Create default settings file
        await fs.writeJson(this.settingsPath, defaultSettings, { spaces: 2 });
        return defaultSettings;
      }
      
      // Load settings from file
      return await fs.readJson(this.settingsPath);
    } catch (error) {
      console.error(`Error loading settings: ${error.message}`);
      return defaultSettings;
    }
  }
  
  /**
   * Save settings to file
   * @param {Object} settings - Settings to save
   */
  async saveSettings(settings) {
    try {
      await fs.writeJson(this.settingsPath, settings, { spaces: 2 });
      console.log('\nu2705 Settings saved successfully!');
    } catch (error) {
      console.error(`Error saving settings: ${error.message}`);
    }
  }
  
  /**
   * Change watch time percentage
   * @param {Object} settings - Current settings
   */
  async changeWatchTimePercentage(settings) {
    try {
      console.log('\nu27a1ufe0f Change watch time percentage');
      console.log(`Current value: ${settings.watchTimePercentage}%`);
      
      const input = await menu.getInput('Enter new percentage (10-100)');
      
      if (input === '0' || input === 'EMPTY_INPUT') {
        console.log('\nu274c Change cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      const newValue = parseInt(input);
      
      if (isNaN(newValue) || newValue < 10 || newValue > 100) {
        console.log('\nu274c Invalid value! Must be between 10 and 100.');
        await menu.waitForEnter();
        return;
      }
      
      // Update settings
      settings.watchTimePercentage = newValue;
      await this.saveSettings(settings);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Change minimum watch time
   * @param {Object} settings - Current settings
   */
  async changeMinWatchTime(settings) {
    try {
      console.log('\nu27a1ufe0f Change minimum watch time');
      console.log(`Current value: ${settings.minWatchTimeSeconds} seconds`);
      
      const input = await menu.getInput('Enter new minimum watch time in seconds (10-300)');
      
      if (input === '0' || input === 'EMPTY_INPUT') {
        console.log('\nu274c Change cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      const newValue = parseInt(input);
      
      if (isNaN(newValue) || newValue < 10 || newValue > 300) {
        console.log('\nu274c Invalid value! Must be between 10 and 300 seconds.');
        await menu.waitForEnter();
        return;
      }
      
      if (newValue > settings.maxWatchTimeSeconds) {
        console.log('\nu274c Minimum watch time cannot be greater than maximum watch time!');
        await menu.waitForEnter();
        return;
      }
      
      // Update settings
      settings.minWatchTimeSeconds = newValue;
      await this.saveSettings(settings);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Change maximum watch time
   * @param {Object} settings - Current settings
   */
  async changeMaxWatchTime(settings) {
    try {
      console.log('\nu27a1ufe0f Change maximum watch time');
      console.log(`Current value: ${settings.maxWatchTimeSeconds} seconds`);
      
      const input = await menu.getInput('Enter new maximum watch time in seconds (60-3600)');
      
      if (input === '0' || input === 'EMPTY_INPUT') {
        console.log('\nu274c Change cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      const newValue = parseInt(input);
      
      if (isNaN(newValue) || newValue < 60 || newValue > 3600) {
        console.log('\nu274c Invalid value! Must be between 60 and 3600 seconds.');
        await menu.waitForEnter();
        return;
      }
      
      if (newValue < settings.minWatchTimeSeconds) {
        console.log('\nu274c Maximum watch time cannot be less than minimum watch time!');
        await menu.waitForEnter();
        return;
      }
      
      // Update settings
      settings.maxWatchTimeSeconds = newValue;
      await this.saveSettings(settings);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Toggle like videos setting
   * @param {Object} settings - Current settings
   */
  async toggleLikeVideos(settings) {
    try {
      console.log('\nu27a1ufe0f Toggle like videos setting');
      console.log(`Current value: ${settings.likeVideos ? 'Enabled' : 'Disabled'}`);
      
      // Toggle the setting
      settings.likeVideos = !settings.likeVideos;
      
      // Save updated settings
      await this.saveSettings(settings);
      console.log(`\nu2705 Like videos setting: ${settings.likeVideos ? 'Enabled' : 'Disabled'}`);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Toggle subscribe to channels setting
   * @param {Object} settings - Current settings
   */
  async toggleSubscribe(settings) {
    try {
      console.log('\nu27a1ufe0f Toggle subscribe to channels setting');
      console.log(`Current value: ${settings.subscribeToChannels ? 'Enabled' : 'Disabled'}`);
      
      // Toggle the setting
      settings.subscribeToChannels = !settings.subscribeToChannels;
      
      // Save updated settings
      await this.saveSettings(settings);
      console.log(`\nu2705 Subscribe to channels setting: ${settings.subscribeToChannels ? 'Enabled' : 'Disabled'}`);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Change pause time between channels
   * @param {Object} settings - Current settings
   */
  async changePauseTime(settings) {
    try {
      console.log('\nu27a1ufe0f Change pause time between channels');
      console.log(`Current value: ${settings.pauseBetweenChannelsSeconds} seconds`);
      
      const input = await menu.getInput('Enter new pause time in seconds (10-300)');
      
      if (input === '0' || input === 'EMPTY_INPUT') {
        console.log('\nu274c Change cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      const newValue = parseInt(input);
      
      if (isNaN(newValue) || newValue < 10 || newValue > 300) {
        console.log('\nu274c Invalid value! Must be between 10 and 300 seconds.');
        await menu.waitForEnter();
        return;
      }
      
      // Update settings
      settings.pauseBetweenChannelsSeconds = newValue;
      await this.saveSettings(settings);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Reset settings to defaults
   */
  async resetToDefaults() {
    try {
      console.log('\nu27a1ufe0f Reset settings to defaults');
      
      const confirm = await menu.getInput('Are you sure you want to reset all settings to defaults? (y/n)');
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('\nu274c Reset cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      // Default settings
      const defaultSettings = {
        watchTimePercentage: 70,
        minWatchTimeSeconds: 60,
        maxWatchTimeSeconds: 600,
        likeVideos: true,
        subscribeToChannels: true,
        pauseBetweenChannelsSeconds: 30
      };
      
      // Save default settings
      await this.saveSettings(defaultSettings);
      console.log('\nu2705 Settings reset to defaults successfully!');
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
}

module.exports = new SupportSettingsMenuHandler();

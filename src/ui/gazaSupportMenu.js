/**
 * @file gazaSupportMenu.js
 * @description Gaza Support menu handler for YouTube bot
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('./menu');
const accountsMenu = require('./accountsMenu');
const commentsMenu = require('./commentsMenu');
const supportSettingsMenu = require('./supportSettingsMenu');
const supportService = require('../services/supportService');

/**
 * Gaza Support menu handler
 */
class GazaSupportMenuHandler {
  /**
   * Display the Gaza Support menu
   */
  async showMenu() {
    const options = [
      'Manage Accounts',
      'Manage Comments',
      'Start Supporting',
      'Support Settings'
    ];
    
    // Get summary stats for footer
    const stats = await this.getSupportStats();
    const footer = `Channels: ${stats.channelCount} | Comments: ${stats.commentCount}`;
    
    menu.showMenu('Gaza Support Menu', options, footer);
    
    const choice = await menu.getInput('Enter your choice');
    await this.handleChoice(choice);
  }
  
  /**
   * Handle Gaza Support menu choices
   * @param {string} choice - User's menu choice
   */
  async handleChoice(choice) {
    switch(choice) {
      case '1': // Manage Accounts
        await accountsMenu.showMenu();
        break;
        
      case '2': // Manage Comments
        await commentsMenu.showMenu();
        break;
        
      case '3': // Start Supporting
        await supportService.startSupporting();
        break;
        
      case '4': // Support Settings
        await supportSettingsMenu.showMenu();
        break;
        
      case '0': // Back to main menu
        return; // Will return to main menu
        
      default:
        console.log('\n❌ Invalid option. Please try again.');
        await menu.waitForEnter();
        await this.showMenu();
        return;
    }
    
    // After executing an action, show the Gaza Support menu again
    await this.showMenu();
  }
  
  /**
   * Get support statistics for the footer
   * @returns {Object} Statistics object
   */
  async getSupportStats() {
    try {
      // Path to data files
      const channelsPath = path.resolve(__dirname, '../data/gazaSupport/channels.json');
      const commentsPath = path.resolve(__dirname, '../data/gazaSupport/comments.json');
      
      // Read files if they exist
      let channelCount = 0;
      let commentCount = 0;
      
      if (await fs.pathExists(channelsPath)) {
        const channels = await fs.readJson(channelsPath);
        channelCount = channels.length;
      }
      
      if (await fs.pathExists(commentsPath)) {
        const comments = await fs.readJson(commentsPath);
        commentCount = comments.length;
      }
      
      return { channelCount, commentCount };
    } catch (error) {
      console.error(`Error getting stats: ${error.message}`);
      return { channelCount: 0, commentCount: 0 };
    }
  }
}

module.exports = new GazaSupportMenuHandler();

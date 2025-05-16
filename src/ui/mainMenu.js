/**
 * @file mainMenu.js
 * @description Main menu handler for YouTube bot
 */

const menu = require('./menu');
const settings = require('./settings');
const gazaSupportMenu = require('./gazaSupportMenu');
const browserService = require('../services/browser');

/**
 * Main menu handler for the application
 */
class MainMenuHandler {
  constructor() {
    this.browser = browserService;
    this.isLoggedIn = false;
  }

  /**
   * Display the main menu
   */
  async showMenu() {
    const options = [
      'Start Browser & Login',
      'Gaza Support',
      'Settings'
    ];
    
    // Add status information to the footer
    const footer = `Login Status: ${this.isLoggedIn ? '✅ Logged In' : '❌ Not Logged In'}`;
    
    menu.showMenu('YouTube Bot - Main Menu', options, footer);
    
    const choice = await menu.getInput('Enter your choice');
    await this.handleChoice(choice);
  }
  
  /**
   * Handle main menu choices
   * @param {string} choice - User's menu choice
   */
  async handleChoice(choice) {
    // Handle empty input or special EMPTY_INPUT case
    if (choice === '' || choice === 'EMPTY_INPUT') {
      console.log('\n❌ No option selected. Please enter a number from the menu.');
      await menu.waitForEnter();
      return this.showMenu();
    }

    switch(choice) {
      case '1': // Start Browser & Login
        await this.handleBrowserStart();
        break;
        
      case '2': // Gaza Support Menu
        await gazaSupportMenu.showMenu();
        break;
        
      case '3': // Settings Menu
        await settings.showMenu();
        break;
        
      case '0': // Exit
        console.log('\nExiting YouTube Bot...');
        return process.exit(0);
        
      default:
        console.log('\n❌ Invalid option. Please try again.');
        await menu.waitForEnter();
        break;
    }
    
    // After executing an action, show the main menu again
    await this.showMenu();
  }
  
  /**
   * Handle browser startup and login
   */
  async handleBrowserStart() {
    try {
      console.log('\n➡️ Starting browser and logging in...');
      
      // Initialize browser
      await this.browser.initialize();
      
      // Authenticate with YouTube
      this.isLoggedIn = await this.browser.authenticate();
      
      if (this.isLoggedIn) {
        console.log('\n✅ Successfully logged in to YouTube!');
      } else {
        console.log('\n❌ Failed to log in. Please check your cookies or log in manually.');
      }
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
}

module.exports = new MainMenuHandler();

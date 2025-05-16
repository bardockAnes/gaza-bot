/**
 * @file settings.js
 * @description Settings menu handler for YouTube bot
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('./menu');
const config = require('../config');
const browserService = require('../services/browser');

/**
 * Settings menu handler
 */
class SettingsHandler {
  /**
   * Display the settings menu
   */
  async showMenu() {
    const options = [
      'Clear Browser Cookies',
      'Toggle Headless Mode',
      'Export Brave Cookies Again',
      'Import Cookies from Other Browsers',
      'Delete Brave Cookies File'
    ];
    
    menu.showMenu('Settings Menu', options);
    
    const choice = await menu.getInput('Enter your choice');
    await this.handleChoice(choice);
  }
  
  /**
   * Handle settings menu choices
   * @param {string} choice - User's menu choice
   */
  async handleChoice(choice) {
    switch(choice) {
      case '1': // Clear Browser Cookies
        await this.clearCookies();
        break;
        
      case '2': // Toggle Headless Mode
        await this.toggleHeadlessMode();
        break;
        
      case '3': // Export Brave Cookies Again
        await this.exportBraveCookies();
        break;
        
      case '4': // Import Cookies
        await this.importCookies();
        break;
        
      case '5': // Delete Brave Cookies
        await this.deleteBraveCookies();
        break;
        
      case '0': // Back to main menu
        return; // Will return to main menu
        
      default:
        console.log('\n❌ Invalid option. Please try again.');
        await menu.waitForEnter();
        await this.showMenu();
        return;
    }
    
    // After executing an action, show the settings menu again
    await this.showMenu();
  }
  
  /**
   * Clear browser cookies
   */
  async clearCookies() {
    try {
      console.log('\n➡️ Clearing browser cookies...');
      
      // Check if cookies file exists first
      if (fs.existsSync(config.paths.cookies)) {
        // Delete the file
        await fs.unlink(config.paths.cookies);
        console.log('\n✅ Browser cookies cleared successfully!');
      } else {
        console.log('\n❌ No cookies file found!');
      }
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Toggle headless mode
   */
  async toggleHeadlessMode() {
    try {
      console.log('\n➡️ Toggling headless mode...');
      
      // Get the config file path
      const configPath = path.resolve(__dirname, '../../src/config/default.js');
      
      // Read the file content
      let configContent = await fs.readFile(configPath, 'utf-8');
      
      // Check the current headless setting
      const currentHeadless = config.browser.headless;
      const newHeadless = !currentHeadless;
      
      // Update the file content
      configContent = configContent.replace(
        /headless: (true|false)/,
        `headless: ${newHeadless}`
      );
      
      // Write the updated content back
      await fs.writeFile(configPath, configContent, 'utf-8');
      
      console.log(`\n✅ Headless mode set to: ${newHeadless}`);
      console.log('Restart the application for changes to take effect.');
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Export Brave cookies
   */
  async exportBraveCookies() {
    console.log('\n❌ This feature is not implemented in the new structure yet.');
    console.log('Please use the original browser.js to export Brave cookies.');
    await menu.waitForEnter();
  }
  
  /**
   * Import cookies from other browsers
   */
  async importCookies() {
    // Store the original stdin settings to restore later
    const originalIsRaw = process.stdin.isRaw;
    const originalIsPaused = process.stdin.isPaused();
    
    try {
      // Reset stdin to known state for cookie input
      if (process.stdin.isRaw) {
        process.stdin.setRawMode(false);
      }
      
      // Temporarily close menu readline to avoid interference
      if (menu.rl) {
        menu.rl.close();
        menu.initialized = false;
      }
      
      console.log('\n➡️ Import cookies from browser');
      console.log('\nPaste your cookie JSON data below.');
      console.log('Example format: [{ "name": "value", ... }]');
      
      // Simple method to collect cookie data as a string
      let cookieData = '';
      console.log('\nPaste your cookie data now:');
      
      // Create a promise that resolves when complete JSON is detected
      const prompt = () => new Promise(resolve => {
        // Set stdin to flowing mode
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        let isComplete = false;
        
        const onData = buffer => {
          const chunk = buffer.toString();
          cookieData += chunk;
          
          // Check if we've received a complete JSON array
          if (!isComplete && cookieData.trim().startsWith('[') && 
              cookieData.trim().endsWith(']')) {
            isComplete = true; // Mark as complete to avoid multiple resolves
            
            // This looks like complete JSON, stop listening
            process.stdin.removeListener('data', onData);
            
            // Don't stop the stream, just resolve the promise
            resolve(cookieData);
          }
        };
        
        // Listen for data events
        process.stdin.on('data', onData);
      });
      
      // Wait for complete cookie data
      cookieData = await prompt();
      
      // Process and save the cookies
      await this.processCookieData(cookieData);
      
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      
      // Initialize menu for the error message
      menu.initialize();
      await menu.waitForEnter();
    } finally {
      // Always ensure the menu system is properly initialized after we're done
      if (!menu.initialized) {
        menu.initialize();
      }
      
      // Restore original stdin settings if needed
      if (originalIsRaw && !process.stdin.isRaw) {
        process.stdin.setRawMode(true);
      }
      if (originalIsPaused && !process.stdin.isPaused()) {
        process.stdin.pause();
      }
    }
  }
  
  /**
   * Process the cookie data from import
   * @param {string} cookieData - JSON cookie data
   */
  async processCookieData(cookieData) {
    try {
      console.log('\nProcessing cookie data...');
      
      // Make sure cookiesDir exists
      await fs.ensureDir(config.paths.cookiesDir);
      
      // Parse the JSON data
      let cookies;
      try {
        cookies = JSON.parse(cookieData);
        console.log(`\nJSON parsing successful. Found ${cookies.length} cookies.`);
      } catch (err) {
        console.log('\n❌ Error parsing cookie data:');
        console.log(err.message);
        console.log('\nMake sure your JSON is valid. It should start with [ and end with ]');
        await menu.waitForEnter();
        return;
      }
      
      // Validate that it's an array of cookies
      if (!Array.isArray(cookies)) {
        console.log('\n❌ Invalid cookie format. Expected an array of cookie objects.');
        await menu.waitForEnter();
        return;
      }
      
      // Log some info about the cookies
      console.log('\nCookie information:');
      console.log(` - Number of cookies: ${cookies.length}`);
      const cookieNames = cookies.map(c => c.name).join(', ');
      console.log(` - Cookie names: ${cookieNames}`);
      
      // Save cookies to both files for compatibility
      const importedPath = config.paths.importedCookies;
      const normalPath = config.paths.cookies;
      
      console.log(`\nSaving cookies to: ${importedPath}`);
      await fs.writeJson(importedPath, cookies, { spaces: 2 });
      
      console.log(`Saving cookies to: ${normalPath}`);
      await fs.writeJson(normalPath, cookies, { spaces: 2 });
      
      console.log('\n✅ Cookies saved successfully!');
      console.log('These cookies will be used for authentication now.');

      // Make sure menu system is initialized before waiting for input
      if (!menu.initialized) {
        menu.initialize();
      }
      
      // Use the improved waitForEnter function
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      console.error('Full error:', error);
      
      // Make sure menu system is initialized before waiting for input
      if (!menu.initialized) {
        menu.initialize();
      }
      
      await menu.waitForEnter();
    }
  }
  
  /**
   * Delete Brave cookies file
   */
  async deleteBraveCookies() {
    try {
      console.log('\n➡️ Deleting Brave cookies file...');
      
      // Check if Brave cookies file exists
      if (fs.existsSync(config.paths.braveCookies)) {
        // Confirm deletion
        console.log('\n⚠️ Are you sure you want to delete the Brave cookies file?');
        console.log('This action cannot be undone.');
        
        const confirmation = await menu.getInput('Type "yes" to confirm');
        
        if (confirmation.toLowerCase() === 'yes') {
          // Delete the file
          await fs.unlink(config.paths.braveCookies);
          console.log('\n✅ Brave cookies file deleted successfully!');
        } else {
          console.log('\n❌ Deletion cancelled.');
        }
      } else {
        console.log('\n❌ Brave cookies file not found!');
      }
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
}

module.exports = new SettingsHandler();

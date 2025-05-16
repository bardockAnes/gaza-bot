/**
 * @file index.js
 * @description Main entry point for YouTube automation bot
 */

// Load environment variables first
require('dotenv').config();

// Import services
const browserService = require('./services/browser');
const menuService = require('./ui/menu');
const mainMenu = require('./ui/mainMenu');

// Import configurations
const config = require('./config');

/**
 * Main application class
 */
class YouTubeBot {
  constructor() {
    this.browser = browserService;
    this.menu = menuService;
    this.mainMenu = mainMenu;
    this.isRunning = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.clear();
    
    // Display ASCII art title prominently
    this.displayTitle();
    console.log('Starting YouTube Bot...');
    console.log('\nPress any key to continue...');
    
    try {
      // Wait for key press
      await this.waitForKeyPress();
      
      // Initialize menu system after the key press
      // This ensures we have a clean readline interface
      this.menu.initialize();
      
      this.isRunning = true;
      
      // Clear screen again for cleaner UI
      console.clear();
      this.displayTitle();
      
      // Start with the main menu
      await this.mainMenu.showMenu();
    } catch (error) {
      console.error('Failed to start application:', error.message);
      await this.shutdown();
    }
  }
  
  /**
   * Display ASCII art title
   */
  displayTitle() {
    // Define ANSI color codes for Palestinian flag colors
    const reset = '\x1b[0m';
    const red = '\x1b[31m';
    const green = '\x1b[32m';
    const white = '\x1b[37m';
    const bold = '\x1b[1m';
    
    // Display the ASCII art with Palestinian flag colors
    console.log(`
    ${bold}██████╗ ${reset} ${red}${bold}█████╗ ${reset} ${white}${bold}███████╗${reset} ${bold}█████╗   ${reset}  ${green}${bold}██╗   ██╗${reset}${bold}████████╗${reset}
    ${bold}██╔════╝${reset} ${red}${bold}██╔══██╗${reset} ${white}${bold}╚══███╔╝${reset} ${bold}██╔══██╗ ${reset}  ${green}${bold}╚██╗ ██╔╝${reset}${bold}╚══██╔══╝${reset}
    ${bold}██║  ███╗${reset}${red}${bold}███████║${reset} ${white}${bold}  ███╔╝ ${reset} ${bold}███████║${reset}    ${green}${bold}╚████╔╝ ${reset} ${bold}  ██║   ${reset}
    ${bold}██║   ██║${reset}${red}${bold}██╔══██║${reset} ${white}${bold} ███╔╝  ${reset} ${bold}██╔══██║${reset}     ${green}${bold}╚██╔╝  ${reset} ${bold}  ██║   ${reset}
    ${bold}╚██████╔╝${reset}${red}${bold}██║  ██║${reset} ${white}${bold}███████╗${reset} ${bold}██║  ██║${reset}      ${green}${bold}██║   ${reset} ${bold}  ██║   ${reset}
    ${bold} ╚═════╝ ${reset}${red}${bold}╚═╝  ╚═╝${reset} ${white}${bold}╚══════╝${reset} ${bold}╚═╝  ╚═╝${reset}      ${green}${bold}╚═╝   ${reset} ${bold}  ╚═╝   ${reset}
                                                          
    ${red}${bold}██████╗ ${reset} ${white}${bold}██████╗ ${reset} ${green}${bold}████████╗${reset}
    ${red}${bold}██╔══██╗${reset} ${white}${bold}██╔═══██╗${reset} ${green}${bold}╚══██╔══╝${reset}
    ${red}${bold}██████╔╝${reset} ${white}${bold}██║   ██║${reset} ${green}${bold}   ██║   ${reset}
    ${red}${bold}██╔══██╗${reset} ${white}${bold}██║   ██║${reset} ${green}${bold}   ██║   ${reset}
    ${red}${bold}██████╔╝${reset} ${white}${bold}╚██████╔╝${reset} ${green}${bold}   ██║   ${reset}
    ${red}${bold}╚═════╝ ${reset} ${white}${bold} ╚═════╝ ${reset} ${green}${bold}   ╚═╝   ${reset}
    `);
    
    // Display a stylized border with Palestinian colors
    const borderLength = 61; // Length of the border
    const redBorder = `${red}${bold}${'═'.repeat(borderLength/3)}${reset}`;
    const whiteBorder = `${white}${bold}${'═'.repeat(borderLength/3)}${reset}`;
    const greenBorder = `${green}${bold}${'═'.repeat(borderLength/3)}${reset}`;
    
    console.log(`${redBorder}${whiteBorder}${greenBorder}`);
    console.log(`${bold} Automated Gaza YouTube Management Tool - Freedom For Palestine ${reset}`);
    console.log(`${greenBorder}${whiteBorder}${redBorder}\n`);
  }
  
  /**
   * Wait for any key press
   * @returns {Promise} Resolves when a key is pressed
   */
  waitForKeyPress() {
    return new Promise(resolve => {
      const cleanup = () => {
        // Remove the listener to prevent memory leaks
        process.stdin.removeListener('data', onData);
        // Reset stdin mode properly
        process.stdin.setRawMode(false);
        process.stdin.pause();
      };
      
      const onData = (data) => {
        // Check for Ctrl+C (will be handled by SIGINT handler)
        if (data[0] === 0x03) {
          cleanup();
          process.emit('SIGINT');
          return;
        }
        
        cleanup();
        
        // Give a bit of time for the system to stabilize before continuing
        setTimeout(() => {
          resolve();
        }, 200);
      };
      
      // Save original state to restore later
      const wasRaw = process.stdin.isRaw;
      
      // Set raw mode to get keypress events
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', onData);
    });
  }
  
  /**
   * Gracefully shutdown the application
   */
  async shutdown() {
    console.log('\nShutting down...');
    
    // Close browser if open
    if (this.browser) {
      await this.browser.close().catch(err => console.error('Error closing browser:', err.message));
    }
    
    // Close menu interface
    if (this.menu) {
      this.menu.close();
    }
    
    this.isRunning = false;
    console.log('YouTube Bot shutdown complete');
    
    // Exit process with success code
    process.exit(0);
  }
}

// Create and start the application
const app = new YouTubeBot();

// Handle graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Graceful shutdown...');
  await app.shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await app.shutdown();
});

// Start the application
app.initialize().catch(async (error) => {
  console.error('Failed to initialize application:', error);
  await app.shutdown();
});

module.exports = app;

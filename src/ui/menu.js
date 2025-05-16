/**
 * @file menu.js
 * @description Menu system for YouTube bot CLI
 */

const readline = require('readline');

/**
 * Menu service for better CLI interaction
 * @class MenuService
 */
class MenuService {
  constructor() {
    this.rl = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the readline interface
   */
  initialize() {
    if (!this.initialized) {
      // Check if stdin is in raw mode and revert if needed
      if (process.stdin.isRaw) {
        process.stdin.setRawMode(false);
      }
      
      // Make sure stdin is resumed
      process.stdin.resume();
      
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
      });
      
      // Handle SIGINT properly
      this.rl.on('SIGINT', () => {
        console.log('\nReceived SIGINT. Graceful shutdown...');
        process.emit('SIGINT');
      });
      
      this.initialized = true;
    }
    return this.rl;
  }
  
  /**
   * Force reinitialization of the readline interface
   * This is useful when recovering from operations that put stdin in raw mode
   * or when the terminal state becomes inconsistent
   */
  forceReinitialize() {
    // Clean up existing interface
    this.close();
    
    // Remove all listeners from stdin to ensure clean state
    process.stdin.removeAllListeners();
    
    // Reset stdin state
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    process.stdin.resume();
    
    // Create a fresh readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });
    
    // Handle SIGINT properly
    this.rl.on('SIGINT', () => {
      console.log('\nReceived SIGINT. Graceful shutdown...');
      process.emit('SIGINT');
    });
    
    this.initialized = true;
    return this.rl;
  }
  
  /**
   * Display a menu with title and options
   * @param {string} title - Menu title
   * @param {Array<string>} options - Menu options
   * @param {string} [footer=''] - Optional footer text
   */
  showMenu(title, options, footer = '') {
    console.clear();
    
    // Show the title with decoration
    const titleBar = '='.repeat(title.length + 10);
    console.log(`\n${titleBar}`);
    console.log(`    ${title}    `);
    console.log(`${titleBar}\n`);
    
    // Display menu options
    options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
    
    // Add back option if needed
    console.log(`  0. Back/Exit\n`);
    
    // Add footer if provided
    if (footer) {
      console.log(footer);
      console.log(''); // Add an empty line after footer
    }
  }
  
  /**
   * Get user input with a prompt
   * @param {string} promptText - Text to display as prompt
   * @returns {Promise<string>} User input
   */
  async getInput(promptText) {
    if (!this.initialized) {
      this.initialize();
    }
    
    return new Promise((resolve) => {
      this.rl.question(`${promptText}: `, (answer) => {
        // Handle empty input by returning a specific value
        const trimmedAnswer = answer.trim();
        resolve(trimmedAnswer === '' ? 'EMPTY_INPUT' : trimmedAnswer);
      });
    });
  }
  
  /**
   * Wait for user to press enter
   * @param {string} [promptText='Press ENTER to continue...'] - Prompt text
   * @returns {Promise<void>}
   */
  async waitForEnter(promptText = 'Press ENTER to continue...') {
    // Make sure we have an initialized readline interface
    if (!this.initialized) {
      this.initialize();
    }
    
    return new Promise(resolve => {
      // Display the prompt
      console.log(`\n${promptText}`);
      
      // Create a one-time listener for the 'line' event
      const onLine = () => {
        // Remove the listener to avoid memory leaks
        this.rl.removeListener('line', onLine);
        resolve();
      };
      
      // Listen for a line event (Enter key)
      this.rl.once('line', onLine);
    });
  }
  
  /**
   * Close the readline interface
   */
  close() {
    if (this.rl) {
      this.rl.close();
      this.initialized = false;
    }
  }
}

module.exports = new MenuService();

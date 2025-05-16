/**
 * @file default.js
 * @description Default configuration for the YouTube automation system
 */

const path = require('path');
const rootDir = path.resolve(__dirname, '../../');

module.exports = {
  /**
   * Browser configuration settings
   */
  browser: {
    // Whether to run in headless mode (false shows the browser UI)
    headless: false,
    
    // Directory to store persistent browser data
    userDataDir: path.resolve(rootDir, 'chrome-data'),
    
    // Browser launch arguments
    args: [
      '--start-maximized',      // Launch with maximized window
      '--no-sandbox',           // Disable sandbox for compatibility
      '--disable-blink-features=AutomationControlled', // Hide automation flags
      '--disable-notifications', // Block notification prompts
      
      // Anti-throttling settings for background tabs
    //   '--disable-background-timer-throttling',    // Prevent timers from being throttled in background tabs
    //   '--disable-backgrounding-occluded-windows', // Prevent backgrounding when tab is not visible
    //   '--disable-renderer-backgrounding'          // Prevent renderer from being throttled when in background
    ],
    
    // Default arguments to ignore
    ignoreDefaultArgs: ['--enable-automation'],
    
    // Default viewport dimensions
    viewport: {
      width: 1920,
      height: 1080
    },
    
    // Background keep-alive settings
    // backgroundKeepAlive: {
    //   enabled: true,     // Whether to enable the background keep-alive mechanism
    //   interval: 5000,    // Interval in ms to perform keep-alive actions (5 seconds)
    //   focusEvents: true  // Whether to dispatch focus events to keep page active
    // }
  },
  
  /**
   * File paths configuration
   */
  paths: {
    // Path to cookies exported from Brave
    braveCookies: path.resolve(rootDir, 'src/data/cookies/brave-cookies.json'),
    
    // Path to store session cookies
    cookies: path.resolve(rootDir, 'src/data/cookies/cookies.json'),
    
    // Path to imported cookies
    importedCookies: path.resolve(rootDir, 'src/data/cookies/imported-cookies.json'),
    
    // Path to logs directory
    logs: path.resolve(rootDir, 'logs'),
    
    // Path to data directory
    data: path.resolve(rootDir, 'src/data'),
    
    // Path to cookies directory
    cookiesDir: path.resolve(rootDir, 'src/data/cookies')
  },
  
  /**
   * URL configurations
   */
  urls: {
    // Main YouTube URL
    youtube: process.env.YOUTUBE_URL || 'https://www.youtube.com',
    
    // YouTube trending page
    trending: 'https://www.youtube.com/feed/trending',
    
    // YouTube subscriptions page
    subscriptions: 'https://www.youtube.com/feed/subscriptions'
  },
  
  /**
   * Timing configurations (in milliseconds)
   */
  timing: {
    // Default page load timeout
    pageLoadTimeout: 60000,
    
    // Wait time after page load for elements to render
    renderDelay: 5000,
    
    // Delay between actions to mimic human behavior
    actionDelay: {
      min: 1000,  // Minimum delay
      max: 3000   // Maximum delay
    },
    
    // Default video watch time
    defaultWatchTime: 30000
  },
  
  /**
   * Authentication settings
   */
  auth: {
    // Whether to save updated cookies after session
    saveCookies: true,
    
    // Whether to check login status on startup
    verifyLogin: true
  }
};

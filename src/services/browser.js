/**
 * @file browser.js
 * @description Browser management service for YouTube automation
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs-extra');
const config = require('../config');

// Apply stealth plugin to make automation less detectable
puppeteer.use(StealthPlugin());

/**
 * Browser management class
 * @class BrowserService
 */
class BrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isAuthenticated = false;
  }

  /**
   * Initialize the browser instance
   * @async
   * @returns {Promise<{browser: object, page: object}>} Browser and page objects
   * @throws {Error} If browser initialization fails
   */
  async initialize() {
    try {
      console.log('Initializing browser...');
      
      // Ensure user data directory exists
      await fs.ensureDir(config.browser.userDataDir);
      
      // Launch browser
      this.browser = await puppeteer.launch({
        headless: config.browser.headless,
        defaultViewport: null,
        args: config.browser.args,
        ignoreDefaultArgs: config.browser.ignoreDefaultArgs,
        userDataDir: config.browser.userDataDir
      });
      
      // Get existing pages instead of creating a new one
      const pages = await this.browser.pages();
      // Use the first page that Puppeteer creates automatically
      this.page = pages[0];
      
      if (!this.page) {
        // As a fallback, create a new page if no pages exist
        console.log('No existing pages found, creating a new one...');
        this.page = await this.browser.newPage();
      } else {
        console.log('Using existing browser page');
      }
      
      // Set viewport to null to maintain the browser's default size
      await this.page.setViewport(null);
      
      // Apply anti-detection measures
      await this._applyAntiDetection();
      
      console.log('Browser initialized successfully');
      
      return { browser: this.browser, page: this.page };
    } catch (error) {
      console.error(`Browser initialization failed: ${error.message}`);
      // Attempt cleanup if browser was created
      if (this.browser) {
        await this.browser.close().catch(() => {});
      }
      throw error;
    }
  }
  
  /**
   * Apply various anti-detection measures to avoid being detected as automation
   * @async
   * @private
   */
  async _applyAntiDetection() {
    // Apply stealth measures in page context
    await this.page.evaluateOnNewDocument(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Add Chrome browser properties
      window.navigator.chrome = { 
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {} 
      };
      
      // Override permissions
      window.navigator.permissions = {
        query: () => Promise.resolve({ state: 'granted' })
      };
      
      // Override language properties
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [1, 2, 3, 4, 5].map(() => ({
            0: { type: 'application/x-google-chrome-pdf' },
            description: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin'
          }));
        }
      });
    });
    
    // Block tracking scripts and analytics
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      const url = request.url().toLowerCase();
      const blockList = [
        'google-analytics',
        'googlesyndication',
        'doubleclick.net',
        'adservice.google'
      ];
      
      // Abort tracking requests
      if (blockList.some(tracker => url.includes(tracker))) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }
  
  /**
   * Authenticate with YouTube using provided cookies
   * @async
   * @returns {Promise<boolean>} True if authentication successful
   */
  async authenticate() {
    try {
      console.log('Starting YouTube authentication...');
      
      // Define imported cookies path
      const importedCookiesPath = config.paths.importedCookies;
      
      // Check if imported cookies exist (priority)
      if (fs.existsSync(importedCookiesPath)) {
        console.log('Loading cookies from imported cookies file...');
        const importedCookies = await fs.readJSON(importedCookiesPath);
        
        // Format cookies for Puppeteer
        const formattedCookies = this._formatCookies(importedCookies);
        
        // Set cookies
        await this.page.setCookie(...formattedCookies);
        console.log(`[✓] Loaded ${formattedCookies.length} cookies from imported file`);
      }
      // If no imported cookies, check for Brave cookies as fallback
      else if (fs.existsSync(config.paths.braveCookies)) {
        console.log('Loading cookies from Brave browser...');
        const braveCookies = await fs.readJSON(config.paths.braveCookies);
        
        // Format cookies for Puppeteer
        const formattedCookies = this._formatCookies(braveCookies);
        
        // Set cookies
        await this.page.setCookie(...formattedCookies);
        console.log(`[✓] Loaded ${formattedCookies.length} cookies from Brave`);
      } else {
        console.log('[!] No cookies found. Authentication may fail.');
      }
      
      // Navigate to YouTube
      console.log(`Navigating to ${config.urls.youtube}...`);
      await this.page.goto(config.urls.youtube, { 
        waitUntil: 'networkidle2',
        timeout: config.timing.pageLoadTimeout
      });
      
      // Wait for page to render fully
      console.log('Waiting for page to fully render...');
      await new Promise(resolve => setTimeout(resolve, config.timing.renderDelay));
      
      // Check login status
      this.isAuthenticated = await this._checkLoginStatus();
      
      // If not authenticated, click the sign-in button
      if (!this.isAuthenticated) {
        console.log('Not logged in, clicking Sign In button...');
        try {
          // Wait for the sign-in button to be available and click it
          await this.page.waitForSelector('a[aria-label="Sign in"]', { visible: true });
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
            this.page.click('a[aria-label="Sign in"]')
          ]);
          console.log('Google sign-in page loaded. User can now log in manually.');
          
          // Give user time to manually log in (30 seconds)
          console.log('Waiting for user to complete login (30 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          // Check login status again after manual login
          console.log('Rechecking login status after manual login...');
          this.isAuthenticated = await this._checkLoginStatus();
          
          // If still not logged in, wait a bit more and check one final time
          if (!this.isAuthenticated) {
            console.log('Still not logged in, waiting a bit longer (15 seconds)...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            this.isAuthenticated = await this._checkLoginStatus();
          }
        } catch (error) {
          console.error(`Failed to click sign-in button or verify login: ${error.message}`);
        }
      }
      
      // Save current cookies if configured
      if (config.auth.saveCookies) {
        await this._saveCookies();
      }
      
      return this.isAuthenticated;
    } catch (error) {
      console.error(`Authentication error: ${error.message}`);
      this.isAuthenticated = false;
      return false;
    }
  }
  
  /**
   * Format cookies for Puppeteer compatibility
   * @private
   * @param {Array} cookies - Raw cookies
   * @returns {Array} Formatted cookies for Puppeteer
   */
  _formatCookies(cookies) {
    return cookies.map(cookie => {
      // Handle sameSite property
      let sameSite = cookie.sameSite;
      
      // Fix sameSite value
      if (!sameSite) {
        sameSite = 'None'; // Default value
      } else if (sameSite === 'no_restriction') {
        sameSite = 'None'; // Translate Brave's term
      } else if (sameSite === 'lax') {
        sameSite = 'Lax'; // Capitalize for consistency
      } else if (sameSite === 'strict') {
        sameSite = 'Strict'; // Capitalize for consistency
      }
      
      // Return formatted cookie with all required properties
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expirationDate || cookie.expires || -1,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: sameSite
      };
    });
  }
  
  /**
   * Check if user is logged in to YouTube
   * @private
   * @async
   * @returns {Promise<boolean>} Whether user is logged in
   */
  async _checkLoginStatus() {
    try {
      // Wait for possible login indicators to load
      console.log('Checking login status...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for the page to fully load
      
      const isLoggedIn = await this.page.evaluate(() => {
        // More reliable way to check login status - look for sign-in button
        const signInButton = document.querySelector('a[aria-label="Sign in"]');
        
        // If sign-in button exists, user is NOT logged in
        if (signInButton) {
          return false;
        }
        
        // Check for avatar with account menu that indicates logged-in state
        // This is more reliable than the previous implementation
        const accountMenu = document.querySelector('ytd-topbar-menu-button-renderer');
        const avatarImage = document.querySelector('yt-img-shadow.ytd-topbar-menu-button-renderer');
        
        return !!(accountMenu && avatarImage);
      });
      
      if (isLoggedIn) {
        console.log('[✓] Successfully logged in to YouTube!');
      } else {
        console.log('[!] Not logged in. Authentication failed.');
      }
      
      return isLoggedIn;
    } catch (error) {
      console.error(`Login status check error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Save current cookies to file
   * @private
   * @async
   */
  async _saveCookies() {
    const currentCookies = await this.page.cookies();
    await fs.writeJSON(config.paths.cookies, currentCookies, { spaces: 2 });
    console.log('[✓] Current cookies saved for future use');
  }
  
  /**
   * Close the browser instance
   * @async
   */
  async close() {
    if (this.browser) {
      console.log('Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isAuthenticated = false;
      console.log('Browser closed');
    }
  }
}

module.exports = new BrowserService();

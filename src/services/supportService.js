/**
 * @file supportService.js
 * @description Main service for Gaza Support automation
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('../ui/menu');
const browserService = require('./browser');

// Import modular services
const VideoService = require('./support/videoService');
const EngagementService = require('./support/engagementService');
const NavigationService = require('./support/navigationService');
const AdService = require('./support/adService');
const DataService = require('./support/dataService');

/**
 * Support service for Gaza YouTube channel support
 */
class SupportService {
  constructor() {
    this.browser = browserService;
    this.menu = menu;
    
    // Initialize paths
    const dataPath = path.resolve(__dirname, '../data/gazaSupport');
    this.channelsPath = path.join(dataPath, 'channels.json');
    this.commentsPath = path.join(dataPath, 'comments.json');
    this.settingsPath = path.join(dataPath, 'settings.json');
    
    // Initialize service modules
    this.videoService = new VideoService(this.browser);
    this.engagementService = new EngagementService(this.browser);
    this.navigationService = new NavigationService(this.browser);
    this.adService = new AdService(this.browser);
    this.dataService = new DataService({
      channelsPath: this.channelsPath,
      commentsPath: this.commentsPath,
      settingsPath: this.settingsPath
    });
  }
  
  /**
   * Get input with timeout functionality - auto-continues with default value if no input
   * @param {string} promptText - Text to display as prompt
   * @param {number} timeoutSeconds - Seconds to wait before using default
   * @param {string} defaultValue - Default value to use if timeout
   * @returns {Promise<string>} User input or default value after timeout
   * @private
   */
  async _getInputWithTimeout(promptText, timeoutSeconds = 10, defaultValue = 'y') {
    return new Promise((resolve) => {
      // Create a timeout to auto-continue
      const timeout = setTimeout(() => {
        console.log(`[No response in ${timeoutSeconds}s, auto-continuing with '${defaultValue}']`);
        resolve(defaultValue);
      }, timeoutSeconds * 1000);
      
      // Get user input
      this.menu.getInput(`${promptText} [${timeoutSeconds}s timeout]`).then(answer => {
        // Clear timeout since user responded
        clearTimeout(timeout);
        
        // Handle empty input by returning default value
        const trimmedAnswer = answer.trim();
        resolve(trimmedAnswer === '' || trimmedAnswer === 'EMPTY_INPUT' ? defaultValue : trimmedAnswer);
      });
    });
  }
  
  /**
   * Start supporting channels
   */
  async startSupporting() {
    try {
      console.log('\nu27a1ufe0f Starting Gaza Support automation...');
      
      // Check if browser is initialized
      if (!this.browser.browser) {
        console.log('\n❌ Browser is not initialized! Please start the browser from the main menu first.');
        await menu.waitForEnter();
        return;
      }
      
      // Check if logged in
      if (!this.browser.isAuthenticated) {
        console.log('\n❌ You must be logged in to YouTube! Please log in from the main menu first.');
        await menu.waitForEnter();
        return;
      }
      
      // Load channels and settings
      const channels = await this.dataService.loadChannels();
      const settings = await this.dataService.loadSettings();
      const comments = await this.dataService.loadComments();
      
      if (channels.length === 0) {
        console.log('\nu274c No channels found! Please add some channels first.');
        await menu.waitForEnter();
        return;
      }
      
      if (comments.length === 0) {
        console.log('\nu274c No comments found! Please add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      console.log(`\nFound ${channels.length} channels and ${comments.length} comments.\n`);
      console.log('Ready to start supporting channels!');
      console.log('\n=== Support Settings ===');
      console.log(`Watch time: ${settings.watchTimePercentage}% of video`);
      console.log(`Min watch time: ${settings.minWatchTimeSeconds} seconds`);
      console.log(`Max watch time: ${settings.maxWatchTimeSeconds} seconds`);
      console.log(`Like videos: ${settings.likeVideos ? 'Yes' : 'No'}`);
      console.log(`Subscribe to channels: ${settings.subscribeToChannels ? 'Yes' : 'No'}`);
      console.log(`Pause between channels: ${settings.pauseBetweenChannelsSeconds} seconds`);
      
      // Get confirmation with 10 second timeout, default to 'y'
      const confirm = await this._getInputWithTimeout('Start supporting now? (y/n)', 10, 'y');
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('\nu274c Support cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      // Start supporting channels
      let supportCount = 0;
      
      // Get the starting index based on rotation settings
      let startIndex = 0;
      if (settings.rotateChannels && settings.lastChannelIndex >= 0) {
        // Start from the channel after the last supported one
        startIndex = (settings.lastChannelIndex + 1) % channels.length;
        console.log(`\nStarting from channel index ${startIndex} (continuing from last session)`);
      } else {
        console.log('\nStarting from the first channel');
      }
      
      // Reorder channels array to start from the calculated index
      const reorderedChannels = [...channels.slice(startIndex), ...channels.slice(0, startIndex)];
      console.log(`Channel rotation order: ${reorderedChannels.map(c => c.name).join(' → ')}
`);
      
      for (let i = 0; i < reorderedChannels.length; i++) {
        const channel = reorderedChannels[i];
        const originalIndex = channels.findIndex(c => c.id === channel.id);
        
        // Show current channel
        console.clear();
        console.log(`\n➡️ Supporting channel: ${channel.name} (${i+1}/${reorderedChannels.length})`);
        console.log(`Channel URL: ${channel.url}`);
        console.log(`Previous support count: ${channel.supportCount || 0}`);
        
        // Navigate to channel
        const success = await this.supportChannel(channel, settings, comments);
        
        if (success) {
          // Update channel support count and last supported date
          channel.supportCount = (channel.supportCount || 0) + 1;
          channel.lastSupported = new Date().toISOString();
          supportCount++;
          
          // Save updated channel data
          await this.dataService.saveChannels(channels);
          
          // Update lastChannelIndex and lastCommentIndex in settings and save
          let settingsUpdated = false;

          if (settings.rotateChannels) {
            settings.lastChannelIndex = originalIndex;
            settingsUpdated = true;
            console.log(`Updated last channel index to ${originalIndex} (${channel.name})`);
          }

          // Check if comment index was updated
          if (settings._commentIndexUpdated) {
            settingsUpdated = true;
            console.log(`Updated last comment index to ${settings.lastCommentIndex}`);
            // Remove the temporary flag
            delete settings._commentIndexUpdated;
          }

          // Save settings if anything was updated
          if (settingsUpdated) {
            await this.dataService.saveSettings(settings);
          }
          
          console.log(`\n✅ Successfully supported ${channel.name}!`);
        } else {
          console.log(`\nu274c Failed to support ${channel.name}.`);
        }
        
        // Ask to continue or exit with 10 second timeout, default to 'y'
        const continueSupport = await this._getInputWithTimeout('Continue to next channel? (y/n)', 10, 'y');
        
        if (continueSupport.toLowerCase() !== 'y') {
          console.log('\nu274c Support process stopped by user.');
          break;
        }
        console.log('\u27a1 Continuing to next channel...');
        
        // Pause between channels
        console.log(`\nPausing for ${settings.pauseBetweenChannelsSeconds} seconds before next channel...`);
        await this.sleep(settings.pauseBetweenChannelsSeconds * 1000);
      }
      
      console.log(`\nu2705 Support process complete! Supported ${supportCount} channels.`);
      
      // Ask user if they want to restart the support process
      const restartSupport = await this._getInputWithTimeout('Restart support process? (y/n)', 10, 'y');
      
      if (restartSupport.toLowerCase() === 'y') {
        console.log('\nu27a1 Restarting Gaza support process...');
        // Call this method again to restart the entire process
        return this.startSupporting();
      }
      
      console.log('\u2705 Returning to menu...');
    } catch (error) {
      console.error(`\nu274c Error during support process: ${error.message}`);
      
      // Ask user if they want to restart despite the error
      const restartAfterError = await this._getInputWithTimeout('Try again? (y/n)', 10, 'y');
      
      if (restartAfterError.toLowerCase() === 'y') {
        console.log('\u27a1 Restarting Gaza support process...');
        // Call this method again to restart the entire process
        return this.startSupporting();
      }
      
      console.log('\u2705 Returning to menu...');
    }
  }
  
  /**
   * Support a single channel
   * @param {Object} channel - Channel to support
   * @param {Object} settings - Support settings
   * @param {Array<string>} comments - Array of comments
   * @returns {Promise<boolean>} Success status
   */
  async supportChannel(channel, settings, comments) {
    try {
      // Access the page directly from the browser service
      const page = this.browser.page;
      
      // Make sure page exists
      if (!page) {
        console.log('\n❌ Browser page not available!');
        return false;
      }
      
      // Navigate to the channel's videos page
      console.log(`\nNavigating to channel: ${channel.url}`);
      const success = await this.navigationService.navigateToChannelVideos(page, channel.url);
      
      if (!success) {
        console.log('Failed to navigate to channel videos page');
        return false;
      }
      
      // Find the latest video
      const videoUrl = await this.navigationService.findLatestVideo(page);
      if (!videoUrl) {
        console.log('Failed to find any videos on this channel');
        return false;
      }
      
      // Navigate to the video
      console.log('Navigating to video: ' + videoUrl);
      await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Skip ads if present
      await this.adService.skipAdsIfPresent(page);
      
      // Get video details
      const videoDetails = await this.videoService.getVideoDetails(page);
      
      // Calculate watch time
      const watchTime = this.videoService.calculateWatchTime(videoDetails, settings);
      console.log(`Will watch for ${watchTime} seconds`);
      
      // Subscribe to channel if enabled
      if (settings.subscribeToChannels) {
        await this.engagementService.subscribeToChannel(page);
      }
      
      // Like video if enabled
      if (settings.likeVideos) {
        await this.engagementService.likeVideo(page);
      }
      
      // Leave a comment using rotation system
      const commentResult = this.engagementService.getNextComment(comments, settings);
      await this.engagementService.leaveComment(page, commentResult.comment);
      
      // Update lastCommentIndex in settings if using rotation
      if (commentResult.isRotated) {
        settings.lastCommentIndex = commentResult.index;
        // Flag that we need to save settings
        settings._commentIndexUpdated = true;
      }
      
      // Watch the video
      await this.videoService.watchVideo(page, watchTime);
      
      return true;
    } catch (error) {
      console.error(`Error supporting channel: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get detailed information about the current video
   * @param {Object} page - Browser page
   * @returns {Promise<Object>} Video details including duration and title
   */
  async getVideoDetails(page) {
    try {
      // Wait for the video player to load fully
      console.log('Waiting for video player elements to load...');
      
      // Wait for critical video elements with expanded timeout
      const selectors = [
        '.ytp-time-duration',                  // Duration display in player
        'h1.ytd-video-primary-info-renderer',  // Video title
        'video.html5-main-video'               // Actual video element
      ];
      
      // Wait for at least one of these elements to be available
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000, visible: true });
          break; // Break once we find at least one element
        } catch (err) {
          // Continue trying other selectors
        }
      }
      
      // Extract video details with a simplified, more reliable approach
      const videoDetails = await page.evaluate(() => {
        // Initialize with default values
        const details = {
          title: 'Unknown Video',
          durationText: '0:00',
          durationSeconds: 300, // Default 5 minutes
          isLive: false
        };
        
        // 1. Get video title
        const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, .title.ytd-video-primary-info-renderer');
        if (titleElement) {
          details.title = titleElement.textContent.trim();
        }
        
        // 2. First check if this is a live stream (most important to detect)
        let isLiveStream = false;
        
        // Check for live badge (red dot)
        const liveBadge = document.querySelector('.ytp-live-badge');
        if (liveBadge && liveBadge.offsetParent !== null) {
          isLiveStream = true;
        }
        
        // Double-check with another strong indicator
        const liveText = document.querySelector('.ytp-live');
        if (liveText && liveText.offsetParent !== null) {
          isLiveStream = true;
        }
        
        // If both indicators agree it's live, mark as live stream
        if (isLiveStream) {
          console.log('Confirmed live stream detection');
          details.isLive = true;
          details.durationText = 'LIVE';
          details.durationSeconds = 300; // Default 5 minutes for live videos
          return details;
        }
        
        // 3. For regular videos, get duration (most reliable method first)
        const videoElement = document.querySelector('video.html5-main-video');
        if (videoElement && videoElement.duration && videoElement.duration > 0 && videoElement.duration < 36000) {
          // We have reliable duration from video element
          details.durationSeconds = Math.round(videoElement.duration);
          details.isLive = false; // Definitely not live
          
          // Format for display (avoiding padStart for compatibility)
          const hours = Math.floor(details.durationSeconds / 3600);
          const minutes = Math.floor((details.durationSeconds % 3600) / 60);
          const seconds = details.durationSeconds % 60;
          
          if (hours > 0) {
            details.durationText = hours + ':' + 
                               (minutes < 10 ? '0' : '') + minutes + ':' + 
                               (seconds < 10 ? '0' : '') + seconds;
          } else {
            details.durationText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
          }
          
          console.log('Video element duration: ' + details.durationText);
        } else {
          // 4. Fallback: Get duration from the UI element
          const durationElement = document.querySelector('.ytp-time-duration');
          if (durationElement) {
            details.durationText = durationElement.textContent.trim();
            console.log('UI duration: ' + details.durationText);
            
            // Parse into seconds
            try {
              const parts = details.durationText.split(':').map(Number);
              
              if (parts.length === 3) { // HH:MM:SS
                details.durationSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
              } else if (parts.length === 2) { // MM:SS
                details.durationSeconds = (parts[0] * 60) + parts[1];
              }
            } catch (e) {
              console.log('Failed to parse duration text: ' + e);
            }
          }
        }
        
        // 5. If we still don't have a duration, use default
        if (!details.durationSeconds || details.durationSeconds <= 0) {
          details.durationSeconds = 300; // Default 5 minutes
          details.durationText = '5:00';
        }
        
        return details;
      });
      
      // Additional verification and logging
      console.log(`Video title: ${videoDetails.title}`);
      console.log(`Video duration: ${videoDetails.durationText} (${videoDetails.durationSeconds} seconds)`);
      
      if (videoDetails.isLive) {
        console.log('This appears to be a live stream');
      }
      
      return videoDetails;
    } catch (error) {
      console.error(`Error getting video details: ${error.message}`);
      // Return default values as fallback
      return {
        title: 'Unknown Video',
        durationText: '5:00',
        durationSeconds: 300, // Default 5 minutes
        isLive: false
      };
    }
  }
  
  /**
   * Get video watch time based on settings (legacy method kept for compatibility)
   * @param {Object} page - Browser page
   * @param {Object} settings - Support settings
   * @returns {Promise<number>} Watch time in seconds
   */
  async getVideoWatchTime(page, settings) {
    try {
      // Use the new method to get details
      const videoDetails = await this.getVideoDetails(page);
      
      // Calculate watch time based on settings
      let watchTime = Math.floor(videoDetails.durationSeconds * settings.watchTimePercentage / 100);
      
      // Limit watch time between min and max
      watchTime = Math.max(settings.minWatchTimeSeconds, Math.min(watchTime, settings.maxWatchTimeSeconds));
      
      return watchTime;
    } catch (error) {
      console.error(`Error getting video duration: ${error.message}`);
      return settings.minWatchTimeSeconds; // Fallback to minimum watch time
    }
  }
  
  /**
   * Leave a comment on the video
   * @param {Object} page - Browser page
   * @param {Array<string>} comments - Array of comments
   */
  async leaveComment(page, comments) {
    try {
      // Get a random comment
      const randomIndex = Math.floor(Math.random() * comments.length);
      const comment = comments[randomIndex];
      
      console.log(`Selected comment: ${comment}`);
      
      // Scroll down to comment section
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      await this.sleep(2000);
      
      // Find the comment input box
      const commentSelector = '#simplebox-placeholder, #commentbox'
      await page.waitForSelector(commentSelector, { timeout: 5000 });
      
      // Click the comment box to activate it
      await page.click(commentSelector);
      
      await this.sleep(1000);
      
      // Find the editable comment area
      const commentTextSelector = '#contenteditable-root, .commentbox-input';
      await page.waitForSelector(commentTextSelector, { timeout: 5000 });
      
      // Type the comment
      await page.type(commentTextSelector, comment);
      
      await this.sleep(1000);
      
      // Find and click the comment submit button
      const submitButtonSelector = '#submit-button, .commentbox-submit';
      await page.waitForSelector(submitButtonSelector, { timeout: 5000 });
      await page.click(submitButtonSelector);
      
      console.log('Comment submitted successfully!');
      
      // Wait a bit for the comment to be posted
      await this.sleep(3000);
    } catch (error) {
      console.error(`Error leaving comment: ${error.message}`);
    }
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
   * Attempt to skip ads if present, with improved detection for ad blockers
   * @param {Object} page - Browser page
   * @returns {Promise<boolean>} Whether ads were detected
   */
  async skipAdsIfPresent(page) {
    try {
      // More reliable ad detection that works with ad blockers
      const adResult = await page.evaluate(() => {
        // Multiple visual and content checks for ads
        const adIndicators = [
          // 1. Check for ad UI elements that are actually visible
          () => {
            const adTexts = document.querySelectorAll('.ytp-ad-text');
            for (const el of adTexts) {
              if (el.offsetParent !== null && el.textContent.trim().length > 0) return true;
            }
            return false;
          },
          
          // 2. Check for ad preview containers that are visible
          () => {
            const adPreviews = document.querySelectorAll('.ytp-ad-preview-container');
            for (const el of adPreviews) {
              if (el.offsetParent !== null) return true;
            }
            return false;
          },
          
          // 3. Check if the skip button is visible (clearest indicator)
          () => {
            const skipButtons = document.querySelectorAll('button.ytp-skip-ad-button, .ytp-ad-skip-button');
            for (const el of skipButtons) {
              if (el.offsetParent !== null) return true;
            }
            return false;
          },
          
          // 4. Check for specific ad text overlays
          () => {
            const adOverlays = document.querySelectorAll('.ytp-ad-text-overlay');
            for (const el of adOverlays) {
              if (el.offsetParent !== null) return true;
            }
            return false;
          },
          
          // 5. Check for ad badge (small 'Ad' text)
          () => {
            const adBadges = Array.from(document.querySelectorAll('.ytp-ad-simple-ad-badge, .ytp-ad-overlay-ad-badge'));
            for (const badge of adBadges) {
              if (badge.offsetParent !== null && badge.innerText.includes('Ad')) return true;
            }
            return false;
          },
          
          // 6. Check if we're on an in-stream ad (most reliable method)
          () => {
            const video = document.querySelector('video.html5-main-video');
            if (video && video.getAttribute('data-is-ad') === 'true') return true;
            return false;
          }
        ];
        
        // Count how many indicators detected an ad
        let adDetectionCount = 0;
        for (const detector of adIndicators) {
          if (detector()) adDetectionCount++;
        }
        
        // Only report an ad if at least 2 indicators confirm it
        // This prevents false positives with ad blockers
        const hasAd = adDetectionCount >= 2;
        
        if (!hasAd) {
          return { hasAd: false };
        }
        
        // Try to skip the ad if we're confident it's an ad
        const skipButton = document.querySelector('button.ytp-skip-ad-button, .ytp-ad-skip-button');
        if (skipButton && skipButton.offsetParent !== null) {
          try {
            skipButton.click();
            return { hasAd: true, skipped: true };
          } catch(e) {
            // Failed to click
          }
        }
        
        return { hasAd: true, skipped: false };
      });
      
      if (!adResult.hasAd) {
        // No ads detected, quietly continue without logging
        return false;
      }
      
      // If ad was detected but not skipped, wait for it
      if (adResult.hasAd && !adResult.skipped) {
        console.log('Ad detected but could not skip. Waiting 5 seconds...');
        await this.sleep(5000);
        
        // Try once more to skip
        const secondAttempt = await page.evaluate(() => {
          const skipButton = document.querySelector('button.ytp-skip-ad-button, .ytp-ad-skip-button');
          if (skipButton && skipButton.offsetParent !== null) {
            try {
              skipButton.click();
              return true;
            } catch(e) {
              // Failed to click
            }
          }
          return false;
        });
        
        if (secondAttempt) {
          console.log('Successfully skipped ad on second attempt.');
        } else {
          console.log('Ad still not skippable. Continuing with video...');
        }
      } else if (adResult.skipped) {
        console.log('Successfully skipped ad!');
      }
      
      // Wait a moment for video to start properly
      await this.sleep(1000);
      
      return true;
    } catch (error) {
      console.error(`Error skipping ads: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Sleep for a specified time
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SupportService();

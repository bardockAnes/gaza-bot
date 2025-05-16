/**
 * @file supportService.js
 * @description Service for Gaza Support automation
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('../ui/menu');
const browserService = require('./browser');

/**
 * Support service for Gaza YouTube channel support
 */
class SupportService {
  constructor() {
    this.browser = browserService;
    this.menu = menu;
    this.channelsPath = path.resolve(__dirname, '../data/gazaSupport/channels.json');
    this.commentsPath = path.resolve(__dirname, '../data/gazaSupport/comments.json');
    this.settingsPath = path.resolve(__dirname, '../data/gazaSupport/settings.json');
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
      const channels = await this.loadChannels();
      const settings = await this.loadSettings();
      const comments = await this.loadComments();
      
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
      for (const channel of channels) {
        // Show current channel
        console.clear();
        console.log(`\nu27a1ufe0f Supporting channel: ${channel.name}`);
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
          await this.saveChannels(channels);
          
          console.log(`\nu2705 Successfully supported ${channel.name}!`);
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
      
      // Navigate directly to the videos page of the channel
      const videosUrl = channel.url + '/videos';
      console.log(`\nNavigating directly to videos page: ${videosUrl}`);
      await page.goto(videosUrl, { waitUntil: 'networkidle2' });
      
      // Find the latest video
      console.log('Looking for latest video...');
      
      // Wait for videos to load
      console.log('Waiting for page to fully load...');
      await this.sleep(5000);
      
      // Find video URL using a simplified approach
      console.log('Finding the latest video...');
      const videoUrl = await page.evaluate(() => {
        // Try to find a video thumbnail from rich item renderer (new YouTube UI)
        const thumbnails = document.querySelectorAll('ytd-rich-item-renderer a#thumbnail[href*="/watch"]');
        if (thumbnails && thumbnails.length > 0) {
          return thumbnails[0].href;
        }
        
        // Fallback to any video link
        const videoLinks = Array.from(document.querySelectorAll('a[href*="/watch"]'))
          .filter(link => link.href.includes('youtube.com/watch?v='));
          
        return videoLinks.length > 0 ? videoLinks[0].href : null;
      });
      
      // Check if we found a video
      if (!videoUrl) {
        console.log('Failed to find any videos on this channel.');
        return false;
      }
      
      console.log('Found video URL: ' + videoUrl);
      const latestVideo = { href: videoUrl, title: 'Latest video' };
      
      // Navigate to the video with a longer timeout
      console.log('Navigating to video...');
      await page.goto(latestVideo.href, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Check for and skip ads
      console.log('Checking for ads...');
      await this.skipAdsIfPresent(page);
      
      // Get video details and calculate watch time
      console.log('Getting video details...');
      const videoDetails = await this.getVideoDetails(page);
      console.log(`Video duration: ${videoDetails.durationText} (${videoDetails.durationSeconds} seconds)`);
      
      // Calculate watch time based on settings and actual duration
      const watchTimePercentage = settings.watchTimePercentage / 100;
      let targetWatchTime = Math.floor(videoDetails.durationSeconds * watchTimePercentage);
      
      // Apply min/max boundaries from settings
      targetWatchTime = Math.max(
        Math.min(settings.minWatchTimeSeconds, videoDetails.durationSeconds), // Don't watch longer than the video if it's shorter than min
        Math.min(targetWatchTime, settings.maxWatchTimeSeconds) // Don't exceed max watch time
      );
      
      console.log(`Will watch for ${targetWatchTime} seconds (${Math.floor(targetWatchTime/videoDetails.durationSeconds * 100)}% of video)`);
      
      // First make sure video is at the beginning
      console.log('Ensuring video starts from the beginning...');
      await page.evaluate(() => {
        // Get the video element
        const video = document.querySelector('video.html5-main-video');
        if (video) {
          // Force seek to the beginning
          video.currentTime = 0;
          // Try to play the video
          if (video.paused) {
            video.play().catch(() => console.log('Could not autoplay video'));
          }
        }
      });
      await this.sleep(1000);
      
      // Verify we're at the beginning of the video
      const videoPosition = await page.evaluate(() => {
        const video = document.querySelector('video.html5-main-video');
        return video ? video.currentTime : 0;
      });
      console.log(`Current video position: ${videoPosition} seconds`);
      
      if (videoPosition > 10) {
        console.log('Warning: Video not starting from beginning! Attempting to correct...');
        await page.evaluate(() => {
          const video = document.querySelector('video.html5-main-video');
          if (video) {
            video.currentTime = 0;
          }
        });
        await this.sleep(1000);
      }
      
      // Subscribe to the channel if enabled (do this first, most important)
      if (settings.subscribeToChannels) {
        console.log('Subscribing to the channel...');
        try {
          // Add random delay before subscribing (more human-like behavior)
          const preSubscribeDelay = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
          console.log(`Waiting ${preSubscribeDelay}ms before subscribing...`);
          await this.sleep(preSubscribeDelay);
          
          // Scroll slightly to ensure subscribe button is in view
          await page.evaluate(() => {
            window.scrollTo({
              top: Math.floor(Math.random() * 150) + 100, // Random position between 100-250px
              behavior: 'smooth'
            });
          });
          
          await this.sleep(1000); // Wait for scroll to complete
          
          // More robust subscribe method with human-like behavior
          const subscribed = await page.evaluate(() => {
            // Try multiple selector approaches for latest YouTube UI
            const selectors = [
              '#subscribe-button ytd-subscribe-button-renderer',
              '#subscribe-button button',
              'button[aria-label*="Subscribe"]',
              'yt-button-renderer[aria-label*="Subscribe"]',
              'ytd-subscribe-button-renderer',
              '.ytd-video-secondary-info-renderer #subscribe-button',
              'ytd-subscribe-button-renderer button'
            ];
            
            // Helper function to simulate human-like click
            const humanClick = (element) => {
              // Random small delay before clicking (25-75ms)
              const clickDelay = Math.floor(Math.random() * 50) + 25;
              return new Promise(resolve => {
                setTimeout(() => {
                  try {
                    // Check if already subscribed
                    const isSubscribed = 
                      element.getAttribute('subscribed') === 'true' ||
                      element.getAttribute('aria-pressed') === 'true' ||
                      element.getAttribute('aria-label')?.includes('Subscribed');
                      
                    if (isSubscribed) {
                      resolve('already-subscribed');
                      return;
                    }
                    
                    // Click the element
                    element.click();
                    resolve('clicked');
                  } catch (e) {
                    resolve('failed');
                  }
                }, clickDelay);
              });
            };
            
            // Try each selector
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const element of elements) {
                if (element && element.offsetParent !== null) {
                  // Only consider visible elements
                  const rect = element.getBoundingClientRect();
                  const isVisible = rect.width > 0 && rect.height > 0 &&
                    window.getComputedStyle(element).visibility !== 'hidden';
                  
                  if (isVisible) {
                    const result = humanClick(element);
                    if (result === 'clicked') return true;
                    if (result === 'already-subscribed') return 'already';
                  }
                }
              }
            }
            return false;
          });
          
          if (subscribed === true) {
            console.log('Successfully subscribed to channel!');
            // Add a small delay after subscribing (more natural)
            await this.sleep(Math.floor(Math.random() * 1500) + 500);
          } else if (subscribed === 'already') {
            console.log('Already subscribed to this channel');
          } else {
            console.log('Could not find subscribe button');
          }
        } catch (error) {
          console.log(`Subscribe error: ${error.message}`);
        }
      }
      
      // Like the video before scrolling for comments
      if (settings.likeVideos) {
        console.log('Attempting to like the video with human-like behavior...');
        
        try {
          // Add random delay before liking (more human-like behavior)
          const preLikeDelay = Math.floor(Math.random() * 2500) + 2000; // 2-4.5 seconds
          console.log(`Watching video for ${preLikeDelay}ms before liking...`);
          await this.sleep(preLikeDelay);
          
          // Make sure we're at the right position to see the video controls with smooth scrolling
          await page.evaluate(() => {
            // Use smooth scrolling with random position (more human-like)
            window.scrollTo({
              top: Math.floor(Math.random() * 100) + 150, // Random position between 150-250px
              behavior: 'smooth'
            });
          });
          
          // Wait for scroll to complete
          await this.sleep(Math.floor(Math.random() * 500) + 500); // 500-1000ms
          
          // Wait for the like button to appear with more current selectors
          await page.waitForSelector('#top-level-buttons-computed ytd-toggle-button-renderer:first-child, button[aria-label*="like"], ytd-segmented-like-dislike-button-renderer button:first-child', 
            { visible: true, timeout: 5000 }).catch(() => {});
            
          // Small delay for UI to stabilize with randomness
          await this.sleep(Math.floor(Math.random() * 800) + 700); // 700-1500ms
          
          // Check if already liked and click only if not already liked with human-like behavior
          const likingResult = await page.evaluate(() => {
            // Try multiple selectors focused on current YouTube UI
            const likeButtonSelectors = [
              // Latest YouTube UI selectors first
              'ytd-segmented-like-dislike-button-renderer button:first-child',
              '#segmented-like-button button',
              '#top-level-buttons-computed ytd-toggle-button-renderer:first-child button',
              'button[aria-label*="Like"]',
              'button[aria-label*="like this video"]',
              'button[title="I like this"]',
              'ytd-toggle-button-renderer[aria-label*="Like"]'
            ];
            
            // Helper function to simulate human-like click with random delays
            const humanLikeClick = (button) => {
              // Random small delay before clicking (50-150ms)
              const clickDelay = Math.floor(Math.random() * 100) + 50;
              return new Promise(resolve => {
                setTimeout(() => {
                  try {
                    // Check multiple properties for 'already liked' state
                    const isAlreadyLiked = 
                      button.getAttribute('aria-pressed') === 'true' ||
                      button.classList.contains('style-default-active') ||
                      button.classList.contains('ytd-toggle-button-renderer-activated') ||
                      button.getAttribute('aria-label')?.includes('Remove like');
                      
                    if (isAlreadyLiked) {
                      resolve({ success: true, message: 'Video is already liked' });
                      return;
                    }
                    
                    // Click with a try-catch to handle any issues
                    button.click();
                    resolve({ success: true, message: 'Successfully liked the video' });
                  } catch (e) {
                    resolve({ success: false, message: `Click failed: ${e.message}` });
                  }
                }, clickDelay);
              });
            };
            
            // Try each selector
            for (const selector of likeButtonSelectors) {
              const buttons = document.querySelectorAll(selector);
              for (const button of buttons) {
                // More thorough visibility check
                const rect = button.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(button);
                const isVisible = rect.width > 0 && rect.height > 0 &&
                  button.offsetParent !== null &&
                  computedStyle.visibility !== 'hidden' &&
                  computedStyle.display !== 'none';
                
                if (isVisible) {
                  return humanLikeClick(button);
                }
              }
            }
            return { success: false, message: 'No suitable like button found' };
          });
          
          console.log(likingResult.message);
          
          // Add a natural delay after liking
          if (likingResult.success) {
            await this.sleep(Math.floor(Math.random() * 1000) + 500); // 500-1500ms
          }
        } catch (error) {
          console.log(`Error while liking video: ${error.message}`);
        }
      }
      
      // Now scroll down to comment section
      console.log('Scrolling to comment section...');
      await page.evaluate(() => {
        // Scroll about halfway down the page to find comments
        window.scrollBy(0, window.innerHeight);
      });
      await this.sleep(1500);
      
      // Leave a comment early in the process
      console.log('Leaving a comment early...');
      const commentSuccess = await this.leaveComment(page, comments);
      
      // Like the video if enabled (do this early too)
      if (settings.likeVideos) {
        console.log('Liking the video...');
        try {
          const likeButton = await page.$('button[aria-label^="Like"][aria-pressed="false"]');
      
          if (likeButton) {
            await likeButton.click();
            console.log('Successfully liked the video!');
          } else {
            console.log('Like button not found or already pressed, trying fallback...');
      
            const liked = await page.evaluate(() => {
              const likeSelectors = [
                'button[aria-label*="like"]',
                'ytd-toggle-button-renderer[aria-label*="like"]',
                '#top-level-buttons-computed ytd-toggle-button-renderer:first-child',
                'ytd-like-button-renderer'
              ];
              
              for (const selector of likeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                  const ariaPressed = element.getAttribute('aria-pressed');
                  const visible = element.offsetHeight > 0 && element.offsetWidth > 0;
      
                  if (visible && (ariaPressed === null || ariaPressed === 'false')) {
                    try {
                      element.click();
                      return true;
                    } catch (e) {
                      console.log('Failed to click like button, trying another');
                    }
                  }
                }
              }
              return false;
            });
      
            console.log(liked ? 'Successfully liked the video (fallback).' : 'Like button not clickable or already liked.');
          }
        } catch (error) {
          console.log(`Like error: ${error.message}`);
        }
      }
      
      // Now start watching the video (scroll back up)
      console.log('Scrolling back to video and starting watch timer...');
      await page.evaluate(() => {
        // Scroll back to top to watch video
        window.scrollTo(0, 0);
        
        // Ensure video is playing from beginning
        const video = document.querySelector('video.html5-main-video');
        if (video) {
          // Force seek to the beginning again
          video.currentTime = 0;
          // Try to play if paused
          if (video.paused) {
            video.play().catch(() => {});
          }
        }
      });
      
      // Store initial video information for comparison
      const initialVideoId = await page.evaluate(() => {
        // Extract video ID from URL or player data
        const url = window.location.href;
        const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[\?&]|$)/);
        return match ? match[1] : '';
      });
      
      console.log(`Started watching video with ID: ${initialVideoId}...`);
      
      // Start watching the video with better progress tracking
      const startTime = Date.now();
      const checkInterval = 10; // Check progress every 10 seconds
      let elapsedSeconds = 0;
      
      // Watch until target time is reached
      while (elapsedSeconds < targetWatchTime) {
        // Wait for specified interval
        await this.sleep(checkInterval * 1000);
        
        // Check video state: current position, duration, and if it has ended
        const videoState = await page.evaluate(() => {
          const video = document.querySelector('video.html5-main-video');
          if (!video) return { error: 'Video element not found' };
          
          // Get video metadata
          const currentTime = video.currentTime;
          const duration = video.duration;
          const hasEnded = video.ended;
          const isPaused = video.paused;
          
          // Check if we're at the end of the video
          const isNearEnd = duration > 0 && (currentTime >= duration - 5);
          
          // Get current video ID
          const url = window.location.href;
          const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[\?&]|$)/);
          const videoId = match ? match[1] : '';
          
          return {
            videoId,
            currentTime,
            duration,
            hasEnded,
            isPaused,
            isNearEnd
          };
        });
        
        // Log current video position for debugging
        console.log(`Video position: ${Math.floor(videoState.currentTime)}/${Math.floor(videoState.duration)} seconds`);
        
        // Check if video ID changed (autoplay to next video)
        if (videoState.videoId !== initialVideoId && initialVideoId !== '') {
          console.log(`Video changed from ${initialVideoId} to ${videoState.videoId}. Ending watch session.`);
          break;
        }
        
        // Check if video has ended or is very close to ending
        if (videoState.hasEnded || videoState.isNearEnd) {
          console.log('Video has ended or is near the end. Stopping watch timer.');
          break;
        }
        
        // If video is paused, try to resume playback
        if (videoState.isPaused) {
          console.log('Video is paused. Attempting to resume...');
          await page.evaluate(() => {
            const video = document.querySelector('video.html5-main-video');
            if (video && video.paused) {
              video.play().catch(() => console.log('Could not resume video'));
            }
          });
        }
        
        // Skip ads if they appear during playback
        await this.skipAdsIfPresent(page);
        
        // Update elapsed time
        elapsedSeconds += checkInterval;
        console.log(`Watched ${elapsedSeconds}/${targetWatchTime} seconds (${Math.floor(elapsedSeconds/targetWatchTime * 100)}% complete)`);
      }
      
      console.log('Finished watching video!');
      
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
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SupportService();

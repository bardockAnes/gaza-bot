/**
 * @file videoService.js
 * @description Service for handling video playback and information
 */

class VideoService {
  constructor(browserService) {
    this.browser = browserService;
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
   * Calculate watch time based on settings and video duration
   * @param {Object} videoDetails - Video details from getVideoDetails
   * @param {Object} settings - Support settings
   * @returns {number} Watch time in seconds
   */
  calculateWatchTime(videoDetails, settings) {
    // Calculate watch time based on settings and actual duration
    const watchTimePercentage = settings.watchTimePercentage / 100;
    let targetWatchTime = Math.floor(videoDetails.durationSeconds * watchTimePercentage);
    
    // Apply min/max boundaries from settings
    targetWatchTime = Math.max(
      Math.min(settings.minWatchTimeSeconds, videoDetails.durationSeconds), // Don't watch longer than the video if it's shorter than min
      Math.min(targetWatchTime, settings.maxWatchTimeSeconds) // Don't exceed max watch time
    );
    
    console.log(`Will watch for ${targetWatchTime} seconds (${Math.floor(targetWatchTime/videoDetails.durationSeconds * 100)}% of video)`);
    return targetWatchTime;
  }
  
  /**
   * Watch a video for the specified time
   * @param {Object} page - Browser page
   * @param {number} watchTimeSeconds - Seconds to watch
   * @returns {Promise<boolean>} Success status
   */
  async watchVideo(page, watchTimeSeconds) {
    try {
      console.log('Scrolling back to video and starting watch timer...');
      await page.evaluate(() => {
        // Scroll back to top to watch video
        window.scrollTo(0, 0);
        
        // Ensure video is playing from beginning
        const video = document.querySelector('video.html5-main-video');
        if (video) {
          // Force seek to the beginning
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
        const match = url.match(/(?:v=|\/|\/)([0-9A-Za-z_-]{11})(?:[\?&]|$)/);
        return match ? match[1] : '';
      });
      
      console.log(`Started watching video with ID: ${initialVideoId}...`);
      
      // Start watching the video with progress tracking
      const startTime = Date.now();
      const checkInterval = 10; // Check progress every 10 seconds
      let elapsedSeconds = 0;
      
      // Watch until target time is reached
      while (elapsedSeconds < watchTimeSeconds) {
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
          const match = url.match(/(?:v=|\/|\/)([0-9A-Za-z_-]{11})(?:[\?&]|$)/);
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
        
        // Update elapsed time
        elapsedSeconds += checkInterval;
        console.log(`Watched ${elapsedSeconds}/${watchTimeSeconds} seconds (${Math.floor(elapsedSeconds/watchTimeSeconds * 100)}% complete)`);
      }
      
      console.log('Finished watching video!');
      return true;
    } catch (error) {
      console.error(`Error watching video: ${error.message}`);
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

module.exports = VideoService;

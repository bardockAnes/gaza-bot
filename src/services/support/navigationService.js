/**
 * @file navigationService.js
 * @description Service for navigating to YouTube channels and videos
 */

class NavigationService {
  constructor(browserService) {
    this.browser = browserService;
  }
  
  /**
   * Navigate to a channel's videos page
   * @param {Object} page - Browser page
   * @param {string} channelUrl - Channel URL to navigate to
   * @returns {Promise<boolean>} Success status
   */
  async navigateToChannelVideos(page, channelUrl) {
    try {
      // Navigate directly to the videos page of the channel
      const videosUrl = channelUrl + '/videos';
      console.log(`Navigating directly to videos page: ${videosUrl}`);
      await page.goto(videosUrl, { waitUntil: 'networkidle2' });
      
      // Wait for page to fully load
      console.log('Waiting for page to fully load...');
      await this.sleep(5000);
      
      return true;
    } catch (error) {
      console.error(`Error navigating to channel: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Find the latest video on the current channel page
   * @param {Object} page - Browser page
   * @returns {Promise<string|null>} Video URL or null if not found
   */
  async findLatestVideo(page) {
    try {
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
      
      if (videoUrl) {
        console.log('Found video URL: ' + videoUrl);
        return videoUrl;
      } else {
        console.log('Failed to find any videos on this channel');
        return null;
      }
    } catch (error) {
      console.error(`Error finding latest video: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Parse video upload date information
   * @param {Object} page - Browser page
   * @returns {Promise<Array>} Array of videos with upload dates
   */
  async parseVideoUploadDates(page) {
    try {
      return await page.evaluate(() => {
        const videos = [];
        
        // Find all video elements
        const videoElements = document.querySelectorAll('ytd-grid-video-renderer, ytd-rich-item-renderer');
        
        videoElements.forEach((el) => {
          try {
            // Find the link
            const link = el.querySelector('a#video-title-link, a#thumbnail');
            if (!link || !link.href) return;
            
            // Get upload time text
            const timeText = el.querySelector('#metadata-line .style-scope:nth-child(2)')?.textContent || 
                             el.querySelector('#metadata .style-scope:nth-child(2)')?.textContent ||
                             '';
            
            // Get title
            const title = el.querySelector('#video-title')?.textContent.trim() || 
                           link.getAttribute('title') ||
                           'Unknown';
            
            videos.push({
              href: link.href,
              title: title,
              uploadTimeText: timeText.trim()
            });
          } catch (e) {
            // Skip this video element
          }
        });
        
        return videos;
      });
    } catch (error) {
      console.error(`Error parsing upload dates: ${error.message}`);
      return [];
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

module.exports = NavigationService;

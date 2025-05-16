/**
 * @file engagementService.js
 * @description Service for handling YouTube engagement (likes, comments, subscribes)
 */

class EngagementService {
  constructor(browserService) {
    this.browser = browserService;
  }
  
  /**
   * Subscribe to the current channel
   * @param {Object} page - Browser page
   * @returns {Promise<boolean>} Success status
   */
  async subscribeToChannel(page) {
    try {
      console.log('Subscribing to the channel...');
      
      // Much more robust subscribe method
      const subscribed = await page.evaluate(() => {
        // Try multiple selector approaches
        const selectors = [
          'button[aria-label*="Subscribe"]',
          'yt-button-renderer[aria-label*="Subscribe"]',
          'ytd-subscribe-button-renderer',
          '#subscribe-button' // Common container ID
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            if (element && element.offsetParent !== null) {
              try {
                // Trigger click event
                element.click();
                return true;
              } catch (e) {
                console.log('Failed to click, trying another element');
              }
            }
          }
        }
        return false;
      });
      
      if (subscribed) {
        console.log('Successfully subscribed to channel!');
      } else {
        console.log('Could not find subscribe button, might already be subscribed');
      }
      
      return subscribed;
    } catch (error) {
      console.log(`Subscribe error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Like the current video
   * @param {Object} page - Browser page
   * @returns {Promise<boolean>} Success status
   */
  async likeVideo(page) {
    try {
      console.log('Attempting to like the video with precise selectors...');
      
      // Make sure we're at the right position to see the video controls
      await page.evaluate(() => {
        // Scroll to position where like button should be visible but not into comments
        window.scrollTo(0, 200);
      });
      
      // Wait for the like button to appear, using the specific selectors
      await page.waitForSelector('button[title="I like this"], button[aria-label^="like this video"], button[aria-label^="Like"], ytd-toggle-button-renderer[aria-label^="Like"]', 
        { visible: true, timeout: 5000 }).catch(() => {});
        
      // Small delay for UI to stabilize
      await this.sleep(1000);
      
      // Check if already liked and click only if not already liked
      const likingResult = await page.evaluate(() => {
        // Try multiple selectors focused on exact attributes
        const likeButtonSelectors = [
          'button[title="I like this"]',
          'button[aria-label^="like this video"]',
          'button[aria-label^="Like"]',
          'ytd-toggle-button-renderer[aria-label^="Like"]',
          '#top-level-buttons-computed ytd-toggle-button-renderer:first-child button'
        ];
        
        for (const selector of likeButtonSelectors) {
          const buttons = document.querySelectorAll(selector);
          for (const button of buttons) {
            // Critical: Check if button is already pressed/liked
            const isAlreadyLiked = button.getAttribute('aria-pressed') === 'true';
            const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0;
            
            if (isVisible && !isAlreadyLiked) {
              // Only click if not already liked
              try {
                button.click();
                return { success: true, message: `Clicked ${selector}` };
              } catch (e) {
                // Continue to next button if this one fails
              }
            } else if (isVisible && isAlreadyLiked) {
              return { success: true, message: 'Video is already liked' };
            }
          }
        }
        return { success: false, message: 'No suitable like button found' };
      });
      
      console.log(likingResult.message);
      return likingResult.success;
    } catch (error) {
      console.log(`Error while liking video: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get a random comment from the comments array
   * @param {Array<string>} comments - Array of comments
   * @returns {string} A random comment
   */
  getRandomComment(comments) {
    const randomIndex = Math.floor(Math.random() * comments.length);
    return comments[randomIndex];
  }
  
  /**
   * Leave a comment on the current video
   * @param {Object} page - Browser page
   * @param {string} comment - Comment text to leave
   * @returns {Promise<boolean>} Success status
   */
  async leaveComment(page, comment) {
    try {
      console.log(`Leaving comment: ${comment}`);
      
      // Scroll down to comment section
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      await this.sleep(2000);
      
      // Find the comment input box
      const commentSelector = '#simplebox-placeholder, #commentbox';
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
      return true;
    } catch (error) {
      console.error(`Error leaving comment: ${error.message}`);
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

module.exports = EngagementService;

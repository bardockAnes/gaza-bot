/**
 * @file adService.js
 * @description Service for detecting and skipping YouTube ads
 */

class AdService {
  constructor(browserService) {
    this.browser = browserService;
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

module.exports = AdService;

/**
 * @file accountsMenu.js
 * @description Accounts management menu for Gaza Support
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('./menu');

/**
 * Accounts menu handler
 */
class AccountsMenuHandler {
  constructor() {
    this.channelsPath = path.resolve(__dirname, '../data/gazaSupport/channels.json');
  }
  
  /**
   * Display the accounts management menu
   */
  async showMenu() {
    const options = [
      'View All Channels',
      'Add New Channel',
      'Remove Channel',
      'Reset Support Counts'
    ];
    
    menu.showMenu('Manage YouTube Channels', options);
    
    const choice = await menu.getInput('Enter your choice');
    await this.handleChoice(choice);
  }
  
  /**
   * Handle accounts menu choices
   * @param {string} choice - User's menu choice
   */
  async handleChoice(choice) {
    switch(choice) {
      case '1': // View All Channels
        await this.viewChannels();
        break;
        
      case '2': // Add New Channel
        await this.addChannel();
        break;
        
      case '3': // Remove Channel
        await this.removeChannel();
        break;
        
      case '4': // Reset Support Counts
        await this.resetCounts();
        break;
        
      case '0': // Back to Gaza Support menu
        return; // Will return to parent menu
        
      default:
        console.log('\nu274c Invalid option. Please try again.');
        await menu.waitForEnter();
        await this.showMenu();
        return;
    }
    
    // After executing an action, show this menu again
    await this.showMenu();
  }
  
  /**
   * View all channels
   */
  async viewChannels() {
    try {
      console.log('\nu27a1ufe0f Loading channel list...');
      
      // Check if channels file exists
      if (!await fs.pathExists(this.channelsPath)) {
        console.log('\nu274c No channels found! Add some channels first.');
        await menu.waitForEnter();
        return;
      }
      
      // Load channels from file
      const channels = await fs.readJson(this.channelsPath);
      
      if (channels.length === 0) {
        console.log('\nu274c No channels found! Add some channels first.');
        await menu.waitForEnter();
        return;
      }
      
      // Display channels in a table-like format
      console.log('\n==== YouTube Channels ====');
      console.log('\n ID | Channel Name | Support Count | Last Supported');
      console.log('--------------------------------------------------');
      
      channels.forEach((channel, index) => {
        // Decode URL-encoded channel names
        let displayName = channel.name;
        try {
          // Check if the name is URL-encoded (contains % characters)
          if (channel.name.includes('%')) {
            displayName = decodeURIComponent(channel.name);
          }
        } catch (e) {
          // If decoding fails, use the original name
          displayName = channel.name;
        }
        
        const lastSupported = channel.lastSupported ? 
          new Date(channel.lastSupported).toLocaleString() : 'Never';
        
        console.log(`${index + 1}. ${displayName} | ${channel.supportCount || 0} | ${lastSupported}`);
      });
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Add a new channel
   */
  async addChannel() {
    try {
      console.log('\nu27a1ufe0f Add a new YouTube channel');
      
      // Get channel URL from user
      const channelUrl = await menu.getInput('Enter YouTube channel URL (e.g., https://www.youtube.com/@channelname)');
      
      // Check for valid input
      if (channelUrl === '0' || channelUrl === 'EMPTY_INPUT') {
        console.log('\nu274c Channel addition cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      // Extract channel ID, name from URL (in a real implementation, this would use the YouTube API)
      console.log('\nu27a1ufe0f Adding channel...');
      
      // For demonstration purposes (in a real implementation, we'd parse the channel URL)
      const channelId = 'UC' + Math.random().toString(36).substring(2, 15);
      const channelName = channelUrl.split('@')[1] || 'New Channel';
      
      // Create new channel object
      const newChannel = {
        id: channelId,
        name: channelName,
        url: channelUrl,
        addedOn: new Date().toISOString(),
        supportCount: 0,
        lastSupported: null
      };
      
      // Load existing channels or create empty array
      let channels = [];
      if (await fs.pathExists(this.channelsPath)) {
        channels = await fs.readJson(this.channelsPath);
        
        // Check if channel already exists (by URL or channel name)
        const isDuplicate = channels.some(channel => {
          // Compare the exact URLs first (most reliable)
          if (channel.url === channelUrl) {
            return true;
          }
          
          // Extract channel identifier from URL
          // For URLs like https://www.youtube.com/@channelname
          const getChannelIdentifier = (url) => {
            try {
              // Extract everything after @ symbol if present
              if (url.includes('@')) {
                return url.split('@')[1].split('/')[0];
              }
              // For channel URLs without @
              return url.split('/').pop();
            } catch (e) {
              return url; // Return original URL if extraction fails
            }
          };
          
          const existingIdentifier = getChannelIdentifier(channel.url);
          const newIdentifier = getChannelIdentifier(channelUrl);
          
          return existingIdentifier === newIdentifier;
        });
        
        if (isDuplicate) {
          console.log('\n\u274c This channel already exists in your list!');
          await menu.waitForEnter();
          return;
        }
      }
      
      // Add new channel
      channels.push(newChannel);
      
      // Save updated channels list
      await fs.writeJson(this.channelsPath, channels, { spaces: 2 });
      
      console.log(`\nu2705 Channel "${channelName}" added successfully!`);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Remove a channel
   */
  async removeChannel() {
    try {
      console.log('\nu27a1ufe0f Remove a YouTube channel');
      
      // Check if channels file exists
      if (!await fs.pathExists(this.channelsPath)) {
        console.log('\nu274c No channels found! Add some channels first.');
        await menu.waitForEnter();
        return;
      }
      
      // Load channels from file
      const channels = await fs.readJson(this.channelsPath);
      
      if (channels.length === 0) {
        console.log('\nu274c No channels found! Add some channels first.');
        await menu.waitForEnter();
        return;
      }
      
      // Display channels for selection
      console.log('\n==== Select Channel to Remove ====');
      channels.forEach((channel, index) => {
        console.log(`${index + 1}. ${channel.name}`);
      });
      
      // Get user choice
      const choice = await menu.getInput('Enter channel number to remove (or 0 to cancel)');
      
      // Check for valid input
      if (choice === '0' || choice === 'EMPTY_INPUT') {
        console.log('\nu274c Channel removal cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      const index = parseInt(choice) - 1;
      
      if (isNaN(index) || index < 0 || index >= channels.length) {
        console.log('\nu274c Invalid selection. Please try again.');
        await menu.waitForEnter();
        return;
      }
      
      // Get channel to remove
      const channelToRemove = channels[index];
      
      // Confirm removal
      const confirm = await menu.getInput(`Are you sure you want to remove "${channelToRemove.name}"? (y/n)`);
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('\nu274c Channel removal cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      // Remove channel from array
      channels.splice(index, 1);
      
      // Save updated channels list
      await fs.writeJson(this.channelsPath, channels, { spaces: 2 });
      
      console.log(`\nu2705 Channel "${channelToRemove.name}" removed successfully!`);
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Reset support counts for all channels
   */
  async resetCounts() {
    try {
      console.log('\nu27a1ufe0f Reset support counts for all channels');
      
      // Check if channels file exists
      if (!await fs.pathExists(this.channelsPath)) {
        console.log('\nu274c No channels found! Add some channels first.');
        await menu.waitForEnter();
        return;
      }
      
      // Confirm reset
      const confirm = await menu.getInput('Are you sure you want to reset all support counts? (y/n)');
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('\nu274c Reset cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      // Load channels from file
      const channels = await fs.readJson(this.channelsPath);
      
      // Reset counts for all channels
      const updatedChannels = channels.map(channel => ({
        ...channel,
        supportCount: 0,
        lastSupported: null
      }));
      
      // Save updated channels list
      await fs.writeJson(this.channelsPath, updatedChannels, { spaces: 2 });
      
      console.log('\nu2705 Support counts reset successfully!');
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\nu274c Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
}

module.exports = new AccountsMenuHandler();

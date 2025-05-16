/**
 * @file commentsMenu.js
 * @description Comments management menu for Gaza Support
 */

const fs = require('fs-extra');
const path = require('path');
const menu = require('./menu');

/**
 * Comments menu handler
 */
class CommentsMenuHandler {
  constructor() {
    this.commentsPath = path.resolve(__dirname, '../data/gazaSupport/comments.json');
  }
  
  /**
   * Display the comments management menu
   */
  async showMenu() {
    const options = [
      'View All Comments',
      'Add New Comment',
      'Remove Comment',
      'Test Comment Display'
    ];
    
    menu.showMenu('Manage Support Comments', options);
    
    const choice = await menu.getInput('Enter your choice');
    await this.handleChoice(choice);
  }
  
  /**
   * Handle comments menu choices
   * @param {string} choice - User's menu choice
   */
  async handleChoice(choice) {
    switch(choice) {
      case '1': // View All Comments
        await this.viewComments();
        break;
        
      case '2': // Add New Comment
        await this.addComment();
        break;
        
      case '3': // Remove Comment
        await this.removeComment();
        break;
        
      case '4': // Test Comment Display
        await this.testComment();
        break;
        
      case '0': // Back to Gaza Support menu
        return; // Will return to parent menu
        
      default:
        console.log('\n❌ Invalid option. Please try again.');
        await menu.waitForEnter();
        await this.showMenu();
        return;
    }
    
    // After executing an action, show this menu again
    await this.showMenu();
  }
  
  /**
   * View all comments
   */
  async viewComments() {
    try {
      console.log('\n➡️ Loading comments...');
      
      // Check if comments file exists
      if (!await fs.pathExists(this.commentsPath)) {
        console.log('\n❌ No comments found! Add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      // Load comments from file
      const comments = await fs.readJson(this.commentsPath);
      
      if (comments.length === 0) {
        console.log('\n❌ No comments found! Add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      // Display comments
      console.log('\n==== Support Comments ====\n');
      
      comments.forEach((comment, index) => {
        console.log(`${index + 1}. ${comment}`);
      });
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Add a new comment
   */
  async addComment() {
    try {
      console.log('\n➡️ Add a new support comment');
      
      // Get comment text from user
      const commentText = await menu.getInput('Enter your comment text');
      
      // Check for valid input
      if (commentText === '0' || commentText === 'EMPTY_INPUT') {
        console.log('\n❌ Comment addition cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      // Load existing comments or create empty array
      let comments = [];
      if (await fs.pathExists(this.commentsPath)) {
        comments = await fs.readJson(this.commentsPath);
      }
      
      // Add new comment
      comments.push(commentText);
      
      // Save updated comments list
      await fs.writeJson(this.commentsPath, comments, { spaces: 2 });
      
      console.log('\n✅ Comment added successfully!');
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Remove a comment
   */
  async removeComment() {
    try {
      console.log('\n➡️ Remove a support comment');
      
      // Check if comments file exists
      if (!await fs.pathExists(this.commentsPath)) {
        console.log('\n❌ No comments found! Add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      // Load comments from file
      const comments = await fs.readJson(this.commentsPath);
      
      if (comments.length === 0) {
        console.log('\n❌ No comments found! Add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      // Display comments for selection
      console.log('\n==== Select Comment to Remove ====\n');
      comments.forEach((comment, index) => {
        console.log(`${index + 1}. ${comment}`);
      });
      
      // Get user choice
      const choice = await menu.getInput('Enter comment number to remove (or 0 to cancel)');
      
      // Check for valid input
      if (choice === '0' || choice === 'EMPTY_INPUT') {
        console.log('\n❌ Comment removal cancelled.');
        await menu.waitForEnter();
        return;
      }
      
      const index = parseInt(choice) - 1;
      
      if (isNaN(index) || index < 0 || index >= comments.length) {
        console.log('\n❌ Invalid selection. Please try again.');
        await menu.waitForEnter();
        return;
      }
      
      // Get comment to remove
      const commentToRemove = comments[index];
      
      // Remove comment from array
      comments.splice(index, 1);
      
      // Save updated comments list
      await fs.writeJson(this.commentsPath, comments, { spaces: 2 });
      
      console.log('\n✅ Comment removed successfully!');
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
  
  /**
   * Test comment display
   */
  async testComment() {
    try {
      console.log('\n➡️ Test random comment selection');
      
      // Check if comments file exists
      if (!await fs.pathExists(this.commentsPath)) {
        console.log('\n❌ No comments found! Add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      // Load comments from file
      const comments = await fs.readJson(this.commentsPath);
      
      if (comments.length === 0) {
        console.log('\n❌ No comments found! Add some comments first.');
        await menu.waitForEnter();
        return;
      }
      
      // Get a random comment
      const randomIndex = Math.floor(Math.random() * comments.length);
      const randomComment = comments[randomIndex];
      
      // Display the comment
      console.log('\n==== Random Comment Preview ====\n');
      console.log(`Comment #${randomIndex + 1}: ${randomComment}`);
      
      await menu.waitForEnter();
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      await menu.waitForEnter();
    }
  }
}

module.exports = new CommentsMenuHandler();

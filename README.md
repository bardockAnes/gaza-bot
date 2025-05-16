# YouTube Automation System

A professional, modular YouTube automation system that uses real browser cookies for authentication to avoid detection.

## Features

- **Authentication** - Uses Brave browser cookies to maintain YouTube login sessions
- **Search** - Search for videos with precise filtering options
- **Video Interaction** - Watch, like, comment on videos with human-like behavior
- **Channel Management** - Subscribe to channels and browse content
- **Interactive CLI** - User-friendly command-line interface for control
- **Anti-Detection** - Multiple layers of protection against automation detection

## Requirements

- Node.js 14+
- Brave Browser (or any Chromium-based browser for cookie export)
- YouTube account

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following content:

```
YOUTUBE_URL=https://www.youtube.com
```

## First-Time Setup

1. **Export YouTube cookies from Brave browser**:
   - Install "Cookie-Editor" extension in Brave
   - Log in to YouTube
   - Click the Cookie-Editor extension icon
   - Click "Export" (This will copy cookies to clipboard)
   - Create a file called `brave-cookies.json` in the project root
   - Paste the copied cookies into this file

2. **Start the application**:

```bash
node index.js
```

## Usage

The application provides an interactive CLI with the following main sections:

### Main Menu

- **Start Browser & Login** - Initialize browser and authenticate with YouTube
- **Search Videos** - Search for videos based on keywords
- **Video Actions** - Interact with the current video
- **Channel Actions** - Manage channel subscriptions and browsing
- **Advanced Settings** - Configure the application

### Video Actions

- Watch videos (with customizable duration)
- Like videos
- Subscribe to channels
- Add comments
- Get video information

### Search Actions

- Search for videos by keyword
- View and filter search results
- Open videos from search results

## Project Structure

```
/bot-1/
├── index.js        # Main entry point
├── config.js       # Configuration settings
├── browser.js      # Browser setup and management
├── cli.js          # Command-line interface
├── actions/        # Automation actions
│   ├── search.js   # Search functionality
│   └── video.js    # Video interactions
├── utils/          # Helper utilities
│   └── helpers.js  # Common helper functions
├── brave-cookies.json # Your exported cookies
└── README.md       # This documentation
```

## How It Works

This system uses a combination of techniques to provide reliable YouTube automation:

1. **Cookie-Based Authentication** - Instead of automating the login process (which is heavily monitored by Google), we use pre-authenticated cookies from your real browser session

2. **Anti-Detection Measures** - Multiple techniques prevent detection:
   - Stealth plugin to hide Puppeteer flags
   - WebDriver property overriding
   - Human-like behavior patterns
   - Random delays between actions

3. **Modular Architecture** - Each component is isolated for maintainability:
   - Browser management module handles all Puppeteer interactions
   - Action modules contain specific YouTube interactions
   - CLI provides user interface
   - Config centralizes all settings

## Customization

You can customize various settings in the `config.js` file:

- Browser settings (headless mode, viewport, etc.)
- Timing configurations (delays, timeouts)
- File paths
- URLs

## Troubleshooting

### Authentication Issues

If you're having trouble with authentication:

1. Make sure your Brave cookies are properly exported and saved to `brave-cookies.json`
2. Check that cookies aren't expired (re-export if necessary)
3. Try clearing the `chrome-data` directory and starting fresh

### Browser Crashes

If the browser crashes:

1. Make sure you have sufficient system resources
2. Try disabling extensions in the browser
3. Update Puppeteer to the latest version

## Important Notes

- **Use Responsibly**: This tool should be used in accordance with YouTube's Terms of Service
- **Cookie Refresh**: You'll need to refresh your Brave cookies periodically (every few weeks to months)
- **Rate Limiting**: Avoid performing too many actions too quickly to prevent account flags

## License

This project is provided for educational purposes only.

---

Created by Cascade, 2025

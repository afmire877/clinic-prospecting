# llms.txt Page Copier Chrome Extension

A Chrome extension that copies the current page content in the official [llmstxt.org](https://llmstxt.org) format standard.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. The extension should now appear in your extensions toolbar

## Usage

1. Navigate to any webpage
2. Click the extension icon in the toolbar
3. Click "Copy Page as llms.txt" 
4. The page content will be copied to your clipboard in llmstxt.org format
5. The extension will display the estimated token count of the copied content

## Features

- Follows the official llmstxt.org format specification
- Extracts page summary from meta descriptions or first paragraph
- Includes page title as H1 header with optional blockquote summary
- Filters out navigation, ads, and footer elements
- Extracts and lists relevant links in proper format
- Converts HTML to clean markdown with proper heading hierarchy
- **Token counting**: Displays estimated token count after copying
- Simple one-click operation

## File Structure

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface
- `popup.js` - Main logic for content extraction and markdown conversion
- `content.js` - Content script (minimal for this extension)

## Customization

You can modify the content extraction logic in `popup.js` to better suit your needs:
- Adjust HTML to markdown conversion rules
- Change content filtering (remove different elements)
- Modify the output format
- Add additional metadata
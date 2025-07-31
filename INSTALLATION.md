# LLM Markdown Copier Chrome Extension

A Chrome extension that copies the current page content as LLM-optimized markdown, similar to an LLMs.txt file format.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. The extension should now appear in your extensions toolbar

## Usage

1. Navigate to any webpage
2. Click the extension icon in the toolbar
3. Click "Copy Page as LLM Markdown" 
4. The page content will be copied to your clipboard as optimized markdown

## Features

- Extracts main content while filtering out navigation, ads, and footers
- Converts HTML to clean markdown format
- Includes page title and URL
- Optimized for LLM consumption
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
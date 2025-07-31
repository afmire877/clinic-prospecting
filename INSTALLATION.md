# llms.txt Page Copier Chrome Extension

A Chrome extension that copies the current page content in the official [llmstxt.org](https://llmstxt.org) format standard, with optional AI enhancement for cleaner results.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. The extension should now appear in your extensions toolbar

## Usage

### Basic Usage
1. Navigate to any webpage
2. Click the extension icon in the toolbar
3. Click "Copy Page as llms.txt" 
4. The page content will be copied to your clipboard in llmstxt.org format
5. The extension will display the estimated token count of the copied content

### AI Enhancement (Optional)
1. Click "AI Enhancement" in the extension popup to expand settings
2. Enter your OpenAI API key (starts with `sk-`)
3. Click "Save Settings"
4. Now when you copy pages, AI will automatically:
   - Remove advertisements and promotional content
   - Clean up formatting issues
   - Remove navigation and footer elements
   - Improve markdown structure
   - Filter out irrelevant information

**Note**: AI enhancement costs approximately $0.01-0.05 per page through OpenAI's API.

## Features

- **llmstxt.org Compliance**: Follows the official format specification
- **Smart Content Extraction**: Extracts page summary from meta descriptions or first paragraph
- **Structured Format**: Includes page title as H1 header with optional blockquote summary
- **Content Filtering**: Filters out navigation, ads, and footer elements automatically
- **Link Extraction**: Extracts and lists relevant links in proper format
- **Markdown Conversion**: Converts HTML to clean markdown with proper heading hierarchy
- **Token Counting**: Displays estimated token count after copying
- **AI Enhancement** (Optional): Uses OpenAI GPT-4o-mini to clean and improve content
- **Graceful Fallback**: If AI enhancement fails, uses the original extraction method
- **Secure Storage**: API keys are stored securely in Chrome's sync storage
- **Simple Interface**: One-click operation with collapsible settings

## File Structure

- `manifest.json` - Extension configuration with permissions for storage and OpenAI API
- `popup.html` - Extension popup interface with settings panel
- `popup.js` - Main logic for content extraction, OpenAI integration, and markdown conversion
- `content.js` - Content script (minimal for this extension)

## Security & Privacy

- **API Key Storage**: OpenAI API keys are stored securely using Chrome's `storage.sync` API
- **Local Processing**: Basic content extraction happens locally in your browser
- **Optional AI**: OpenAI enhancement is completely optional and only activated when you provide an API key
- **No Data Collection**: The extension doesn't collect or transmit any personal data beyond what's needed for OpenAI API calls

## Cost Considerations

- **Basic Mode**: Free - all processing happens locally
- **AI Enhancement**: Costs apply through your OpenAI account
  - Uses GPT-4o-mini model (most cost-effective)
  - Estimated cost: $0.01-0.05 per page depending on content length
  - You have full control over when AI enhancement is used

## Customization

You can modify the content extraction logic in `popup.js` to better suit your needs:
- Adjust HTML to markdown conversion rules
- Change content filtering (remove different elements)
- Modify the output format
- Customize the OpenAI prompt for different cleanup behavior
- Add additional metadata
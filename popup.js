document.addEventListener('DOMContentLoaded', function() {
  const copyButton = document.getElementById('copyMarkdown');
  const status = document.getElementById('status');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsContent = document.getElementById('settingsContent');
  const openaiKeyInput = document.getElementById('openaiKey');
  const saveSettingsButton = document.getElementById('saveSettings');

  // Load saved settings
  loadSettings();

  // Settings toggle functionality
  settingsToggle.addEventListener('click', function() {
    const isExpanded = settingsContent.classList.contains('expanded');
    if (isExpanded) {
      settingsContent.classList.remove('expanded');
      settingsToggle.classList.remove('expanded');
    } else {
      settingsContent.classList.add('expanded');
      settingsToggle.classList.add('expanded');
    }
  });

  // Save settings
  saveSettingsButton.addEventListener('click', async function() {
    const apiKey = openaiKeyInput.value.trim();
    await chrome.storage.sync.set({ openaiApiKey: apiKey });
    
    status.textContent = apiKey ? 'Settings saved! AI enhancement enabled.' : 'Settings saved! AI enhancement disabled.';
    status.className = 'status success';
    
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });

  // Main copy functionality
  copyButton.addEventListener('click', async function() {
    try {
      status.textContent = 'Processing...';
      status.className = 'status';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const { openaiApiKey } = await chrome.storage.sync.get(['openaiApiKey']);
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageContent
      });
      
      if (results && results[0] && results[0].result) {
        let { content: markdown, tokenCount } = results[0].result;
        
        // If OpenAI API key is available, enhance the content
        if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
          status.textContent = 'Enhancing with AI...';
          try {
            const enhanced = await enhanceWithOpenAI(markdown, openaiApiKey);
            markdown = enhanced.content;
            tokenCount = enhanced.tokenCount;
            
            await navigator.clipboard.writeText(markdown);
            status.textContent = `Copied! (~${tokenCount.toLocaleString()} tokens) - AI Enhanced`;
            status.className = 'status success';
          } catch (aiError) {
            console.warn('AI enhancement failed, using original:', aiError);
            await navigator.clipboard.writeText(markdown);
            status.textContent = `Copied! (~${tokenCount.toLocaleString()} tokens) - AI failed, used original`;
            status.className = 'status success';
          }
        } else {
          await navigator.clipboard.writeText(markdown);
          status.textContent = `Copied! (~${tokenCount.toLocaleString()} tokens)`;
          status.className = 'status success';
        }
        
        setTimeout(() => {
          status.textContent = '';
        }, 3000);
      } else {
        throw new Error('Failed to extract content');
      }
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error copying content';
      status.className = 'status error';
    }
  });

  async function loadSettings() {
    const { openaiApiKey } = await chrome.storage.sync.get(['openaiApiKey']);
    if (openaiApiKey) {
      openaiKeyInput.value = openaiApiKey;
    }
  }

  async function enhanceWithOpenAI(content, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a content cleanup specialist. Clean up the provided llms.txt format content by:
1. Removing advertisements, promotional content, and irrelevant information
2. Improving markdown formatting and structure
3. Fixing any formatting issues or broken elements
4. Keeping all essential information and maintaining the llms.txt format
5. Ensuring proper heading hierarchy
6. Remove navigation elements, cookie notices, and footer content

Return only the cleaned content in proper llms.txt format. Do not add explanations or comments.`
          },
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedContent = data.choices[0].message.content.trim();
    
    // Recalculate token count for enhanced content
    const tokenCount = estimateTokenCount(enhancedContent);
    
    return {
      content: enhancedContent,
      tokenCount: tokenCount
    };
  }

  function estimateTokenCount(text) {
    const avgCharsPerToken = 4;
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const charCount = cleanText.length;
    return Math.ceil(charCount / avgCharsPerToken);
  }
});

function extractPageContent() {
  function estimateTokenCount(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is an approximation and may vary based on the actual tokenizer used
    const avgCharsPerToken = 4;
    
    // Count characters, excluding excessive whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const charCount = cleanText.length;
    
    // Basic token estimation
    const estimatedTokens = Math.ceil(charCount / avgCharsPerToken);
    
    return estimatedTokens;
  }

  function extractPageSummary() {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      return metaDescription.getAttribute('content');
    }
    
    const metaProperty = document.querySelector('meta[property="og:description"]');
    if (metaProperty) {
      return metaProperty.getAttribute('content');
    }
    
    const firstParagraph = document.querySelector('p');
    if (firstParagraph && firstParagraph.textContent.length > 50) {
      return firstParagraph.textContent.substring(0, 200).trim() + '...';
    }
    
    return null;
  }

  function extractLinks() {
    const links = [];
    const linkElements = document.querySelectorAll('a[href]');
    const seenUrls = new Set();
    
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      
      if (href && text && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
        let fullUrl;
        try {
          fullUrl = new URL(href, window.location.href).href;
        } catch (e) {
          return;
        }
        
        if (!seenUrls.has(fullUrl) && text.length > 3 && text.length < 100) {
          seenUrls.add(fullUrl);
          links.push({ text, url: fullUrl });
        }
      }
    });
    
    return links.slice(0, 10);
  }

  function htmlToMarkdown(html) {
    let markdown = html;
    
    markdown = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    markdown = markdown.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    markdown = markdown.replace(/<!--[\s\S]*?-->/g, '');
    
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '###### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
    
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)');
    markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');
    
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
    markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n');
    
    markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, function(match, content) {
      return content.split('\n').map(line => '> ' + line.trim()).join('\n') + '\n\n';
    });
    
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, function(match, content) {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, function() {
        return counter++ + '. ' + arguments[1] + '\n';
      }) + '\n';
    });
    
    markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, function(match, content) {
      let table = '';
      const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      if (rows) {
        rows.forEach((row, index) => {
          const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
          if (cells) {
            const cellContent = cells.map(cell => 
              cell.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, '$1').trim()
            ).join(' | ');
            table += '| ' + cellContent + ' |\n';
            if (index === 0) {
              table += '|' + cells.map(() => ' --- ').join('|') + '|\n';
            }
          }
        });
      }
      return table + '\n';
    });
    
    markdown = markdown.replace(/<br\s*\/?>/gi, '  \n');
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
    
    markdown = markdown.replace(/<[^>]+>/g, '');
    
    markdown = markdown.replace(/&nbsp;/g, ' ');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#39;/g, "'");
    
    markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
    markdown = markdown.replace(/^\s+|\s+$/g, '');
    
    return markdown;
  }

  const title = document.title;
  const url = window.location.href;
  const summary = extractPageSummary();
  const links = extractLinks();
  
  const mainContent = document.querySelector('main') || 
                     document.querySelector('article') || 
                     document.querySelector('.content') || 
                     document.querySelector('#content') || 
                     document.body.cloneNode(true);
  
  const navElements = mainContent.querySelectorAll('nav, .nav, .navigation, .sidebar, .menu');
  navElements.forEach(el => el.remove());
  
  const footerElements = mainContent.querySelectorAll('footer, .footer');
  footerElements.forEach(el => el.remove());
  
  const adElements = mainContent.querySelectorAll('.ad, .ads, .advertisement, [class*="ad-"], [id*="ad-"]');
  adElements.forEach(el => el.remove());
  
  const html = mainContent.innerHTML;
  const content = htmlToMarkdown(html);
  
  let llmsTxtFormat = `# ${title}\n\n`;
  
  if (summary) {
    llmsTxtFormat += `> ${summary}\n\n`;
  }
  
  llmsTxtFormat += `Source: ${url}\n\n`;
  
  if (content.trim()) {
    llmsTxtFormat += `${content}\n\n`;
  }
  
  if (links.length > 0) {
    llmsTxtFormat += `## Related Links\n\n`;
    links.forEach(link => {
      llmsTxtFormat += `- [${link.text}](${link.url})\n`;
    });
    llmsTxtFormat += '\n';
  }
  
  const finalContent = llmsTxtFormat.trim();
  const tokenCount = estimateTokenCount(finalContent);
  
  return {
    content: finalContent,
    tokenCount: tokenCount
  };
}
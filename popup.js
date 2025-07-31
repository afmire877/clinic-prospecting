document.addEventListener('DOMContentLoaded', function() {
  const copyButton = document.getElementById('copyMarkdown');
  const status = document.getElementById('status');

  copyButton.addEventListener('click', async function() {
    try {
      status.textContent = 'Processing...';
      status.className = 'status';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageContent
      });
      
      if (results && results[0] && results[0].result) {
        const markdown = results[0].result;
        await navigator.clipboard.writeText(markdown);
        status.textContent = 'Copied to clipboard!';
        status.className = 'status success';
        
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
      } else {
        throw new Error('Failed to extract content');
      }
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error copying content';
      status.className = 'status error';
    }
  });
});

function extractPageContent() {
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
  
  return llmsTxtFormat.trim();
}
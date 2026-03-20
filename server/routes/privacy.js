const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) => {
  const privacyPath = path.join(__dirname, '../PRIVACY_POLICY.md');
  
  try {
    const content = fs.readFileSync(privacyPath, 'utf8');
    const lines = content.split('\n');
    let htmlContent = '';
    let inList = false;
    let inListItem = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      if (line.startsWith('# ')) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<h1>${escapeHtml(line.slice(2))}</h1>\n`;
      } else if (line.startsWith('## ')) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<h2>${escapeHtml(line.slice(3))}</h2>\n`;
      } else if (line.startsWith('### ')) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<h3 style="margin-top:20px;font-size:1.1em">${escapeHtml(line.slice(4))}</h3>\n`;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { htmlContent += '<ul>'; inList = true; }
        htmlContent += `<li>${escapeHtml(line.slice(2))}</li>\n`;
      } else if (line.match(/^\d+\.\s/)) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<p style="margin-left:20px">${escapeHtml(line.replace(/^\d+\.\s/, ''))}</p>\n`;
      } else if (line.trim() === '---') {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += '<hr style="margin:30px 0;border:none;border-top:1px solid #eee">\n';
      } else if (line.trim() !== '') {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<p>${escapeHtml(line)}</p>\n`;
      }
    }
    
    if (inList) htmlContent += '</ul>';
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - IAA Learn</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a2e;
      margin-bottom: 10px;
      font-size: 2em;
    }
    h2 {
      color: #1a1a2e;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.4em;
    }
    p { margin-bottom: 15px; }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; }
    a { color: #4a90d9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .updated {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #888;
      font-size: 0.9em;
    }
    @media (max-width: 600px) {
      .container { padding: 20px; }
      h1 { font-size: 1.5em; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
    <p class="updated">Last Updated: March 2026</p>
    <p style="margin-top:20px">
      <a href="https://mightyskytech.com">Mighty Sky Tech</a> | 
      <a href="mailto:support@mightyskytech.com">Contact Us</a>
    </p>
  </div>
</body>
</html>`;
    
    res.type('html').send(html);
  } catch (error) {
    console.error('Error serving privacy policy:', error);
    res.status(500).send('Privacy policy not available: ' + error.message);
  }
});

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = router;

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <meta name="theme-color" content="#ffffff">
  <title>Privacy Policy - IAA Learn</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      min-height: 100vh;
      background: #ffffff !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: #ffffff !important;
      padding: 20px;
      -webkit-text-size-adjust: 100%;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 8px;
    }
    h1 {
      color: #1a1a2e;
      margin-bottom: 20px;
      font-size: 1.8em;
      font-weight: 700;
    }
    h2 {
      color: #1a1a2e;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.3em;
      font-weight: 600;
    }
    p { 
      margin-bottom: 15px; 
      color: #333333;
    }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; color: #333333; }
    strong { color: #1a1a2e; font-weight: 600; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .updated {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666666;
      font-size: 0.9em;
    }
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 30px 0;
    }
    @media (max-width: 600px) {
      body { padding: 10px; }
      .container { padding: 20px; }
      h1 { font-size: 1.5em; }
      h2 { font-size: 1.2em; }
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
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return text;
}

module.exports = router;

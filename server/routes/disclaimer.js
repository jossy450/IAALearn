const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disclaimer - IAA Learn</title>
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
    <h1>Disclaimer</h1>
    <p><strong>Last Updated:</strong> March 2026</p>
    
    <h2>1. Educational Purpose Only</h2>
    <p>IAA Learn (Interview Answer Assistant) is designed as an educational and practice tool to help users prepare for job interviews. The content, questions, suggestions, and feedback provided through this service are intended solely for:</p>
    <ul>
      <li>Interview preparation and practice</li>
      <li>Skill development and improvement</li>
      <li>Educational purposes</li>
    </ul>
    
    <h2>2. No Guarantees</h2>
    <p>While we strive to provide helpful and accurate guidance, IAA Learn makes no guarantees about:</p>
    <ul>
      <li>The accuracy, completeness, or reliability of any information provided</li>
      <li>The effectiveness of any interview techniques or suggestions</li>
      <li>The outcome of any actual job interview</li>
      <li>Employment or job placement results</li>
    </ul>
    
    <h2>3. Not Professional Advice</h2>
    <p>The service does not provide:</p>
    <ul>
      <li>Legal, medical, or financial advice</li>
      <li>Career counseling or professional employment consulting</li>
      <li>Job placement services</li>
      <li>Professional certification or credentials</li>
    </ul>
    
    <h2>4. User Responsibility</h2>
    <p>Users are solely responsible for:</p>
    <ul>
      <li>Reviewing and validating all information before use</li>
      <li>Making their own decisions regarding job applications and interviews</li>
      <li>Their conduct during actual job interviews</li>
      <li>Ensuring their responses are appropriate and truthful</li>
    </ul>
    
    <h2>5. Third-Party Content</h2>
    <p>Our service may include links to third-party websites or content. We are not responsible for the content, accuracy, or opinions expressed on such websites.</p>
    
    <h2>6. Limitation of Liability</h2>
    <p>Mighty Sky Tech and IAA Learn shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from:</p>
    <ul>
      <li>Use of or inability to use the service</li>
      <li>Any content obtained through the service</li>
      <li>Unauthorized access to your data</li>
      <li>Technical failures or errors</li>
    </ul>
    
    <h2>7. Changes to Service</h2>
    <p>We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.</p>
    
    <h2>8. Contact</h2>
    <p>For questions about this disclaimer, please contact us at <a href="mailto:support@mightyskytech.com">support@mightyskytech.com</a></p>
    
    <p class="updated">Last Updated: March 2026</p>
    <p style="margin-top:20px">
      <a href="https://mightyskytech.com">Mighty Sky Tech</a> | 
      <a href="https://iaalearn-1.fly.dev/api/privacy">Privacy Policy</a>
    </p>
  </div>
</body>
</html>`;
    
    res.type('html').send(html);
});

module.exports = router;

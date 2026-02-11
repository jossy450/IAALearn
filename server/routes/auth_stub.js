const express = require('express');
const router = express.Router();

// Minimal stubbed auth routes for demo/dev startup
router.get('/me', (req, res) => {
  res.json({ success: true, user: { id: 'demo', email: 'demo@example.com', full_name: 'Demo User' } });
});

router.post('/login', (req, res) => {
  res.json({ success: true, token: 'demo-token', user: { id: 'demo', email: 'demo@example.com' } });
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Checks Supabase authorize endpoint reachability for provider (google by default)
router.get('/supabase-authorize', async (req, res) => {
  try {
    const supabaseBase = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
    if (!supabaseBase) {
      return res.status(400).json({ ok: false, error: 'No SUPABASE_URL or VITE_SUPABASE_URL configured' });
    }

    const provider = req.query.provider || 'google';
    const clientRedirect = req.query.redirect_to || (req.get('origin') || `${req.protocol}://${req.get('host')}`) + '/oauth-callback';

    const url = new URL(`/auth/v1/authorize`, supabaseBase).toString();
    const checkUrl = `${url}?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(clientRedirect)}`;

    // Use fetch (Node 18+) to check reachability without following redirects
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(checkUrl, { method: 'HEAD', signal: controller.signal, redirect: 'manual' });
    clearTimeout(timeout);

    res.json({ ok: true, provider, status: resp.status, url: checkUrl });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

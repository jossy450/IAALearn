const express = require('express');
const crypto = require('crypto');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const referralRouter = express.Router();

const generateReferralCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

referralRouter.get('/code', authenticate, async (req, res) => {
  try {
    let user = await query('SELECT referral_code FROM users WHERE id = $1', [req.user.id]);
    
    if (!user.rows[0]?.referral_code) {
      const referralCode = generateReferralCode();
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [referralCode, req.user.id]);
      user.rows[0].referral_code = referralCode;
    }
    
    const referralUrl = `https://iaalearn-1.fly.dev/register?ref=${user.rows[0].referral_code}`;
    
    res.json({ 
      referralCode: user.rows[0].referral_code,
      referralUrl
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

referralRouter.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COALESCE(referral_count, 0) as total_referrals,
        (SELECT COUNT(*) FROM users WHERE referred_by = $1) as signed_up_referrals
      FROM users 
      WHERE id = $1
    `, [req.user.id]);
    
    res.json(stats.rows[0] || { total_referrals: 0, signed_up_referrals: 0 });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

referralRouter.get('/history', authenticate, async (req, res) => {
  try {
    const history = await query(`
      SELECT 
        id,
        email,
        full_name,
        created_at
      FROM users 
      WHERE referred_by = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    res.json(history.rows);
  } catch (error) {
    console.error('Error getting referral history:', error);
    res.status(500).json({ error: 'Failed to get referral history' });
  }
});

module.exports = referralRouter;

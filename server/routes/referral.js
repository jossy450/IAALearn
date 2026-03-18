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
    
    if (!user.rows[0].referral_code) {
      const referralCode = generateReferralCode();
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [referralCode, req.user.id]);
      user.rows[0].referral_code = referralCode;
    }
    
    res.json({ 
      referralCode: user.rows[0].referral_code,
      referralUrl: `https://iaalearn.app/register?ref=${user.rows[0].referral_code}`
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
        u.referral_count,
        COUNT(r.id) as total_referrals,
        COUNT(r.id) FILTER (WHERE r.is_claimed = true) as claimed_referrals
      FROM users u
      LEFT JOIN referral_rewards r ON r.referrer_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.referral_count
    `, [req.user.id]);
    
    res.json(stats.rows[0] || { referral_count: 0, total_referrals: 0, claimed_referrals: 0 });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

referralRouter.get('/history', authenticate, async (req, res) => {
  try {
    const history = await query(`
      SELECT 
        r.id,
        r.referral_code,
        r.reward_type,
        r.reward_value,
        r.is_claimed,
        r.created_at,
        r.claimed_at,
        u.email as referred_email,
        u.full_name as referred_name
      FROM referral_rewards r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    res.json(history.rows);
  } catch (error) {
    console.error('Error getting referral history:', error);
    res.status(500).json({ error: 'Failed to get referral history' });
  }
});

referralRouter.post('/claim', authenticate, async (req, res) => {
  try {
    const { referralId } = req.body;
    
    const result = await query(`
      UPDATE referral_rewards 
      SET is_claimed = true, claimed_at = NOW()
      WHERE id = $1 AND referrer_id = $2 AND is_claimed = false
      RETURNING *
    `, [referralId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid referral or already claimed' });
    }
    
    await query(`
      UPDATE users SET referral_count = referral_count + 1 WHERE id = $1
    `, [req.user.id]);
    
    res.json({ success: true, reward: result.rows[0] });
  } catch (error) {
    console.error('Error claiming referral:', error);
    res.status(500).json({ error: 'Failed to claim referral reward' });
  }
});

module.exports = referralRouter;

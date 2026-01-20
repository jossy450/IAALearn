const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get cache statistics
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(quality_score) as avg_quality,
        COUNT(CASE WHEN hit_count > 0 THEN 1 END) as used_entries,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries
      FROM answer_cache
    `);

    const topQuestions = await query(`
      SELECT question_text, hit_count, category, last_used_at
      FROM answer_cache
      ORDER BY hit_count DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      topQuestions: topQuestions.rows
    });
  } catch (error) {
    next(error);
  }
});

// Clear expired cache entries
router.post('/clear-expired', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM answer_cache WHERE expires_at < NOW() RETURNING id'
    );

    res.json({
      success: true,
      cleared: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Manually clear all cache
router.post('/clear-all', authenticate, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM answer_cache RETURNING id');

    res.json({
      success: true,
      cleared: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get cache performance over time
router.get('/performance', authenticate, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const performance = await query(`
      SELECT * FROM cache_performance
      WHERE date >= NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY date DESC
    `);

    res.json({
      performance: performance.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

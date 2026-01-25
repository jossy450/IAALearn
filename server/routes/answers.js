const express = require('express');
const answerService = require('../services/answers');
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');

const router = express.Router();

// Generate answer for a question
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { question, sessionId, research, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Generate answer
    const result = await answerService.generateAnswer(question, {
      research,
      context,
      userId: req.user.id
    });

    // Save question if sessionId provided
    if (sessionId) {
      await query(
        `INSERT INTO questions (session_id, question_text, response_time_ms)
         VALUES ($1, $2, $3)`,
        [sessionId, question, result.responseTime]
      );

      // Update session question count
      await query(
        `UPDATE interview_sessions 
         SET total_questions = total_questions + 1 
         WHERE id = $1`,
        [sessionId]
      );
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Pre-generate answers for common questions
router.post('/pre-generate', authenticate, async (req, res, next) => {
  try {
    const { context } = req.body;
    const userId = req.user.id;

    const results = await answerService.preGenerateAnswers(userId, context);

    res.json({
      success: true,
      generated: results.filter(r => r.generated).length,
      total: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
});

// Get pre-generated answers for user
router.get('/pre-generated', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM pre_generated_answers 
       WHERE user_id = $1 AND is_active = true 
       ORDER BY usage_count DESC, created_at DESC`,
      [userId]
    );

    res.json({
      answers: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Search similar questions in cache
router.post('/search', authenticate, async (req, res, next) => {
  try {
    const { query: searchQuery, limit = 10 } = req.body;

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await query(
      `SELECT * FROM answer_cache 
       WHERE question_text ILIKE $1 
       OR $2 = ANY(keywords)
       ORDER BY hit_count DESC, quality_score DESC 
       LIMIT $3`,
      [`%${searchQuery}%`, searchQuery, limit]
    );

    res.json({
      results: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

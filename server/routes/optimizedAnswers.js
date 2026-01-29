const express = require('express');
const optimizedAnswerService = require('../services/optimizedAnswers');
const { getAIProvider } = require('../services/aiProvider');
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');

const router = express.Router();

// Generate answer for a question with streaming support (GET for EventSource)
router.get('/generate', authenticate, async (req, res, next) => {
  try {
    const { question, sessionId, research, stream } = req.query;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const startTime = Date.now();
    const useStream = stream === undefined || stream === 'true' || stream === '1' || stream === true;
    const useResearch = research === 'true' || research === '1' || research === true;

    if (useStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullAnswer = '';

      const streamCallback = (chunk, isComplete) => {
        if (isComplete) {
          res.write(`data: ${JSON.stringify({
            type: 'complete',
            totalTime: Date.now() - startTime,
            cached: false
          })}\n\n`);
          res.end();
        } else {
          fullAnswer += chunk;
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk
          })}\n\n`);
        }
      };

      await optimizedAnswerService.generateAnswer(question, {
        research: useResearch,
        context: undefined,
        userId: req.user.id,
        streamCallback,
        forcePrimary: true  // ✅ Always use Grok as primary
      });

      if (sessionId) {
        await query(
          `INSERT INTO questions (session_id, question_text, answer, response_time_ms)
           VALUES ($1, $2, $3, $4)`
          , [sessionId, question, fullAnswer, Date.now() - startTime]
        );
      }

      return;
    }

    const result = await optimizedAnswerService.generateAnswer(question, {
      research: useResearch,
      context: undefined,
      userId: req.user.id,
      forcePrimary: true  // ✅ Always use Grok as primary
    });

    if (sessionId) {
      await query(
        `INSERT INTO questions (session_id, question_text, answer, response_time_ms)
         VALUES ($1, $2, $3, $4)`
        , [sessionId, question, result.answer, result.responseTime]
      );

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

// Generate answer for a question with streaming support
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { question, sessionId, research, context, stream } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const startTime = Date.now();

    // Handle streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullAnswer = '';
      
      const streamCallback = (chunk, isComplete) => {
        if (isComplete) {
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            totalTime: Date.now() - startTime,
            cached: false
          })}\n\n`);
          res.end();
        } else {
          fullAnswer += chunk;
          res.write(`data: ${JSON.stringify({ 
            type: 'chunk', 
            content: chunk 
          })}\n\n`);
        }
      };

      // Generate answer with streaming
      const result = await optimizedAnswerService.generateAnswer(question, {
        research,
        context,
        userId: req.user.id,
        streamCallback
      });

      // Save question if sessionId provided
      if (sessionId) {
        await query(
          `INSERT INTO questions (session_id, question_text, answer, response_time_ms)
           VALUES ($1, $2, $3, $4)`,
          [sessionId, question, fullAnswer, Date.now() - startTime]
        );
      }

      return; // Response already sent via streaming
    }

    // Non-streaming response
    const result = await optimizedAnswerService.generateAnswer(question, {
      research,
      context,
      userId: req.user.id
    });

    // Save question if sessionId provided
    if (sessionId) {
      const questionResult = await query(
        `INSERT INTO questions (session_id, question_text, answer, response_time_ms)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [sessionId, question, result.answer, result.responseTime]
      );

      // Log performance metrics
      if (questionResult.rows[0]) {
        await query(
          `SELECT log_response_performance($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            sessionId,
            questionResult.rows[0].id,
            req.user.id,
            0, // transcription time (if applicable)
            result.performance?.cacheTime || 0,
            result.performance?.aiTime || 0,
            result.cached || false,
            result.source || 'fast'
          ]
        ).catch(err => console.warn('Performance logging failed:', err));
      }

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

// Warm up cache with common questions
router.post('/warmup', authenticate, async (req, res, next) => {
  try {
    const { context } = req.body;

    const results = await optimizedAnswerService.warmUpCache(context);

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    next(error);
  }
});

// Get cache statistics
router.get('/cache-stats', authenticate, async (req, res, next) => {
  try {
    const memoryStats = optimizedAnswerService.getCacheStats();
    
    // Get database cache stats
    const dbStats = await query(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(hit_count) as total_hits,
        AVG(quality_score) as avg_quality,
        COUNT(CASE WHEN hit_count > 0 THEN 1 END) as used_entries,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries
      FROM answer_cache
    `);

    res.json({
      memory: memoryStats,
      database: dbStats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Clear cache
router.post('/clear-cache', authenticate, async (req, res, next) => {
  try {
    // Only allow admin to clear cache
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const cleared = optimizedAnswerService.clearCache();

    res.json({
      success: true,
      cleared,
      message: 'Memory cache cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get performance metrics
router.get('/performance', authenticate, async (req, res, next) => {
  try {
    const { sessionId, limit = 50 } = req.query;

    let performanceQuery = `
      SELECT 
        rp.*,
        q.question_text,
        q.answer
      FROM response_performance rp
      LEFT JOIN questions q ON rp.question_id = q.id
      WHERE rp.user_id = $1
    `;

    const params = [req.user.id];

    if (sessionId) {
      performanceQuery += ` AND rp.session_id = $2`;
      params.push(sessionId);
    }

    performanceQuery += ` ORDER BY rp.recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(performanceQuery, params);

    // Calculate aggregates
    const metrics = result.rows.reduce((acc, row) => {
      acc.total++;
      acc.totalTime += row.total_response_time_ms;
      if (row.was_cached) acc.cached++;
      if (row.was_streamed) acc.streamed++;
      if (row.total_response_time_ms < 1000) acc.fast++;
      if (row.total_response_time_ms > 3000) acc.slow++;
      return acc;
    }, {
      total: 0,
      totalTime: 0,
      cached: 0,
      streamed: 0,
      fast: 0,
      slow: 0
    });

    res.json({
      metrics: {
        ...metrics,
        avgTime: metrics.total > 0 ? Math.round(metrics.totalTime / metrics.total) : 0,
        cacheRate: metrics.total > 0 ? ((metrics.cached / metrics.total) * 100).toFixed(1) + '%' : '0%',
        fastRate: metrics.total > 0 ? ((metrics.fast / metrics.total) * 100).toFixed(1) + '%' : '0%'
      },
      recentResponses: result.rows
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

// Get pre-generated answers
router.get('/pregenerated', authenticate, async (req, res, next) => {
  try {
    const { category, positionType, limit = 20 } = req.query;

    let queryStr = `
      SELECT * FROM pregenerated_answers 
      WHERE is_active = true
    `;
    const params = [];

    if (category) {
      params.push(category);
      queryStr += ` AND question_category = $${params.length}`;
    }

    if (positionType) {
      params.push(positionType);
      queryStr += ` AND position_type = $${params.length}`;
    }

    params.push(limit);
    queryStr += ` ORDER BY quality_score DESC, usage_count DESC LIMIT $${params.length}`;

    const result = await query(queryStr, params);

    res.json({
      answers: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get AI provider status
router.get('/providers', authenticate, async (req, res, next) => {
  try {
    const aiProvider = getAIProvider();
    const status = aiProvider.getStatus();

    res.json({
      ...status,
      message: status.total === 0 
        ? 'No AI providers configured. Please set API keys.' 
        : `${status.total} provider(s) available (${status.free} free, ${status.paid} paid)`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

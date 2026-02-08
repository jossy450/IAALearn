const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// In-memory sessions for demo mode
const demoSessions = new Map();
const isDemoMode = process.env.DEMO_MODE === 'true';

// Create new interview session
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, companyName, position, sessionType, metadata, aiInstructions } = req.body;
    const userId = req.user.id;

    // Merge aiInstructions into metadata
    const sessionMetadata = {
      ...(metadata || {}),
      aiInstructions: aiInstructions || null
    };

    if (isDemoMode) {
      // Demo mode - in-memory storage
      const session = {
        id: `demo-session-${Date.now()}`,
        user_id: userId,
        title: title || 'Untitled Session',
        company_name: companyName,
        position: position,
        session_type: sessionType || 'general',
        metadata: sessionMetadata,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      demoSessions.set(session.id, session);
      
      return res.status(201).json({
        success: true,
        session
      });
    }

    const result = await query(
      `INSERT INTO interview_sessions 
       (user_id, title, company_name, position, session_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, companyName, position, sessionType || 'general', JSON.stringify(sessionMetadata)]
    );

    res.status(201).json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get all sessions for user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, status } = req.query;

    if (isDemoMode) {
      // Demo mode - filter from in-memory storage
      let sessions = Array.from(demoSessions.values())
        .filter(s => s.user_id === userId);
      
      if (status) {
        sessions = sessions.filter(s => s.status === status);
      }
      
      // Sort by created_at descending
      sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Add question_count (0 for demo mode for now)
      sessions = sessions.map(s => ({ ...s, question_count: 0 }));
      
      // Apply pagination
      const paginatedSessions = sessions.slice(offset, offset + parseInt(limit));
      
      return res.json({
        success: true,
        sessions: paginatedSessions,
        total: sessions.length
      });
    }

    let queryText = `
      SELECT s.*, COUNT(q.id) as question_count
      FROM interview_sessions s
      LEFT JOIN questions q ON s.id = q.session_id
      WHERE s.user_id = $1
    `;
    
    const params = [userId];
    
    if (status) {
      params.push(status);
      queryText += ` AND s.status = $${params.length}`;
    }

    queryText += `
      GROUP BY s.id
      ORDER BY s.started_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      sessions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get single session
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isDemoMode) {
      // Demo mode - get from in-memory storage
      const session = demoSessions.get(id);
      
      if (!session || session.user_id !== userId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      return res.json({
        success: true,
        session: {
          ...session,
          questions: [] // Empty questions array for demo mode
        }
      });
    }

    // Get session with questions
    const result = await query(
      `SELECT s.*, 
        json_agg(
          json_build_object(
            'id', q.id,
            'question_text', q.question_text,
            'asked_at', q.asked_at,
            'response_time_ms', q.response_time_ms
          ) ORDER BY q.asked_at
        ) FILTER (WHERE q.id IS NOT NULL) as questions
       FROM interview_sessions s
       LEFT JOIN questions q ON s.id = q.session_id
       WHERE s.id = $1 AND s.user_id = $2
       GROUP BY s.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = result.rows[0];

    // Get user's documents (CV, job description, person specification)
    try {
      const docsResult = await query(
        `SELECT document_type, content 
         FROM user_documents 
         WHERE user_id = $1 AND document_type IN ('cv', 'job_description', 'person_specification')`,
        [userId]
      );

      // Attach document content to session
      for (const doc of docsResult.rows) {
        if (doc.document_type === 'cv') {
          session.cv_content = doc.content || '';
        } else if (doc.document_type === 'job_description') {
          session.job_description = doc.content || '';
        } else if (doc.document_type === 'person_specification') {
          session.person_specification = doc.content || '';
        }
      }
    } catch (docErr) {
      console.warn('Could not load user documents:', docErr.message);
      // Continue without documents
    }

    res.json({
      session: session
    });
  } catch (error) {
    next(error);
  }
});

// End session
router.patch('/:id/end', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `UPDATE interview_sessions 
       SET status = 'completed',
           ended_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete session
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `DELETE FROM interview_sessions 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

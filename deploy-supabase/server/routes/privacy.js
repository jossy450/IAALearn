const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get privacy settings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT * FROM privacy_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings if not exist
      const newSettings = await query(
        'INSERT INTO privacy_settings (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      return res.json({ settings: newSettings.rows[0] });
    }

    res.json({ settings: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update privacy settings
router.patch('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      disguiseMode,
      disguiseTheme,
      quickHideEnabled,
      quickHideKey,
      autoClearHistory,
      autoClearDays,
      encryptionEnabled,
      dataRetentionDays
    } = req.body;

    const updates = [];
    const values = [userId];
    let paramCount = 1;

    if (disguiseMode !== undefined) {
      paramCount++;
      updates.push(`disguise_mode = $${paramCount}`);
      values.push(disguiseMode);
    }

    if (disguiseTheme !== undefined) {
      paramCount++;
      updates.push(`disguise_theme = $${paramCount}`);
      values.push(disguiseTheme);
    }

    if (quickHideEnabled !== undefined) {
      paramCount++;
      updates.push(`quick_hide_enabled = $${paramCount}`);
      values.push(quickHideEnabled);
    }

    if (quickHideKey !== undefined) {
      paramCount++;
      updates.push(`quick_hide_key = $${paramCount}`);
      values.push(quickHideKey);
    }

    if (autoClearHistory !== undefined) {
      paramCount++;
      updates.push(`auto_clear_history = $${paramCount}`);
      values.push(autoClearHistory);
    }

    if (autoClearDays !== undefined) {
      paramCount++;
      updates.push(`auto_clear_days = $${paramCount}`);
      values.push(autoClearDays);
    }

    if (encryptionEnabled !== undefined) {
      paramCount++;
      updates.push(`encryption_enabled = $${paramCount}`);
      values.push(encryptionEnabled);
    }

    if (dataRetentionDays !== undefined) {
      paramCount++;
      updates.push(`data_retention_days = $${paramCount}`);
      values.push(dataRetentionDays);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const result = await query(
      `UPDATE privacy_settings 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Clear user history
router.post('/clear-history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days } = req.body;

    let dateCondition = '';
    if (days) {
      dateCondition = `AND started_at < NOW() - INTERVAL '${parseInt(days)} days'`;
    }

    const result = await query(
      `DELETE FROM interview_sessions 
       WHERE user_id = $1 ${dateCondition}
       RETURNING id`,
      [userId]
    );

    res.json({
      success: true,
      cleared: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get disguise themes
router.get('/themes', authenticate, (req, res) => {
  const themes = [
    {
      id: 'productivity',
      name: 'Productivity Dashboard',
      description: 'Looks like a task management app',
      icon: 'clipboard-list'
    },
    {
      id: 'calendar',
      name: 'Calendar View',
      description: 'Appears as a calendar application',
      icon: 'calendar'
    },
    {
      id: 'notes',
      name: 'Note Taking',
      description: 'Disguised as a note-taking app',
      icon: 'file-text'
    },
    {
      id: 'email',
      name: 'Email Client',
      description: 'Looks like an email application',
      icon: 'mail'
    },
    {
      id: 'spreadsheet',
      name: 'Spreadsheet',
      description: 'Appears as a spreadsheet tool',
      icon: 'table'
    }
  ];

  res.json({ themes });
});

module.exports = router;

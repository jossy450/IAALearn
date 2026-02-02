// server/services/sessionSyncManager.js
// Manages real-time session synchronization across devices

const { query } = require('../database/connection');
const WebSocket = require('ws');

class SessionSyncManager {
  constructor() {
    this.activeConnections = new Map(); // sessionId:deviceId -> WebSocket
    this.sessionSubscriptions = new Map(); // sessionId -> Set of deviceIds
  }

  /**
   * Register a device for a session
   */
  async registerDevice(userId, sessionId, deviceInfo) {
    try {
      const {
        deviceId,
        deviceType,
        deviceName,
        appVersion,
        osVersion,
        networkType,
        batteryLevel,
        screenSize,
        capabilities
      } = deviceInfo;

      // Check if session belongs to user
      const sessionCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (sessionCheck.rows.length === 0) {
        throw new Error('Session not found or unauthorized');
      }

      // Deactivate other sessions on this device for same user
      await query(
        `UPDATE device_sessions 
         SET is_active = false 
         WHERE device_id = $1 AND user_id = $2 AND session_id != $3`,
        [deviceId, userId, sessionId]
      );

      // Register/update device session
      const result = await query(
        `INSERT INTO device_sessions 
         (user_id, session_id, device_id, device_type, device_name, app_version, os_version, network_type, battery_level, screen_size, capabilities)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (session_id, device_id) DO UPDATE 
         SET last_heartbeat = NOW(), is_active = true, network_type = $8, battery_level = $9
         RETURNING *`,
        [userId, sessionId, deviceId, deviceType, deviceName, appVersion, osVersion, networkType, batteryLevel, screenSize, JSON.stringify(capabilities)]
      );

      // Log sync event
      await this.logSyncEvent(sessionId, deviceId, 'device_joined', {deviceType, deviceName});

      // Notify other devices
      this.broadcastToSession(sessionId, {
        type: 'DEVICE_JOINED',
        deviceId,
        deviceType,
        deviceName,
        timestamp: Date.now()
      }, deviceId);

      return result.rows[0];
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Send heartbeat to keep device session alive
   */
  async heartbeat(userId, sessionId, deviceId) {
    try {
      await query(
        `UPDATE device_sessions 
         SET last_heartbeat = NOW() 
         WHERE session_id = $1 AND device_id = $2 AND user_id = $3`,
        [sessionId, deviceId, userId]
      );
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      throw error;
    }
  }

  /**
   * Update session state and broadcast to all devices
   */
  async updateSessionState(sessionId, updates, sourceDeviceId) {
    try {
      // Get current state for version checking
      const currentState = await query(
        'SELECT version FROM session_state WHERE session_id = $1',
        [sessionId]
      );

      const currentVersion = currentState.rows[0]?.version || 0;

      // Update state with optimistic locking
      const result = await query(
        `UPDATE session_state 
         SET 
           current_question_text = COALESCE($2, current_question_text),
           current_answer_text = COALESCE($3, current_answer_text),
           is_streaming = COALESCE($4, is_streaming),
           is_recording = COALESCE($5, is_recording),
           is_answer_hidden = COALESCE($6, is_answer_hidden),
           floating_position = COALESCE($7::jsonb, floating_position),
           floating_collapsed = COALESCE($8, floating_collapsed),
           mobile_view_mode = COALESCE($9, mobile_view_mode),
           version = version + 1,
           last_updated_at = NOW(),
           last_updated_from_device = $10
         WHERE session_id = $1 AND version = $11
         RETURNING *`,
        [
          sessionId,
          updates.currentQuestion || null,
          updates.currentAnswer || null,
          updates.isStreaming !== undefined ? updates.isStreaming : null,
          updates.isRecording !== undefined ? updates.isRecording : null,
          updates.isAnswerHidden !== undefined ? updates.isAnswerHidden : null,
          updates.floatingPosition ? JSON.stringify(updates.floatingPosition) : null,
          updates.floatingCollapsed !== undefined ? updates.floatingCollapsed : null,
          updates.mobileViewMode || null,
          sourceDeviceId,
          currentVersion
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('Optimistic lock failed. State was modified.');
      }

      // Broadcast to all devices
      this.broadcastToSession(sessionId, {
        type: 'STATE_CHANGED',
        state: result.rows[0],
        sourceDevice: sourceDeviceId,
        timestamp: Date.now()
      }, sourceDeviceId);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating session state:', error);
      throw error;
    }
  }

  /**
   * Stream answer chunk to all devices
   */
  broadcastAnswerChunk(sessionId, chunk, sourceDeviceId) {
    this.broadcastToSession(sessionId, {
      type: 'ANSWER_STREAM',
      chunk,
      timestamp: Date.now()
    }, sourceDeviceId);
  }

  /**
   * Mark answer as complete streaming
   */
  broadcastAnswerComplete(sessionId, fullAnswer, sourceDeviceId) {
    this.broadcastToSession(sessionId, {
      type: 'ANSWER_COMPLETE',
      answer: fullAnswer,
      timestamp: Date.now()
    }, sourceDeviceId);
  }

  /**
   * Process offline sync queue from device
   */
  async syncOfflineQueue(userId, sessionId, deviceId, queue) {
    try {
      const results = [];

      for (const item of queue) {
        try {
          const { action, entityType, entityId, payload, timestamp, sequenceNumber } = item;

          // Verify device owns this session
          const verification = await query(
            'SELECT id FROM device_sessions WHERE session_id = $1 AND device_id = $2 AND user_id = $3',
            [sessionId, deviceId, userId]
          );

          if (verification.rows.length === 0) {
            results.push({
              id: item.id,
              status: 'rejected',
              error: 'Device not registered for session'
            });
            continue;
          }

          // Check for conflicts (newer version exists on server)
          const existingCheck = await query(
            `SELECT MAX(version) as max_version FROM sync_queue 
             WHERE session_id = $1 AND entity_id = $2 AND synced_at IS NOT NULL`,
            [sessionId, entityId]
          );

          // Apply the change
          if (action === 'update' && entityType === 'state') {
            await this.updateSessionState(sessionId, payload, deviceId);
          } else if (action === 'create' && entityType === 'answer') {
            // Create answer in database
            await query(
              `INSERT INTO questions (session_id, question_text, response_time_ms) 
               VALUES ($1, $2, $3)`,
              [sessionId, payload.questionText, payload.responseTime || 0]
            );
          }

          // Mark as synced
          await query(
            `UPDATE sync_queue 
             SET synced_at = NOW() 
             WHERE device_id = $1 AND id = $2`,
            [deviceId, item.id]
          );

          results.push({
            id: item.id,
            status: 'synced',
            timestamp: Date.now()
          });
        } catch (itemError) {
          console.error('Error syncing queue item:', itemError);
          results.push({
            id: item.id,
            status: 'error',
            error: itemError.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing offline queue:', error);
      throw error;
    }
  }

  /**
   * Get full session state for device sync
   */
  async getFullSessionState(sessionId) {
    try {
      const state = await query(
        'SELECT * FROM session_state WHERE session_id = $1',
        [sessionId]
      );

      const questions = await query(
        'SELECT * FROM questions WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );

      const devices = await query(
        'SELECT id, device_id, device_type, device_name, last_heartbeat, is_active FROM device_sessions WHERE session_id = $1',
        [sessionId]
      );

      return {
        state: state.rows[0],
        questions: questions.rows,
        connectedDevices: devices.rows,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching session state:', error);
      throw error;
    }
  }

  /**
   * Disconnect device and cleanup
   */
  async disconnectDevice(userId, sessionId, deviceId) {
    try {
      const result = await query(
        `UPDATE device_sessions 
         SET is_active = false, disconnected_at = NOW() 
         WHERE session_id = $1 AND device_id = $2 AND user_id = $3
         RETURNING *`,
        [sessionId, deviceId, userId]
      );

      // Log event
      await this.logSyncEvent(sessionId, deviceId, 'device_left', {});

      // Notify other devices
      this.broadcastToSession(sessionId, {
        type: 'DEVICE_LEFT',
        deviceId,
        timestamp: Date.now()
      });

      // Close WebSocket connection
      const connKey = `${sessionId}:${deviceId}`;
      const ws = this.activeConnections.get(connKey);
      if (ws) {
        ws.close();
        this.activeConnections.delete(connKey);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error disconnecting device:', error);
      throw error;
    }
  }

  /**
   * Get pending sync items for device
   */
  async getPendingSyncQueue(deviceId) {
    try {
      const result = await query(
        `SELECT * FROM sync_queue 
         WHERE device_id = $1 AND synced_at IS NULL 
         ORDER BY sequence_number ASC
         LIMIT 100`,
        [deviceId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching sync queue:', error);
      throw error;
    }
  }

  /**
   * Register WebSocket connection for real-time updates
   */
  registerConnection(sessionId, deviceId, ws) {
    const key = `${sessionId}:${deviceId}`;
    this.activeConnections.set(key, ws);

    // Track subscriptions
    if (!this.sessionSubscriptions.has(sessionId)) {
      this.sessionSubscriptions.set(sessionId, new Set());
    }
    this.sessionSubscriptions.get(sessionId).add(deviceId);

    console.log(`WebSocket registered: ${key}`);
  }

  /**
   * Unregister WebSocket connection
   */
  unregisterConnection(sessionId, deviceId) {
    const key = `${sessionId}:${deviceId}`;
    this.activeConnections.delete(key);

    const subscribers = this.sessionSubscriptions.get(sessionId);
    if (subscribers) {
      subscribers.delete(deviceId);
      if (subscribers.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }

    console.log(`WebSocket unregistered: ${key}`);
  }

  /**
   * Broadcast message to all devices on a session
   */
  broadcastToSession(sessionId, message, excludeDeviceId = null) {
    const subscribers = this.sessionSubscriptions.get(sessionId) || new Set();

    for (const deviceId of subscribers) {
      if (excludeDeviceId && deviceId === excludeDeviceId) {
        continue; // Don't echo back to sender
      }

      const key = `${sessionId}:${deviceId}`;
      const ws = this.activeConnections.get(key);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Log synchronization event for debugging
   */
  async logSyncEvent(sessionId, deviceId, eventType, eventData) {
    try {
      await query(
        `INSERT INTO sync_events (session_id, device_id, event_type, event_data)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, deviceId, eventType, JSON.stringify(eventData)]
      );
    } catch (error) {
      console.error('Error logging sync event:', error);
      // Don't throw - logging shouldn't break main flow
    }
  }

  /**
   * Cleanup stale connections (no heartbeat for 5+ minutes)
   */
  async cleanupStaleConnections() {
    try {
      const result = await query(
        `UPDATE device_sessions 
         SET is_active = false 
         WHERE is_active = true 
         AND last_heartbeat < NOW() - INTERVAL '5 minutes'
         RETURNING session_id, device_id`,
      );

      // Notify remaining devices of disconnections
      for (const row of result.rows) {
        this.unregisterConnection(row.session_id, row.device_id);
        this.broadcastToSession(row.session_id, {
          type: 'DEVICE_STALE',
          deviceId: row.device_id,
          reason: 'No heartbeat for 5 minutes'
        });
      }

      console.log(`Cleaned up ${result.rows.length} stale connections`);
    } catch (error) {
      console.error('Error cleaning up stale connections:', error);
    }
  }

  /**
   * Get session continuity metrics
   */
  async getSessionMetrics(sessionId) {
    try {
      const metrics = await query(
        `SELECT * FROM session_continuity_metrics WHERE session_id = $1`,
        [sessionId]
      );

      const pendingSync = await query(
        `SELECT COUNT(*) as count FROM sync_queue 
         WHERE session_id = $1 AND synced_at IS NULL`,
        [sessionId]
      );

      const events = await query(
        `SELECT * FROM sync_events WHERE session_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [sessionId]
      );

      return {
        metrics: metrics.rows[0],
        pendingSyncCount: parseInt(pendingSync.rows[0].count),
        recentEvents: events.rows
      };
    } catch (error) {
      console.error('Error fetching session metrics:', error);
      throw error;
    }
  }
}

module.exports = new SessionSyncManager();

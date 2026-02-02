// server/websocket/sessionHandler.js
// WebSocket handler for real-time session synchronization

const sessionSyncManager = require('../services/sessionSyncManager');
const { verifyToken } = require('../middleware/auth');

/**
 * Handle WebSocket connections for session synchronization
 * Route: WS /api/ws/session/:sessionId
 * 
 * Message types:
 * - DEVICE_JOINED: New device connected
 * - ANSWER_STREAM: Streaming answer chunk
 * - ANSWER_COMPLETE: Full answer received
 * - STATE_CHANGED: Session state updated
 * - SYNC_REQUEST: Device requesting sync
 * - HEARTBEAT: Keepalive ping
 */
class SessionWebSocketHandler {
  constructor() {
    this.handlers = {
      'ANSWER_STREAM': this.handleAnswerStream.bind(this),
      'ANSWER_COMPLETE': this.handleAnswerComplete.bind(this),
      'STATE_CHANGED': this.handleStateChanged.bind(this),
      'SYNC_REQUEST': this.handleSyncRequest.bind(this),
      'HEARTBEAT': this.handleHeartbeat.bind(this),
      'OFFLINE_QUEUE_SYNC': this.handleOfflineQueueSync.bind(this)
    };

    // Cleanup stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      sessionSyncManager.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }

  /**
   * Main WebSocket connection handler
   */
  async handleConnection(ws, req) {
    try {
      const { sessionId } = req.params;
      const token = req.headers.authorization?.split(' ')[1];
      const deviceId = req.headers['x-device-id'];
      const deviceType = req.headers['x-device-type'] || 'web';

      // Validate token
      if (!token || !deviceId || !sessionId) {
        ws.close(1008, 'Missing required headers');
        return;
      }

      let user;
      try {
        const decoded = verifyToken(token);
        user = decoded;
      } catch (error) {
        ws.close(1008, 'Invalid or expired token');
        return;
      }

      console.log(`[WS] New connection: session=${sessionId}, device=${deviceId}, type=${deviceType}`);

      // Store connection metadata
      ws.sessionId = sessionId;
      ws.deviceId = deviceId;
      ws.deviceType = deviceType;
      ws.userId = user.id;
      ws.isAlive = true;

      // Register connection
      sessionSyncManager.registerConnection(sessionId, deviceId, ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        sessionId,
        deviceId,
        timestamp: Date.now(),
        message: 'Connected to session sync server'
      }));

      // Broadcast device joined to other devices
      sessionSyncManager.broadcastToSession(sessionId, {
        type: 'DEVICE_JOINED',
        deviceId,
        deviceType,
        timestamp: Date.now()
      }, deviceId);

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Invalid message format',
            timestamp: Date.now()
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`[WS] Connection closed: session=${sessionId}, device=${deviceId}`);
        sessionSyncManager.unregisterConnection(sessionId, deviceId);
        
        // Notify other devices
        sessionSyncManager.broadcastToSession(sessionId, {
          type: 'DEVICE_LEFT',
          deviceId,
          timestamp: Date.now()
        });

        // Mark device as inactive (but don't delete - keep history)
        sessionSyncManager.disconnectDevice(user.id, sessionId, deviceId).catch(err => {
          console.error('[WS] Error disconnecting device:', err);
        });
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('[WS] WebSocket error:', error);
        ws.close();
      });

      // Setup ping/pong for keepalive
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

    } catch (error) {
      console.error('[WS] Error in handleConnection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Route incoming messages to appropriate handler
   */
  handleMessage(ws, message) {
    const { type, ...payload } = message;

    console.log(`[WS] Message from ${ws.deviceId}: ${type}`);

    const handler = this.handlers[type];
    if (handler) {
      handler(ws, payload).catch(error => {
        console.error(`[WS] Error handling ${type}:`, error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: error.message,
          timestamp: Date.now()
        }));
      });
    } else {
      console.warn(`[WS] Unknown message type: ${type}`);
    }
  }

  /**
   * Handle answer stream chunks
   */
  async handleAnswerStream(ws, payload) {
    const { answerChunk, chunkIndex, totalChunks } = payload;

    // Update session state - mark as streaming
    if (chunkIndex === 0) {
      await sessionSyncManager.updateSessionState(
        ws.sessionId,
        { isStreaming: true },
        ws.deviceId
      );
    }

    // Broadcast chunk to all other devices
    sessionSyncManager.broadcastToSession(ws.sessionId, {
      type: 'ANSWER_STREAM',
      chunk: answerChunk,
      chunkIndex,
      totalChunks,
      timestamp: Date.now()
    }, ws.deviceId);

    // Log event for analytics
    await sessionSyncManager.logSyncEvent(
      ws.sessionId,
      ws.deviceId,
      'answer_streaming',
      { chunkIndex, totalChunks }
    );
  }

  /**
   * Handle answer completion
   */
  async handleAnswerComplete(ws, payload) {
    const { fullAnswer } = payload;

    // Update session state
    await sessionSyncManager.updateSessionState(
      ws.sessionId,
      { 
        currentAnswer: fullAnswer,
        isStreaming: false
      },
      ws.deviceId
    );

    // Broadcast completion to all devices
    sessionSyncManager.broadcastToSession(ws.sessionId, {
      type: 'ANSWER_COMPLETE',
      answer: fullAnswer,
      timestamp: Date.now()
    }, ws.deviceId);

    // Log event
    await sessionSyncManager.logSyncEvent(
      ws.sessionId,
      ws.deviceId,
      'answer_complete',
      { answerLength: fullAnswer.length }
    );
  }

  /**
   * Handle state changes from devices
   */
  async handleStateChanged(ws, payload) {
    const { updates } = payload;

    try {
      await sessionSyncManager.updateSessionState(
        ws.sessionId,
        updates,
        ws.deviceId
      );

      ws.send(JSON.stringify({
        type: 'STATE_UPDATE_ACK',
        timestamp: Date.now()
      }));
    } catch (error) {
      if (error.message.includes('Optimistic lock failed')) {
        // State was modified, request full sync
        ws.send(JSON.stringify({
          type: 'SYNC_REQUIRED',
          reason: 'Optimistic lock conflict',
          timestamp: Date.now()
        }));
      }
      throw error;
    }
  }

  /**
   * Handle sync requests from devices
   */
  async handleSyncRequest(ws, payload) {
    try {
      const fullState = await sessionSyncManager.getFullSessionState(ws.sessionId);

      ws.send(JSON.stringify({
        type: 'FULL_SYNC',
        data: fullState,
        timestamp: Date.now()
      }));

      // Log event
      await sessionSyncManager.logSyncEvent(
        ws.sessionId,
        ws.deviceId,
        'sync_request_fulfilled',
        {}
      );
    } catch (error) {
      console.error('[WS] Error handling sync request:', error);
      throw error;
    }
  }

  /**
   * Handle heartbeat/keepalive
   */
  async handleHeartbeat(ws, payload) {
    const { networkType, batteryLevel } = payload;

    // Update device info
    await sessionSyncManager.heartbeat(
      ws.userId,
      ws.sessionId,
      ws.deviceId
    );

    // Send heartbeat ack
    ws.send(JSON.stringify({
      type: 'HEARTBEAT_ACK',
      timestamp: Date.now(),
      serverTime: Date.now()
    }));

    ws.isAlive = true;
  }

  /**
   * Handle offline queue synchronization
   */
  async handleOfflineQueueSync(ws, payload) {
    const { queue } = payload;

    console.log(`[WS] Processing offline queue from ${ws.deviceId}: ${queue.length} items`);

    const results = await sessionSyncManager.syncOfflineQueue(
      ws.userId,
      ws.sessionId,
      ws.deviceId,
      queue
    );

    ws.send(JSON.stringify({
      type: 'OFFLINE_QUEUE_ACK',
      results,
      timestamp: Date.now()
    }));

    // Broadcast full state update to all devices after queue sync
    const fullState = await sessionSyncManager.getFullSessionState(ws.sessionId);
    sessionSyncManager.broadcastToSession(ws.sessionId, {
      type: 'FULL_SYNC',
      data: fullState,
      reason: 'After offline queue sync',
      timestamp: Date.now()
    }, ws.deviceId);
  }

  /**
   * Setup ping interval for keepalive
   */
  setupPingInterval(wss) {
    const interval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('[WS] Terminating dead connection:', ws.deviceId);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30 * 1000); // 30 second ping interval

    return interval;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = SessionWebSocketHandler;

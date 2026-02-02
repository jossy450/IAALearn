-- Migration: Add Mobile App Session Continuity Tables
-- Purpose: Enable seamless session transfer between devices (desktop ↔ mobile)
-- Date: 2026-02-02

-- 1. Device Sessions Table - Track which devices access each session
CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,  -- Unique device identifier (UDID/Android ID)
  device_name VARCHAR(255),          -- e.g., "iPhone 15 Pro", "Samsung S24"
  device_type VARCHAR(32) NOT NULL CHECK (device_type IN ('web', 'android', 'ios')),
  app_version VARCHAR(32),           -- e.g., "2.7.1"
  os_version VARCHAR(32),            -- e.g., "iOS 17.2", "Android 14"
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  network_type VARCHAR(32),          -- 'wifi', '4g', '5g', 'ethernet', etc
  battery_level INT CHECK (battery_level >= 0 AND battery_level <= 100),
  screen_size VARCHAR(64),           -- e.g., "6.7-inch", "27-inch"
  capabilities JSONB DEFAULT '{"microphone": true, "camera": true, "speaker": true}',
  metadata JSONB DEFAULT '{}',       -- Custom app-specific data
  
  -- Unique constraint: only one active session per device
  CONSTRAINT unique_active_device_session UNIQUE (session_id, device_id) WHERE is_active = true,
  
  -- Indexes for efficient queries
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE INDEX idx_device_sessions_user_session ON device_sessions(user_id, session_id);
CREATE INDEX idx_device_sessions_active ON device_sessions(session_id) WHERE is_active = true;
CREATE INDEX idx_device_sessions_last_heartbeat ON device_sessions(last_heartbeat);

-- 2. Session State Table - Real-time session state for synchronization
CREATE TABLE IF NOT EXISTS session_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
  
  -- Current question and answer
  current_question_text TEXT,
  current_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  current_answer_text TEXT,
  is_streaming BOOLEAN DEFAULT false,
  
  -- User action state
  is_recording BOOLEAN DEFAULT false,
  is_answer_hidden BOOLEAN DEFAULT false,
  is_stealth_mode ACTIVE BOOLEAN DEFAULT false,
  
  -- Floating widget state (for desktop)
  floating_position JSONB DEFAULT '{"x": 50, "y": 50}', -- Percentage positions
  floating_size JSONB DEFAULT '{"width": 400, "height": 300}',
  floating_collapsed BOOLEAN DEFAULT false,
  
  -- Mobile view state
  mobile_view_mode VARCHAR(32) DEFAULT 'full_screen', -- 'full_screen', 'minimized', 'compact'
  mobile_answer_index INT DEFAULT 0,                   -- Which answer in history shown
  
  -- Answer visibility
  visible_to_devices JSONB DEFAULT '{}',  -- {deviceId: true/false}
  
  -- Sync metadata
  version INT DEFAULT 0,                  -- For optimistic locking
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_updated_from_device VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE INDEX idx_session_state_session_id ON session_state(session_id);
CREATE INDEX idx_session_state_updated_at ON session_state(last_updated_at DESC);

-- 3. Sync Queue Table - Store offline changes to sync when reconnected
CREATE TABLE IF NOT EXISTS sync_queue (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identifies the operation
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  
  -- Operation details
  action VARCHAR(32) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'stream')),
  entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('answer', 'question', 'state', 'metadata')),
  entity_id UUID,
  
  -- The actual change
  payload JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Sync tracking
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  sync_error TEXT,
  retry_count INT DEFAULT 0 CHECK (retry_count < 5),
  
  -- Ordering
  sequence_number INT NOT NULL  -- For maintaining order of operations
);

CREATE INDEX idx_sync_queue_device ON sync_queue(device_id, synced_at) WHERE synced_at IS NULL;
CREATE INDEX idx_sync_queue_session ON sync_queue(session_id, created_at DESC);
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id) WHERE synced_at IS NULL;

-- 4. Device Capabilities Table - Track device features and capabilities
CREATE TABLE IF NOT EXISTS device_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Hardware capabilities
  has_microphone BOOLEAN DEFAULT true,
  has_camera BOOLEAN DEFAULT true,
  has_speaker BOOLEAN DEFAULT true,
  has_file_system BOOLEAN DEFAULT true,
  has_vibration BOOLEAN DEFAULT false,
  
  -- Software capabilities
  supports_background_tasks BOOLEAN DEFAULT false,
  supports_push_notifications BOOLEAN DEFAULT true,
  supports_websocket BOOLEAN DEFAULT true,
  supports_offline_sync BOOLEAN DEFAULT true,
  
  -- Constraints and limits
  offline_storage_mb INT DEFAULT 500,
  max_sync_queue_size INT DEFAULT 5000,
  sync_interval_ms INT DEFAULT 1500,
  battery_saver_mode_sync_interval_ms INT DEFAULT 30000,
  
  -- Feature flags
  battery_saver_mode BOOLEAN DEFAULT false,
  data_saver_mode BOOLEAN DEFAULT false,
  compression_enabled BOOLEAN DEFAULT true,
  
  -- Performance metrics
  avg_sync_time_ms INT,
  max_concurrent_connections INT DEFAULT 3,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_capabilities_device_id ON device_capabilities(device_id);

-- 5. Device Cross-Session History Table - For analytics and recovery
CREATE TABLE IF NOT EXISTS device_session_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_type VARCHAR(32) NOT NULL,
  
  -- Duration
  connected_at TIMESTAMP NOT NULL,
  disconnected_at TIMESTAMP,
  duration_ms INT,
  
  -- Activity
  questions_asked_count INT DEFAULT 0,
  answers_received_count INT DEFAULT 0,
  offline_sync_count INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  
  -- Network
  network_type VARCHAR(32),
  battery_at_disconnect INT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_device_session_history_user ON device_session_history(user_id, created_at DESC);
CREATE INDEX idx_device_session_history_session ON device_session_history(session_id);

-- 6. Real-time Sync Events Table - For debugging and analytics
CREATE TABLE IF NOT EXISTS sync_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  device_id VARCHAR(255),
  
  event_type VARCHAR(64) NOT NULL, -- 'device_joined', 'device_left', 'sync_started', 'sync_complete', etc
  event_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_events_session ON sync_events(session_id, created_at DESC);
CREATE INDEX idx_sync_events_device ON sync_events(device_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE device_sessions IS 'Tracks active device connections to interview sessions. One row per device per session.';
COMMENT ON TABLE session_state IS 'Real-time session state that is synchronized across all connected devices. Optimistic locking via version column.';
COMMENT ON TABLE sync_queue IS 'Queue of offline changes waiting to be synced to the server. Processed in order (sequence_number).';
COMMENT ON TABLE device_capabilities IS 'Device capabilities and configuration. Used for adaptive sync behavior (e.g., lower sync frequency on low battery).';
COMMENT ON TABLE device_session_history IS 'Historical record of device sessions for analytics, debugging, and recovery.';
COMMENT ON TABLE sync_events IS 'Real-time event log of all synchronization events for monitoring and debugging.';

-- Trigger to update last_heartbeat on device_sessions
CREATE OR REPLACE FUNCTION update_device_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_heartbeat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_sessions_heartbeat_trigger
BEFORE UPDATE ON device_sessions
FOR EACH ROW
EXECUTE FUNCTION update_device_heartbeat();

-- Trigger to log sync events
CREATE OR REPLACE FUNCTION log_sync_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sync_events (session_id, device_id, event_type, event_data)
    VALUES (NEW.session_id, NEW.device_id, 'answer_received', jsonb_build_object('entity_id', NEW.entity_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_queue_logging_trigger
AFTER INSERT ON sync_queue
FOR EACH ROW
EXECUTE FUNCTION log_sync_event();

-- Performance views

-- Active devices per session
CREATE VIEW active_devices_per_session AS
SELECT 
  session_id,
  COUNT(*) as device_count,
  array_agg(device_type) as device_types,
  array_agg(network_type) as network_types,
  MAX(last_heartbeat) as last_activity
FROM device_sessions
WHERE is_active = true
GROUP BY session_id;

-- Pending sync items per device
CREATE VIEW pending_sync_per_device AS
SELECT 
  device_id,
  COUNT(*) as pending_count,
  MIN(created_at) as oldest_pending,
  MAX(retry_count) as max_retries
FROM sync_queue
WHERE synced_at IS NULL
GROUP BY device_id;

-- Session continuity metrics
CREATE VIEW session_continuity_metrics AS
SELECT 
  s.id as session_id,
  COUNT(DISTINCT ds.device_id) as total_devices_used,
  COUNT(DISTINCT CASE WHEN ds.device_type = 'web' THEN ds.device_id END) as web_devices,
  COUNT(DISTINCT CASE WHEN ds.device_type = 'android' THEN ds.device_id END) as android_devices,
  COUNT(DISTINCT CASE WHEN ds.device_type = 'ios' THEN ds.device_id END) as ios_devices,
  SUM(CASE WHEN dsh.offline_sync_count > 0 THEN 1 ELSE 0 END) as devices_with_offline_sync,
  AVG(dsh.duration_ms) as avg_session_duration_ms,
  SUM(dsh.errors_count) as total_errors
FROM interview_sessions s
LEFT JOIN device_sessions ds ON s.id = ds.session_id
LEFT JOIN device_session_history dsh ON s.id = dsh.session_id
GROUP BY s.id;

-- Grant appropriate permissions
GRANT SELECT ON session_state TO authenticated;
GRANT SELECT, INSERT, UPDATE ON device_sessions TO authenticated;
GRANT SELECT, INSERT ON sync_queue TO authenticated;
GRANT SELECT ON device_capabilities TO authenticated;

-- Create extension for UUID if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for JSON operations if not exists
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

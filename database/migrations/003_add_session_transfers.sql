-- Migration: Add session_transfers table for QR code transfer feature
-- Date: 2024
-- Description: Enables emergency screen-share escape by transferring sessions to mobile devices

CREATE TABLE IF NOT EXISTS session_transfers (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  transfer_code VARCHAR(10) NOT NULL UNIQUE,
  transferred_at TIMESTAMP DEFAULT NOW(),
  device_info JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_session_transfers_session_id ON session_transfers(session_id);
CREATE INDEX idx_session_transfers_code ON session_transfers(transfer_code);
CREATE INDEX idx_session_transfers_expires ON session_transfers(expires_at);
CREATE INDEX idx_session_transfers_active ON session_transfers(is_active);

-- Comments for documentation
COMMENT ON TABLE session_transfers IS 'Tracks QR code-based session transfers to mobile devices for emergency screen sharing';
COMMENT ON COLUMN session_transfers.transfer_code IS '6-character alphanumeric code for secure transfer';
COMMENT ON COLUMN session_transfers.device_info IS 'JSON object containing mobile device information';
COMMENT ON COLUMN session_transfers.expires_at IS 'Transfer code expiration time (typically 5 minutes from creation)';
COMMENT ON COLUMN session_transfers.is_active IS 'Whether the transfer is currently active (can be deactivated on session end)';

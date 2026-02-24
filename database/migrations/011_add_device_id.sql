-- Add device_id column to users table for enhanced security
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);

-- Create an index for faster device_id queries
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Add a comment for documentation
COMMENT ON COLUMN users.device_id IS 'Unique device identifier for security validation';
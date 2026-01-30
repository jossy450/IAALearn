-- Migration: Add password reset fields
-- Description: Adds reset_token and reset_token_expiry columns to users table for password reset functionality

-- Add reset token fields if they don't exist
DO $$ 
BEGIN
  -- Add reset_token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'reset_token'
  ) THEN
    ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
  END IF;

  -- Add reset_token_expiry column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'reset_token_expiry'
  ) THEN
    ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP;
  END IF;

  -- Add login attempts tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;

  -- Add last failed login timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_failed_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP;
  END IF;

  -- Add account locked until timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN users.reset_token IS 'Hashed token for password reset';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiration time for reset token';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login IS 'Timestamp of last failed login attempt';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which account is locked';

-- Create function to clear expired reset tokens
CREATE OR REPLACE FUNCTION clear_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET reset_token = NULL, reset_token_expiry = NULL
  WHERE reset_token_expiry < NOW() AND reset_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login(user_id_param INTEGER)
RETURNS void AS $$
DECLARE
  attempts INTEGER;
BEGIN
  -- Increment failed attempts
  UPDATE users 
  SET failed_login_attempts = failed_login_attempts + 1,
      last_failed_login = NOW()
  WHERE id = user_id_param
  RETURNING failed_login_attempts INTO attempts;
  
  -- Lock account if too many attempts (5 or more)
  IF attempts >= 5 THEN
    UPDATE users 
    SET locked_until = NOW() + INTERVAL '15 minutes'
    WHERE id = user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(user_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET failed_login_attempts = 0,
      last_failed_login = NULL,
      locked_until = NULL
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

COMMIT;

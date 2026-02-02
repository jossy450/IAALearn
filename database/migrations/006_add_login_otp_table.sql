-- Migration: Add login_otp table for OTP-based authentication
-- Date: 2024

-- Create login_otp table for storing one-time passwords
CREATE TABLE IF NOT EXISTS login_otp (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    delivery_method VARCHAR(10) DEFAULT 'email', -- 'email' or 'sms'
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_login_otp_email ON login_otp(email);
CREATE INDEX IF NOT EXISTS idx_login_otp_expires_at ON login_otp(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_otp_is_verified ON login_otp(is_verified);

-- Add cleanup function to remove expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void AS $$
BEGIN
    DELETE FROM login_otp 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (optional - depends on PostgreSQL version and extensions)
-- For production, consider setting up a cron job or scheduled task
-- Example: SELECT cron.schedule('cleanup-otp', '0 * * * *', 'SELECT cleanup_expired_otp()');

COMMENT ON TABLE login_otp IS 'Stores one-time passwords for email/SMS-based authentication';
COMMENT ON COLUMN login_otp.otp_code IS 'Six-digit verification code';
COMMENT ON COLUMN login_otp.delivery_method IS 'Method used to deliver OTP: email or sms';
COMMENT ON COLUMN login_otp.attempts IS 'Number of verification attempts made (max 5)';
COMMENT ON COLUMN login_otp.expires_at IS 'OTP expiration timestamp (10 minutes from creation)';

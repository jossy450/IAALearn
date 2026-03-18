-- Add subscription_status column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';

-- Create index for faster subscription_status lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Add subscription_status column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';

-- Create index for faster subscription_status lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Create interview credits table for pay-per-interview feature
CREATE TABLE IF NOT EXISTS interview_credits (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL DEFAULT 0,
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_interview_credits_user_id ON interview_credits(user_id);

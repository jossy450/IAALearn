-- Migration: Add missing columns for OTP, referral, and subscription features
-- Run this on Fly.io database

-- Add phone_number column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add referral_code column for referral system
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10);

-- Add referral_count column for tracking referrals
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Add interview_credits column
ALTER TABLE users ADD COLUMN IF NOT EXISTS interview_credits INTEGER DEFAULT 3;

-- Add subscription_status column
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free';

-- Add referral_rewards table for referral system
CREATE TABLE IF NOT EXISTS referral_rewards (
  id SERIAL PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(10) NOT NULL,
  is_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP,
  reward_type VARCHAR(50) DEFAULT 'credits',
  reward_amount INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for referral_rewards
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_code ON referral_rewards(referral_code);

-- Add interview_credits table
CREATE TABLE IF NOT EXISTS interview_credits (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  credits INTEGER DEFAULT 3,
  last_refill_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for interview_credits
CREATE INDEX IF NOT EXISTS idx_interview_credits_user ON interview_credits(user_id);

-- Verify the columns were added
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
END $$;

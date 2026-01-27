-- Add OAuth fields to users table
-- Migration: 004_add_oauth_fields

-- Add oauth_provider column (google, github, null for local auth)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);

-- Make password_hash optional for OAuth users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth_id ON users(oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider ON users(oauth_provider);

-- Add unique constraint for oauth provider + id combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_unique 
ON users(oauth_provider, oauth_id) 
WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

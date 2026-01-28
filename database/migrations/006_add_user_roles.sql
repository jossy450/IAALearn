-- Add role column to users table for role-based access control
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Create an index for faster role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add a constraint to ensure valid roles
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'moderator'));

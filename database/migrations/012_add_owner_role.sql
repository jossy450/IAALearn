-- Update user roles constraint to include 'owner' role
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'moderator', 'owner'));
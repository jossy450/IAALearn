-- Add phone_number to users if not present (Supabase compatible)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Optional: add an index to speed up lookups by phone if you later support phone-based login
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
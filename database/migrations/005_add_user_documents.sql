-- Add user document storage for CV and job descriptions
-- This migration adds support for file uploads and document storage

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_documents (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'cv', 'job_description', etc.
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  mime_type VARCHAR(100), -- application/pdf, text/plain, etc.
  content TEXT, -- extracted text content for search/analysis
  s3_key VARCHAR(500), -- S3 storage key if using cloud storage
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, document_type, is_active) -- Only one active document per type per user
);

-- Add document reference to users table for quick access
ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_document_id INT REFERENCES user_documents(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_description_document_id INT REFERENCES user_documents(id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_is_active ON user_documents(is_active);

-- Create audit log table for tracking document operations
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50), -- 'upload', 'delete', 'view', 'share'
  document_id INT REFERENCES user_documents(id),
  document_type VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON document_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON document_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON document_audit_logs(created_at);

-- Add personalization preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS personalization_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS use_cv_for_answers BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS use_job_description BOOLEAN DEFAULT true;

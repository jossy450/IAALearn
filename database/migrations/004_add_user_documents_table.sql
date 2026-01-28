-- Migration: Add user_documents table for session-based document storage
-- Created: 2026-01-28
-- Description: Creates user_documents table with automatic cleanup on session end

-- User Documents table (session-based storage)
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('cv', 'job_description')),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_session_doc_type UNIQUE (user_id, session_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_session_id ON user_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(document_type);

COMMENT ON TABLE user_documents IS 'Stores user documents (CV, job description) tied to sessions for automatic cleanup';
COMMENT ON COLUMN user_documents.session_id IS 'Links document to session - documents deleted when session ends';

-- Trigger to auto-delete documents when session ends
CREATE OR REPLACE FUNCTION delete_session_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark documents as inactive when session ends
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE user_documents 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_session_documents
AFTER UPDATE ON interview_sessions
FOR EACH ROW
EXECUTE FUNCTION delete_session_documents();

-- Update trigger for user_documents
CREATE TRIGGER update_user_documents_updated_at 
BEFORE UPDATE ON user_documents
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

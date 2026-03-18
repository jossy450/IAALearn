-- Add columns for richer mock interview feedback and question text storage
ALTER TABLE mock_interview_answers ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE mock_interview_answers ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Indexes to speed up lookups by session/question
CREATE INDEX IF NOT EXISTS idx_mock_interview_answers_question_number
  ON mock_interview_answers(session_id, question_number);
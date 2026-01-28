-- Migration 007: Performance Optimization for Real-Time Interview Responses
-- Purpose: Add indexes and optimizations to reduce response time
-- Critical for stealth mode - delays could expose user

-- Add indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_questions_response_time ON questions(response_time_ms);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_cache_hit_count ON answer_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_answer_cache_last_used ON answer_cache(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_questions_session_category ON questions(session_id, category);
CREATE INDEX IF NOT EXISTS idx_cache_category_quality ON answer_cache(category, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON interview_sessions(user_id, status);

-- Optimize answer_cache with partial index for active entries
CREATE INDEX IF NOT EXISTS idx_answer_cache_active ON answer_cache(question_hash, category) 
WHERE expires_at IS NULL OR expires_at > NOW();

-- Add performance metrics table for monitoring
CREATE TABLE IF NOT EXISTS response_performance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timing breakdown
    transcription_time_ms INTEGER DEFAULT 0,
    cache_lookup_time_ms INTEGER DEFAULT 0,
    ai_generation_time_ms INTEGER DEFAULT 0,
    total_response_time_ms INTEGER NOT NULL,
    
    -- Performance flags
    was_cached BOOLEAN DEFAULT FALSE,
    was_streamed BOOLEAN DEFAULT FALSE,
    used_fast_model BOOLEAN DEFAULT FALSE,
    
    -- Context
    question_length INTEGER,
    answer_length INTEGER,
    model_used VARCHAR(50),
    
    -- Timestamps
    recorded_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_timing CHECK (total_response_time_ms >= 0)
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_session ON response_performance(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_user ON response_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_time ON response_performance(total_response_time_ms);
CREATE INDEX IF NOT EXISTS idx_performance_recorded ON response_performance(recorded_at DESC);

-- Create materialized view for fast cache stats (reduces query time)
CREATE MATERIALIZED VIEW IF NOT EXISTS cache_performance_stats AS
SELECT 
    category,
    COUNT(*) as total_entries,
    SUM(hit_count) as total_hits,
    AVG(quality_score) as avg_quality,
    COUNT(CASE WHEN hit_count > 5 THEN 1 END) as popular_entries,
    MAX(last_used_at) as last_activity
FROM answer_cache
WHERE expires_at IS NULL OR expires_at > NOW()
GROUP BY category;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_stats_category ON cache_performance_stats(category);

-- Create function to refresh cache stats (call periodically)
CREATE OR REPLACE FUNCTION refresh_cache_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY cache_performance_stats;
END;
$$ LANGUAGE plpgsql;

-- Add column to track if answer was pre-generated
ALTER TABLE answer_cache ADD COLUMN IF NOT EXISTS is_pregenerated BOOLEAN DEFAULT FALSE;
ALTER TABLE answer_cache ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER;

-- Create table for pre-generated common answers
CREATE TABLE IF NOT EXISTS pregenerated_answers (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_category VARCHAR(50) NOT NULL,
    answer_text TEXT NOT NULL,
    
    -- Context this answer applies to
    position_type VARCHAR(100),  -- e.g., 'software engineer', 'data scientist'
    industry VARCHAR(100),        -- e.g., 'tech', 'finance'
    experience_level VARCHAR(50), -- e.g., 'junior', 'senior'
    
    -- Quality metrics
    quality_score DECIMAL(3,2) DEFAULT 0.80,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2),
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT unique_pregenerated_question UNIQUE(question_text, position_type, industry)
);

-- Indexes for pregenerated answers
CREATE INDEX IF NOT EXISTS idx_pregenerated_category ON pregenerated_answers(question_category);
CREATE INDEX IF NOT EXISTS idx_pregenerated_position ON pregenerated_answers(position_type);
CREATE INDEX IF NOT EXISTS idx_pregenerated_active ON pregenerated_answers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pregenerated_quality ON pregenerated_answers(quality_score DESC);

-- Add function to track response performance
CREATE OR REPLACE FUNCTION log_response_performance(
    p_session_id INTEGER,
    p_question_id INTEGER,
    p_user_id INTEGER,
    p_transcription_ms INTEGER,
    p_cache_lookup_ms INTEGER,
    p_ai_generation_ms INTEGER,
    p_was_cached BOOLEAN,
    p_model VARCHAR(50)
)
RETURNS void AS $$
DECLARE
    v_total_ms INTEGER;
    v_question_length INTEGER;
    v_answer_length INTEGER;
BEGIN
    -- Calculate total time
    v_total_ms := COALESCE(p_transcription_ms, 0) + 
                  COALESCE(p_cache_lookup_ms, 0) + 
                  COALESCE(p_ai_generation_ms, 0);
    
    -- Get question and answer lengths
    SELECT 
        LENGTH(question_text),
        LENGTH(answer)
    INTO v_question_length, v_answer_length
    FROM questions
    WHERE id = p_question_id;
    
    -- Insert performance record
    INSERT INTO response_performance (
        session_id,
        question_id,
        user_id,
        transcription_time_ms,
        cache_lookup_time_ms,
        ai_generation_time_ms,
        total_response_time_ms,
        was_cached,
        question_length,
        answer_length,
        model_used
    ) VALUES (
        p_session_id,
        p_question_id,
        p_user_id,
        p_transcription_ms,
        p_cache_lookup_ms,
        p_ai_generation_ms,
        v_total_ms,
        p_was_cached,
        v_question_length,
        v_answer_length,
        p_model
    );
    
    -- Update question with response time
    UPDATE questions 
    SET response_time_ms = v_total_ms
    WHERE id = p_question_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail if logging fails
        RAISE WARNING 'Failed to log performance: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on existing tables if missing
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Add cleanup function for old performance data (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM response_performance
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optimize answer_cache for faster lookups
-- Use BRIN index for time-based columns (more efficient for large tables)
CREATE INDEX IF NOT EXISTS idx_answer_cache_expires_brin ON answer_cache USING BRIN(expires_at);

-- Add comments for documentation
COMMENT ON TABLE response_performance IS 'Tracks detailed performance metrics for each answer generation to identify bottlenecks';
COMMENT ON TABLE pregenerated_answers IS 'Stores pre-generated answers for common questions to reduce response time in live interviews';
COMMENT ON FUNCTION log_response_performance IS 'Logs detailed timing breakdown for answer generation process';
COMMENT ON FUNCTION refresh_cache_stats IS 'Refreshes materialized view for cache statistics - run periodically';
COMMENT ON FUNCTION cleanup_old_performance_data IS 'Removes performance records older than 30 days to maintain database performance';

-- Performance optimization complete
-- Expected improvements:
-- 1. Faster cache lookups: 50-80% reduction (indexed queries)
-- 2. Pre-generated answers: Near-instant (<100ms) for common questions
-- 3. Performance monitoring: Real-time tracking of slow responses
-- 4. Query optimization: Composite indexes for complex queries

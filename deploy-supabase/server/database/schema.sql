-- Interview Answer Assistant Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Interview Sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    position VARCHAR(255),
    session_type VARCHAR(50) DEFAULT 'general',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    total_questions INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    transcribed_audio TEXT,
    asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    source VARCHAR(50) DEFAULT 'audio'
);

-- Answer Cache table
CREATE TABLE IF NOT EXISTS answer_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_hash VARCHAR(64) UNIQUE NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    category VARCHAR(100),
    keywords TEXT[],
    quality_score DECIMAL(3,2),
    hit_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB
);

-- Pre-Generated Answers table
CREATE TABLE IF NOT EXISTS pre_generated_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    question_pattern TEXT NOT NULL,
    generated_answer TEXT NOT NULL,
    context JSONB,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Privacy Settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    disguise_mode BOOLEAN DEFAULT false,
    disguise_theme VARCHAR(50) DEFAULT 'productivity',
    quick_hide_enabled BOOLEAN DEFAULT true,
    quick_hide_key VARCHAR(50) DEFAULT 'Escape',
    auto_clear_history BOOLEAN DEFAULT false,
    auto_clear_days INTEGER DEFAULT 30,
    encryption_enabled BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mobile Sessions table
CREATE TABLE IF NOT EXISTS mobile_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    connection_code VARCHAR(6) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Research History table
CREATE TABLE IF NOT EXISTS research_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    research_query TEXT NOT NULL,
    research_results JSONB,
    sources TEXT[],
    research_type VARCHAR(50) DEFAULT 'fast',
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_started_at ON interview_sessions(started_at);
CREATE INDEX idx_questions_session_id ON questions(session_id);
CREATE INDEX idx_questions_asked_at ON questions(asked_at);
CREATE INDEX idx_answer_cache_question_hash ON answer_cache(question_hash);
CREATE INDEX idx_answer_cache_category ON answer_cache(category);
CREATE INDEX idx_answer_cache_keywords ON answer_cache USING GIN(keywords);
CREATE INDEX idx_pre_generated_answers_user_id ON pre_generated_answers(user_id);
CREATE INDEX idx_pre_generated_answers_category ON pre_generated_answers(category);
CREATE INDEX idx_mobile_sessions_connection_code ON mobile_sessions(connection_code);
CREATE INDEX idx_performance_metrics_session_id ON performance_metrics(session_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_generated_answers_updated_at BEFORE UPDATE ON pre_generated_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    s.id,
    s.user_id,
    s.title,
    s.started_at,
    s.duration_seconds,
    s.total_questions,
    COUNT(DISTINCT q.id) as actual_questions_count,
    AVG(q.response_time_ms) as avg_response_time,
    COUNT(DISTINCT m.id) as metrics_count
FROM interview_sessions s
LEFT JOIN questions q ON s.id = q.session_id
LEFT JOIN performance_metrics m ON s.id = m.session_id
GROUP BY s.id;

CREATE OR REPLACE VIEW cache_performance AS
SELECT 
    DATE_TRUNC('day', last_used_at) as date,
    COUNT(*) as total_entries,
    SUM(hit_count) as total_hits,
    AVG(quality_score) as avg_quality,
    COUNT(CASE WHEN hit_count > 0 THEN 1 END) as used_entries
FROM answer_cache
GROUP BY DATE_TRUNC('day', last_used_at);

-- Session Transfers table for QR code transfer feature
CREATE TABLE IF NOT EXISTS session_transfers (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  transfer_code VARCHAR(10) NOT NULL UNIQUE,
  transferred_at TIMESTAMP DEFAULT NOW(),
  device_info JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_transfers_session_id ON session_transfers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_transfers_code ON session_transfers(transfer_code);
CREATE INDEX IF NOT EXISTS idx_session_transfers_expires ON session_transfers(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_transfers_active ON session_transfers(is_active);

-- Comments for documentation
COMMENT ON TABLE session_transfers IS 'Tracks QR code-based session transfers to mobile devices for emergency screen sharing';
COMMENT ON COLUMN session_transfers.transfer_code IS '6-character alphanumeric code for secure transfer';
COMMENT ON COLUMN session_transfers.device_info IS 'JSON object containing mobile device information';
COMMENT ON COLUMN session_transfers.expires_at IS 'Transfer code expiration time (typically 60 seconds from creation)';
COMMENT ON COLUMN session_transfers.is_active IS 'Whether the transfer is currently active (can be deactivated on session end)';

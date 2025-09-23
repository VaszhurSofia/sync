-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    boundary_flag BOOLEAN DEFAULT FALSE,
    summary_text_enc TEXT -- AES-GCM encrypted session summary
);

-- Create index on couple_id for faster lookups
CREATE INDEX idx_sessions_couple_id ON sessions(couple_id);

-- Create index on started_at for ordering
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- Add comment for documentation
COMMENT ON TABLE sessions IS 'Chat sessions with boundary detection and encrypted summaries';
COMMENT ON COLUMN sessions.boundary_flag IS 'Set to true when AI detects boundary violation';
COMMENT ON COLUMN sessions.summary_text_enc IS 'AES-GCM encrypted session summary - never store plaintext';

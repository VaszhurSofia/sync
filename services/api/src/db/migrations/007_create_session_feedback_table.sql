-- Create session_feedback table
CREATE TABLE session_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    rating VARCHAR(10) NOT NULL CHECK (rating IN ('angry', 'neutral', 'happy')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on session_id for faster lookups
CREATE INDEX idx_session_feedback_session_id ON session_feedback(session_id);

-- Add comment for documentation
COMMENT ON TABLE session_feedback IS '3-emoji feedback system for completed sessions';

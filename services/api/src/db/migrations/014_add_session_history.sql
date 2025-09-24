-- Add session history table for consented summaries
CREATE TABLE IF NOT EXISTS session_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_text_enc TEXT NOT NULL, -- Encrypted summary
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_session_history_user_id ON session_history(user_id);
CREATE INDEX idx_session_history_session_id ON session_history(session_id);
CREATE INDEX idx_session_history_consent ON session_history(consent_given);
CREATE INDEX idx_session_history_created_at ON session_history(created_at);

-- RLS policies
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history entries
CREATE POLICY session_history_user_policy ON session_history
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_session_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_history_updated_at
    BEFORE UPDATE ON session_history
    FOR EACH ROW
    EXECUTE FUNCTION update_session_history_updated_at();

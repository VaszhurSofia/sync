-- Additional performance indexes

-- Composite index for couple_members lookups
CREATE INDEX idx_couple_members_user_couple ON couple_members(user_id, couple_id);

-- Composite index for session lookups by couple and time
CREATE INDEX idx_sessions_couple_started ON sessions(couple_id, started_at DESC);

-- Composite index for message lookups by session and time
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at ASC);

-- Partial index for active sessions (not ended)
CREATE INDEX idx_sessions_active ON sessions(couple_id) WHERE ended_at IS NULL;

-- Partial index for unaccepted invites
CREATE INDEX idx_invites_pending ON invites(couple_id, expires_at) WHERE accepted_by IS NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_sessions_active IS 'Partial index for faster lookup of active sessions';
COMMENT ON INDEX idx_invites_pending IS 'Partial index for faster lookup of pending invites';

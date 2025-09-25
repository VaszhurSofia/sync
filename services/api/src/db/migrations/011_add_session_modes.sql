-- Add session modes and solo session support
-- This migration adds support for both couple and solo sessions

-- Add mode column to sessions table
ALTER TABLE sessions ADD COLUMN mode VARCHAR(10) NOT NULL DEFAULT 'couple' CHECK (mode IN ('couple', 'solo'));

-- Add owner_user_id for solo sessions (nullable for couple sessions)
ALTER TABLE sessions ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add share_token for solo to couple conversion (nullable, one-time use)
ALTER TABLE sessions ADD COLUMN share_token UUID DEFAULT gen_random_uuid();

-- Create index on mode for faster lookups
CREATE INDEX idx_sessions_mode ON sessions(mode);

-- Create index on owner_user_id for solo session lookups
CREATE INDEX idx_sessions_owner_user_id ON sessions(owner_user_id);

-- Create index on share_token for conversion lookups
CREATE INDEX idx_sessions_share_token ON sessions(share_token);

-- Update RLS policies to handle both couple and solo sessions
-- Drop existing policy
DROP POLICY IF EXISTS "Couple members can access sessions" ON sessions;

-- Create new policy that handles both modes
CREATE POLICY "Users can access their sessions" ON sessions
    FOR ALL USING (
        -- Couple sessions: accessible by couple members
        (mode = 'couple' AND couple_id IN (
            SELECT couple_id FROM couple_members 
            WHERE user_id = current_setting('app.current_user_id')::uuid
        ))
        OR
        -- Solo sessions: accessible by owner only
        (mode = 'solo' AND owner_user_id = current_setting('app.current_user_id')::uuid)
    );

-- Add comments for documentation
COMMENT ON COLUMN sessions.mode IS 'Session mode: couple (both partners) or solo (individual)';
COMMENT ON COLUMN sessions.owner_user_id IS 'For solo sessions: the user who owns this session. NULL for couple sessions.';
COMMENT ON COLUMN sessions.share_token IS 'One-time token for converting solo session to couple session. NULL for couple sessions.';

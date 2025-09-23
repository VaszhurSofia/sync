-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for couple-based access control
-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (id = current_setting('app.current_user_id')::uuid);

-- Couples can only be accessed by their members
CREATE POLICY "Couple members can access couple" ON couples
    FOR ALL USING (
        id IN (
            SELECT couple_id FROM couple_members 
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Couple members can access their couple's data
CREATE POLICY "Couple members can access couple_members" ON couple_members
    FOR ALL USING (
        user_id = current_setting('app.current_user_id')::uuid OR
        couple_id IN (
            SELECT couple_id FROM couple_members 
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Invites can be accessed by couple members or by code (for acceptance)
CREATE POLICY "Couple members can access invites" ON invites
    FOR ALL USING (
        couple_id IN (
            SELECT couple_id FROM couple_members 
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Sessions can be accessed by couple members
CREATE POLICY "Couple members can access sessions" ON sessions
    FOR ALL USING (
        couple_id IN (
            SELECT couple_id FROM couple_members 
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Messages can be accessed by couple members
CREATE POLICY "Couple members can access messages" ON messages
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE couple_id IN (
                SELECT couple_id FROM couple_members 
                WHERE user_id = current_setting('app.current_user_id')::uuid
            )
        )
    );

-- Session feedback can be accessed by couple members
CREATE POLICY "Couple members can access feedback" ON session_feedback
    FOR ALL USING (
        session_id IN (
            SELECT id FROM sessions 
            WHERE couple_id IN (
                SELECT couple_id FROM couple_members 
                WHERE user_id = current_setting('app.current_user_id')::uuid
            )
        )
    );

-- Add comment for documentation
COMMENT ON POLICY "Users can view own data" ON users IS 'RLS policy ensuring users can only access their own data';
COMMENT ON POLICY "Couple members can access couple" ON couples IS 'RLS policy ensuring couple data is only accessible to members';

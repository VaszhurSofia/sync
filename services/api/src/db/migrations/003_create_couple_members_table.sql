-- Create couple_members table
CREATE TABLE couple_members (
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('userA', 'userB')),
    PRIMARY KEY (couple_id, user_id)
);

-- Ensure each couple has exactly 2 members
CREATE UNIQUE INDEX idx_couple_members_role ON couple_members(couple_id, role);

-- Add comment for documentation
COMMENT ON TABLE couple_members IS 'Junction table linking couples to their two members with roles';

-- Create invites table
CREATE TABLE invites (
    code VARCHAR(20) PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on couple_id for faster lookups
CREATE INDEX idx_invites_couple_id ON invites(couple_id);

-- Create index on expires_at for cleanup
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- Add comment for documentation
COMMENT ON TABLE invites IS 'Invitation codes for joining couples with expiration';

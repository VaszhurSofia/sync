-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('userA', 'userB', 'ai')),
    content_enc TEXT NOT NULL, -- AES-GCM encrypted message content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    safety_tags TEXT[] DEFAULT '{}',
    client_message_id UUID NOT NULL
);

-- Create unique constraint for idempotent message inserts
CREATE UNIQUE INDEX idx_messages_client_id ON messages(session_id, client_message_id);

-- Create index on session_id for faster lookups
CREATE INDEX idx_messages_session_id ON messages(session_id);

-- Create index on created_at for ordering
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Add comment for documentation
COMMENT ON TABLE messages IS 'Encrypted chat messages with safety tagging and idempotent inserts';
COMMENT ON COLUMN messages.content_enc IS 'AES-GCM encrypted message content - never store plaintext';
COMMENT ON COLUMN messages.safety_tags IS 'Array of safety tags for content filtering';
COMMENT ON COLUMN messages.client_message_id IS 'Client-generated UUID for idempotent message inserts';

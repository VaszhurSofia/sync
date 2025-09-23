-- Migration 011: Add encrypted VARBYTE columns for sensitive data
-- This migration adds encrypted columns for messages.content, users.display_name, and sessions.summary_text

-- Add encrypted columns to messages table
ALTER TABLE messages ADD COLUMN content_enc VARBYTE;

-- Add encrypted columns to users table  
ALTER TABLE users ADD COLUMN display_name_enc VARBYTE;

-- Add encrypted columns to sessions table
ALTER TABLE sessions ADD COLUMN summary_text_enc VARBYTE;

-- Create indexes for encrypted columns (for performance)
CREATE INDEX idx_messages_content_enc ON messages(content_enc);
CREATE INDEX idx_users_display_name_enc ON users(display_name_enc);
CREATE INDEX idx_sessions_summary_text_enc ON sessions(summary_text_enc);

-- Add comments for documentation
COMMENT ON COLUMN messages.content_enc IS 'AES-GCM encrypted message content';
COMMENT ON COLUMN users.display_name_enc IS 'AES-GCM encrypted user display name';
COMMENT ON COLUMN sessions.summary_text_enc IS 'AES-GCM encrypted session summary text';

-- Note: Existing data migration should be handled separately
-- This migration only adds the new encrypted columns

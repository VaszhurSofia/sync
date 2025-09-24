-- Migration 013: Add boundary audit table
-- This migration adds a table to track boundary violations and locks

-- Create boundary_audit table
CREATE TABLE boundary_audit (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    boundary_type VARCHAR(50) NOT NULL CHECK (boundary_type IN ('safety', 'content', 'behavioral')),
    trigger_reason TEXT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('boundary_lock', 'boundary_warn', 'boundary_clear')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_boundary_audit_session_id ON boundary_audit(session_id);
CREATE INDEX idx_boundary_audit_user_id ON boundary_audit(user_id);
CREATE INDEX idx_boundary_audit_created_at ON boundary_audit(created_at);
CREATE INDEX idx_boundary_audit_boundary_type ON boundary_audit(boundary_type);
CREATE INDEX idx_boundary_audit_action ON boundary_audit(action);

-- Create composite index for boundary lock queries
CREATE INDEX idx_boundary_audit_session_action_time ON boundary_audit(session_id, action, created_at);

-- Add foreign key constraints
ALTER TABLE boundary_audit 
ADD CONSTRAINT fk_boundary_audit_session 
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

ALTER TABLE boundary_audit 
ADD CONSTRAINT fk_boundary_audit_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE boundary_audit IS 'Audit log for boundary violations and locks';
COMMENT ON COLUMN boundary_audit.boundary_type IS 'Type of boundary violation: safety, content, or behavioral';
COMMENT ON COLUMN boundary_audit.trigger_reason IS 'Human-readable reason for the boundary violation';
COMMENT ON COLUMN boundary_audit.action IS 'Action taken: boundary_lock, boundary_warn, or boundary_clear';
COMMENT ON COLUMN boundary_audit.metadata IS 'Additional context data (no content fields)';

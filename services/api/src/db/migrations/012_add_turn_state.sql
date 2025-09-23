-- Migration 012: Add turn state machine to sessions table
-- This migration adds a turn_state enum to track conversation flow

-- Create enum for turn states
CREATE TYPE turn_state_enum AS ENUM (
    'awaitingA',    -- Waiting for user A to respond
    'awaitingB',    -- Waiting for user B to respond  
    'ai_reflect',   -- AI is processing/reflecting
    'boundary'      -- Session hit safety boundary
);

-- Add turn_state column to sessions table
ALTER TABLE sessions ADD COLUMN turn_state turn_state_enum DEFAULT 'awaitingA';

-- Add index for performance
CREATE INDEX idx_sessions_turn_state ON sessions(turn_state);

-- Add comment for documentation
COMMENT ON COLUMN sessions.turn_state IS 'Current state in the conversation turn-taking flow';

-- Update existing sessions to have default state
UPDATE sessions SET turn_state = 'awaitingA' WHERE turn_state IS NULL;

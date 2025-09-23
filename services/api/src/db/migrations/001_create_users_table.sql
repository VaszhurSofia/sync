-- Create users table with encrypted display name
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name_enc TEXT NOT NULL, -- AES-GCM encrypted display name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Add comment for documentation
COMMENT ON TABLE users IS 'User accounts with encrypted personal information';
COMMENT ON COLUMN users.display_name_enc IS 'AES-GCM encrypted display name - never store plaintext';

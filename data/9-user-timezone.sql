-- Add timezone column to users table
-- Stores IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')

ALTER TABLE users ADD COLUMN timezone VARCHAR(64) DEFAULT NULL;

-- Add profile fields to users table

ALTER TABLE users
ADD COLUMN bio TEXT,
ADD COLUMN photo_path VARCHAR(255);

-- Add location columns to users table for weather widget
-- Stores city name and coordinates for weather lookups

ALTER TABLE users ADD COLUMN city VARCHAR(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN latitude DECIMAL(9,6) DEFAULT NULL;
ALTER TABLE users ADD COLUMN longitude DECIMAL(9,6) DEFAULT NULL;

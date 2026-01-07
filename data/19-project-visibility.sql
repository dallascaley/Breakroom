-- Add is_public column to projects table
-- Default projects (Help Desk) are public, all others are private by default

ALTER TABLE projects ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Make existing default projects (Help Desk) public
UPDATE projects SET is_public = TRUE WHERE is_default = TRUE;

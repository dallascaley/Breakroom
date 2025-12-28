-- Migration: Add room ownership and create_room permission
-- Run this after 2-chat.sql

-- Add owner_id column to chat_rooms
ALTER TABLE chat_rooms
ADD COLUMN owner_id INT NULL,
ADD FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster owner lookups
CREATE INDEX idx_chat_rooms_owner_id ON chat_rooms(owner_id);

-- Add create_room permission
INSERT INTO permissions (name, description) VALUES
  ('create_room', 'Ability to create new chat rooms');

-- Grant create_room permission to Administrator group
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'create_room';

-- Grant create_room permission to Standard group
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Standard' AND p.name = 'create_room';

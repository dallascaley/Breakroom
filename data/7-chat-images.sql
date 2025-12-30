-- Add image_path column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN image_path VARCHAR(255) DEFAULT NULL;

-- Make message column nullable (image-only messages don't need text)
ALTER TABLE chat_messages MODIFY COLUMN message VARCHAR(1000) DEFAULT NULL;

-- Rollback: Drop notifications and events tables
-- Run this to undo the schema changes from commits f6ffe40 and b28c8a4

-- Disable foreign key checks temporarily for clean drops
SET FOREIGN_KEY_CHECKS = 0;

-- Drop events system tables
DROP TABLE IF EXISTS event_log;
DROP TABLE IF EXISTS event_rule_target_groups;
DROP TABLE IF EXISTS event_rule_target_users;
DROP TABLE IF EXISTS event_notification_rules;
DROP TABLE IF EXISTS events;

-- Drop notifications system tables
DROP TABLE IF EXISTS user_silenced_types;
DROP TABLE IF EXISTS user_notifications;
DROP TABLE IF EXISTS notification_groups;
DROP TABLE IF EXISTS notification_users;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_types;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Remove added permissions
DELETE FROM group_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE name IN (
    'create_notification', 'read_notification', 'update_notification', 'delete_notification',
    'create_event', 'read_event', 'update_event', 'delete_event', 'view_event_logs'
  )
);

DELETE FROM permissions WHERE name IN (
  'create_notification', 'read_notification', 'update_notification', 'delete_notification',
  'create_event', 'read_event', 'update_event', 'delete_event', 'view_event_logs'
);

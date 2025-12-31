-- Notifications System Schema
-- Supports system-wide and targeted notifications with user state tracking

-- Notification Types for categorization and silencing
CREATE TABLE IF NOT EXISTS notification_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_id INT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,

  -- Targeting: TRUE = all users, FALSE = use join tables
  target_all_users BOOLEAN DEFAULT FALSE,

  -- Display mode: simple = bell dropdown, modal = blocking popup
  display_mode ENUM('simple', 'modal') DEFAULT 'simple',

  -- Priority (higher = more important, used for ordering)
  priority INT DEFAULT 0,

  -- Scheduling
  publish_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Who created it
  created_by INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (type_id) REFERENCES notification_types(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_notifications_active (is_active, publish_at, expires_at),
  INDEX idx_notifications_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Target specific users (when target_all_users = FALSE)
CREATE TABLE IF NOT EXISTS notification_users (
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Target specific groups (when target_all_users = FALSE)
CREATE TABLE IF NOT EXISTS notification_groups (
  notification_id INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (notification_id, group_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-user notification state
CREATE TABLE IF NOT EXISTS user_notifications (
  user_id INT NOT NULL,
  notification_id INT NOT NULL,

  -- States: NULL = unread, timestamp = when read
  read_at TIMESTAMP NULL,

  -- Dismissed: user clicked X or acknowledged modal
  dismissed_at TIMESTAMP NULL,

  -- When the notification was delivered/shown to user
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, notification_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,

  INDEX idx_user_notifications_unread (user_id, read_at, dismissed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Silenced notification types per user
CREATE TABLE IF NOT EXISTS user_silenced_types (
  user_id INT NOT NULL,
  type_id INT NOT NULL,
  silenced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, type_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (type_id) REFERENCES notification_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default notification types
INSERT INTO notification_types (name, description) VALUES
  ('system', 'System announcements and updates'),
  ('maintenance', 'Scheduled maintenance notices'),
  ('feature', 'New feature announcements'),
  ('security', 'Security-related notifications'),
  ('personal', 'Personal notifications and reminders');

-- Add notification permissions
INSERT INTO permissions (name, description) VALUES
  ('create_notification', 'Ability to create notifications'),
  ('read_notification', 'Ability to view all notifications in admin'),
  ('update_notification', 'Ability to update notifications'),
  ('delete_notification', 'Ability to delete notifications');

-- Assign notification permissions to Administrator group
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'create_notification';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'read_notification';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'update_notification';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'delete_notification';

-- Alerting System Schema
-- Supports event-driven notifications with configurable display modes

-- Event types: defines what events can trigger notifications
CREATE TABLE IF NOT EXISTS event_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events: logs of events that occurred
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_id INT NOT NULL,
  time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INT,
  data_json TEXT,
  FOREIGN KEY (type_id) REFERENCES event_types(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_events_type (type_id),
  INDEX idx_events_user (user_id),
  INDEX idx_events_time (time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification types: notification definitions (templates)
CREATE TABLE IF NOT EXISTS notification_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(1000),
  display_type ENUM('header', 'popup') DEFAULT 'header',
  event_id INT,
  repeat_rule VARCHAR(32) DEFAULT 'forever',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES event_types(id) ON DELETE SET NULL,
  INDEX idx_notification_types_event (event_id),
  INDEX idx_notification_types_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification type groups: which groups receive this notification
CREATE TABLE IF NOT EXISTS notification_type_groups (
  notification_type_id INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (notification_type_id, group_id),
  FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications: per-user notification instances
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notif_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('unviewed', 'viewed', 'dismissed') DEFAULT 'unviewed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (notif_id) REFERENCES notification_types(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_status (user_id, status),
  INDEX idx_notifications_notif (notif_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed event types
INSERT INTO event_types (type, description) VALUES
  ('column_width_changed', 'Triggered when the browser window is resized causing the column layout to change');

-- Add notification permissions
INSERT INTO permissions (name, description) VALUES
  ('create_notification', 'Ability to create notification types'),
  ('read_notification', 'Ability to view all notification types in admin'),
  ('update_notification', 'Ability to update notification types'),
  ('delete_notification', 'Ability to delete notification types');

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

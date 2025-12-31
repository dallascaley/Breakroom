-- Events System Schema
-- Supports event-driven notifications with configurable rules and optional logging

-- Events table - defines available events in the system
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  category VARCHAR(64),

  -- Scope: who can receive notifications from this event
  -- 'user' = only triggering user, 'global' = all users, 'both' = configurable per rule
  scope ENUM('user', 'global', 'both') DEFAULT 'both',

  -- Logging configuration
  is_logged BOOLEAN DEFAULT FALSE,
  log_retention_days INT DEFAULT 30,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_events_code (code),
  INDEX idx_events_active (is_active),
  INDEX idx_events_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event notification rules - links events to notification actions
CREATE TABLE IF NOT EXISTS event_notification_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,

  -- Condition: JSON object for when to trigger
  -- e.g., {"from": {"$gte": 3}} or {"to": {"$lte": 2}}
  -- Supports: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $exists
  condition_json TEXT,

  -- Target mode for notifications
  -- 'triggering_user' = only user who triggered event
  -- 'all_users' = broadcast to everyone
  -- 'specific_users' = use event_rule_target_users table
  -- 'specific_groups' = use event_rule_target_groups table
  target_mode ENUM('triggering_user', 'all_users', 'specific_users', 'specific_groups') DEFAULT 'triggering_user',

  -- Notification content (supports placeholders like {{data.from}}, {{user.handle}})
  notification_title VARCHAR(255) NOT NULL,
  notification_content TEXT NOT NULL,
  notification_type_id INT,
  display_mode ENUM('simple', 'modal') DEFAULT 'simple',
  priority INT DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE SET NULL,

  INDEX idx_event_rules_event (event_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Target specific users for a rule
CREATE TABLE IF NOT EXISTS event_rule_target_users (
  rule_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (rule_id, user_id),
  FOREIGN KEY (rule_id) REFERENCES event_notification_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Target specific groups for a rule
CREATE TABLE IF NOT EXISTS event_rule_target_groups (
  rule_id INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (rule_id, group_id),
  FOREIGN KEY (rule_id) REFERENCES event_notification_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event log - stores event occurrences for analytics (when is_logged = TRUE)
CREATE TABLE IF NOT EXISTS event_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT,

  -- Event data as JSON
  data_json TEXT,

  -- IP and user agent for analytics
  ip_address VARCHAR(45),
  user_agent TEXT,

  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_event_log_event (event_id, triggered_at DESC),
  INDEX idx_event_log_user (user_id, triggered_at DESC),
  INDEX idx_event_log_time (triggered_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default events
INSERT INTO events (code, name, description, category, scope, is_logged) VALUES
  ('breakpoint_changed', 'Breakpoint Changed', 'Triggered when the responsive breakpoint changes', 'ui', 'user', TRUE),
  ('user_login', 'User Login', 'Triggered when a user logs in', 'auth', 'user', TRUE),
  ('user_logout', 'User Logout', 'Triggered when a user logs out', 'auth', 'user', TRUE),
  ('profile_updated', 'Profile Updated', 'Triggered when a user updates their profile', 'profile', 'user', FALSE),
  ('blog_post_created', 'Blog Post Created', 'Triggered when a new blog post is created', 'content', 'global', TRUE),
  ('friend_request_sent', 'Friend Request Sent', 'Triggered when a friend request is sent', 'social', 'user', FALSE),
  ('friend_request_accepted', 'Friend Request Accepted', 'Triggered when a friend request is accepted', 'social', 'user', FALSE);

-- Add event permissions
INSERT INTO permissions (name, description) VALUES
  ('create_event', 'Ability to create events'),
  ('read_event', 'Ability to view all events in admin'),
  ('update_event', 'Ability to update events'),
  ('delete_event', 'Ability to delete events'),
  ('view_event_logs', 'Ability to view event logs');

-- Assign event permissions to Administrator group
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'create_event';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'read_event';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'update_event';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'delete_event';

INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM `groups` g, permissions p
WHERE g.name = 'Administrator' AND p.name = 'view_event_logs';

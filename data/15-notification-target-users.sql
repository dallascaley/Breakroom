-- Notification Type Target Users
-- Stores individual targeting options for notifications

CREATE TABLE IF NOT EXISTS notification_type_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_type_id INT NOT NULL,
  target_type ENUM('trigger_user', 'trigger_user_friends') NOT NULL,
  UNIQUE KEY unique_target (notification_type_id, target_type),
  FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

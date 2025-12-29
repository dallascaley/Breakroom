-- MariaDB/MySQL schema for User-Room membership

-- Users-Rooms association table
CREATE TABLE users_rooms (
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  role ENUM('member', 'moderator') DEFAULT 'member',
  invited_by INT,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, room_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for faster lookups by room
CREATE INDEX idx_users_rooms_room_id ON users_rooms(room_id);

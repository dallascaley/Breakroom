-- User blog table
-- Stores information about a user's external blog

CREATE TABLE IF NOT EXISTS user_blog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  blog_url VARCHAR(500) NOT NULL,
  blog_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  UNIQUE INDEX idx_blog_url (blog_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

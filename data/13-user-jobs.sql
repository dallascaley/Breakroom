-- User jobs/employment history table
CREATE TABLE IF NOT EXISTS user_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  company VARCHAR(150) NOT NULL,
  location VARCHAR(150) DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for faster job lookups by user
CREATE INDEX idx_user_jobs_user_id ON user_jobs(user_id);

-- Index for ordering by start date
CREATE INDEX idx_user_jobs_start_date ON user_jobs(start_date DESC);

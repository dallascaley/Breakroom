-- Blog comments table
-- Stores comments on blog posts with support for threaded replies

CREATE TABLE IF NOT EXISTS blog_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blog_post_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT DEFAULT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES blog_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for fetching comments by post
CREATE INDEX idx_blog_comments_post_id ON blog_comments(blog_post_id);

-- Index for fetching comments by user
CREATE INDEX idx_blog_comments_user_id ON blog_comments(user_id);

-- Index for fetching replies to a comment
CREATE INDEX idx_blog_comments_parent_id ON blog_comments(parent_id);

-- Index for chronological ordering
CREATE INDEX idx_blog_comments_created_at ON blog_comments(created_at);

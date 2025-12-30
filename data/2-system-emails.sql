-- System emails table for storing email templates
-- MariaDB/MySQL schema

CREATE TABLE system_emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_key VARCHAR(64) UNIQUE NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert signup verification email template
-- Use {{verification_token}} as placeholder for the token
INSERT INTO system_emails (email_key, from_address, subject, html_content, description) VALUES
  ('signup_verification',
   'admin@prosaurus.com',
   'Please verify your email for prosaurus.com',
   '<h3>Thank you for registering a new account with prosaurus.com</h3>
<p>In order to complete your registration we will need to verify your email address. You can do that by clicking <a href=''https://prosaurus.com/verify?token={{verification_token}}''>here</a>.</p>',
   'Email sent to new users to verify their email address');

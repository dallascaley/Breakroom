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
   '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Prosaurus</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">The Future of Social Networking</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333333; margin: 0 0 20px; font-size: 22px;">Thank You for Joining!</h2>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We''''re excited to have you on board. Prosaurus is built on a simple promise:
                <strong>a social network that puts people first</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #667eea; font-size: 18px; margin-right: 10px;">&#10003;</span>
                    <span style="color: #333; font-size: 15px;"><strong>No Advertising</strong> &mdash; Ever. Your feed is yours.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #667eea; font-size: 18px; margin-right: 10px;">&#10003;</span>
                    <span style="color: #333; font-size: 15px;"><strong>No Bots</strong> &mdash; Real people, real connections.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #667eea; font-size: 18px; margin-right: 10px;">&#10003;</span>
                    <span style="color: #333; font-size: 15px;"><strong>No Algorithms</strong> &mdash; See posts in order, not by engagement tricks.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #667eea; font-size: 18px; margin-right: 10px;">&#10003;</span>
                    <span style="color: #333; font-size: 15px;"><strong>Your Privacy</strong> &mdash; We don''''t sell your data. Period.</span>
                  </td>
                </tr>
              </table>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                To complete your registration and start connecting, please verify your email address:
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="https://prosaurus.com/verify?token={{verification_token}}"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 0;">
                If the button doesn''''t work, copy and paste this link into your browser:<br>
                <a href="https://prosaurus.com/verify?token={{verification_token}}" style="color: #667eea; word-break: break-all;">
                  https://prosaurus.com/verify?token={{verification_token}}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 13px; margin: 0;">
                This link will expire in 1 hour for your security.
              </p>
              <p style="color: #aaaaaa; font-size: 12px; margin: 15px 0 0;">
                &copy; 2025 Prosaurus. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
   'Email sent to new users to verify their email address');

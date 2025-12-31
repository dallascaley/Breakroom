const express = require('express');
const router = express.Router();

const { getClient } = require('../utilities/db');
const { sendMail } = require('../utilities/aws-ses-email');

const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV;

// Define authentication-related routes
router.post('/signup', async (req, res) => {
  const client = await getClient();

  const existingUser = await client.query('SELECT * FROM "users" WHERE handle = $1 OR email = $2;', [req.body.handle, req.body.email]);

  if (existingUser.rowCount === 0) {
    const verificationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const result = await client.query(`INSERT INTO
      "users" (handle, first_name, last_name, email, verification_token, verification_expires_at, hash, salt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`, [
        req.body.handle,
        req.body.first_name,
        req.body.last_name,
        req.body.email,
        verificationToken,
        expiresAt,
        req.body.hash,
        req.body.salt
      ]);

    // Assign new user to Standard group
    const newUserId = result.insertId;
    const standardGroup = await client.query('SELECT id FROM "groups" WHERE name = $1', ['Standard']);
    if (standardGroup.rowCount > 0) {
      await client.query('INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)', [newUserId, standardGroup.rows[0].id]);
    }

    // Create default breakroom blocks for new user
    // Find the General chat room
    const generalRoom = await client.query('SELECT id FROM chat_rooms WHERE name = $1', ['General']);
    const generalRoomId = generalRoom.rowCount > 0 ? generalRoom.rows[0].id : null;

    const defaultBlocks = [
      // Top row: Chat, Blog, Weather
      { block_type: 'chat', content_id: generalRoomId, x: 0, y: 0, w: 2, h: 2, title: null },
      { block_type: 'blog', content_id: null, x: 2, y: 0, w: 2, h: 2, title: null },
      { block_type: 'weather', content_id: null, x: 4, y: 0, w: 1, h: 2, title: null },
      // Second row: Calendar, News, Updates
      { block_type: 'calendar', content_id: null, x: 0, y: 2, w: 1, h: 2, title: null },
      { block_type: 'news', content_id: null, x: 1, y: 2, w: 2, h: 2, title: null },
      { block_type: 'updates', content_id: null, x: 3, y: 2, w: 2, h: 2, title: null }
    ];

    for (const block of defaultBlocks) {
      await client.query(
        `INSERT INTO breakroom_blocks (user_id, block_type, content_id, x, y, w, h, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newUserId, block.block_type, block.content_id, block.x, block.y, block.w, block.h, block.title]
      );
    }

    // Auto-login: set JWT cookie
    const payload = { username: req.body.handle };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
    res.cookie('jwtToken', token, {
      maxAge: 3600000, // 1 hour
      domain: process.env.NODE_ENV === 'production' ? '.prosaurus.com' : undefined,
    });

    // Fetch email template from database
    const emailTemplate = await client.query(
      'SELECT from_address, subject, html_content FROM system_emails WHERE email_key = $1 AND is_active = true',
      ['signup_verification']
    );

    if (emailTemplate.rowCount > 0) {
      const { from_address, subject, html_content } = emailTemplate.rows[0];
      // Replace placeholder with actual verification token
      const processedContent = html_content.replace(/\{\{verification_token\}\}/g, verificationToken);
      sendMail(req.body.email, from_address, subject, processedContent);
    }

    client.release();

    res.status(201).json({
      message: 'User has been created'
    });
  } else {
    client.release();

    res.status(409).json({
      message: 'User already exists with the provided handle or email.'
    });
  }
});

router.post('/verify', async (req, res) => {
  const client = await getClient();
  const now = new Date();

  const verifyUser = await client.query('SELECT * FROM "users" WHERE verification_token = $1 AND verification_expires_at > $2', [req.body.token, now]);

  if (verifyUser.rowCount === 1) {
    const userId = verifyUser.rows[0].id;
    await client.query('UPDATE "users" SET email_verified = $1 WHERE id = $2', [true, userId]);

    client.release();

    res.status(200).json({
      message: 'Email address verified'
    });
  } else {

    client.release();

    res.status(400).json({
      message: 'Unsuccessful verification of email address'
    });
  }
});

function hashPasswordWithSalt(password, salt) {
  return new Promise((resolve, reject) => {
    const encoder = new TextEncoder();
    const passwordSalt = encoder.encode(password + salt); // Combine password and salt into one string

    // Hash the combined password and salt using SHA-256
    crypto.subtle.digest('SHA-256', passwordSalt).then(function(hashBuffer) {
      const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to array
      const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); // Convert to hex string
      resolve(hashHex); // Resolve the promise with the hashed value
    }).catch(function(error) {
      reject(error); // Reject the promise if there's an error
    });
  });
}

router.post('/login', async (req, res) => {
  console.log('Login route HIT');
  let client;
  try {
    console.log('Parsing body...');
    console.log('Request body:', req.body);

    client = await getClient();
    console.log('Connected to DB');

    const user = await client.query('SELECT * FROM "users" WHERE handle = $1', [req.body.handle]);

    if (user.rowCount === 1) {
      // User has been located
      const hash = await hashPasswordWithSalt(req.body.password, user.rows[0].salt);
      if (hash === user.rows[0].hash) {

        const payload = { username: req.body.handle };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

        client.release();

        res.cookie('jwtToken', token, {
          maxAge: 3600000, // 1 hour
          domain: process.env.NODE_ENV === 'production' ? '.prosaurus.com' : undefined,
        });
        res.json({ message: 'Logged in successfully' });
      } else {
        client.release();

        res.status(400).json({
          message: 'Unable to login'
        });
      }
    } else {
      client.release();

      res.status(400).json({
        message: 'Unable to login'
      });
    }
  } catch (err) {
    if (client) client.release();

    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});

router.get('/me', async (req, res) => {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);

    // Fetch user ID from database
    const client = await getClient();
    const user = await client.query(
      'SELECT id FROM users WHERE handle = $1',
      [payload.username]
    );
    client.release();

    if (user.rowCount === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    return res.json({
      username: payload.username,
      userId: user.rows[0].id
    });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// Check if user has a specific permission
router.get('/can/:permission', async (req, res) => {
  console.log('Permission check for:', req.params.permission);
  const token = req.cookies.jwtToken;
  const { permission } = req.params;

  if (!token) {
    return res.json({ has_permission: false });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);

    const client = await getClient();
    const user = await client.query('SELECT id FROM users WHERE handle = $1', [payload.username]);

    if (user.rowCount === 0) {
      client.release();
      return res.json({ has_permission: false });
    }

    const userId = user.rows[0].id;

    // Check permission via user_permissions or group_permissions
    const result = await client.query(`
      SELECT 1 FROM permissions p
      WHERE p.name = $1 AND p.is_active = true AND (
        EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.permission_id = p.id AND up.user_id = $2
        )
        OR EXISTS (
          SELECT 1 FROM group_permissions gp
          JOIN user_groups ug ON ug.group_id = gp.group_id
          WHERE gp.permission_id = p.id AND ug.user_id = $3
        )
      )
    `, [permission, userId, userId]);

    client.release();
    console.log('Permission result for', permission, ':', result.rowCount > 0);
    res.json({ has_permission: result.rowCount > 0 });
  } catch (err) {
    console.error('Permission check error:', err);
    res.json({ has_permission: false });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('jwtToken', {
    domain: process.env.NODE_ENV === 'production' ? '.prosaurus.com' : undefined
  });

  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
const express = require('express');
const router = express.Router();

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { sendMail } = require('../utilities/sendgrid-email');

const { getClient } = require('../utilities/db');

require('dotenv').config();

// Define authentication-related routes
router.get('/all', async (req, res) => {
  const client = await getClient();

  const users = await client.query('SELECT id, handle, first_name, last_name, email FROM "user_auth";');

  client.release();

  res.status(200).json({
      message: 'Users retrieved',
      users: users
    });
});

router.post('/invite', async (req, res) => {
  console.log('Request');
  console.log(req);
  
  const { handle, email, first_name, last_name } = req.body;

  if (!handle || !email || !first_name || !last_name) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const client = await getClient();

  const existingUser = await client.query(
    'SELECT id FROM "user_auth" WHERE handle = $1 OR email = $2;',
    [handle, email]
  );

  if (existingUser.rowCount > 0) {
    client.release();
    return res.status(409).json({
      message: 'User already exists with the provided handle or email.'
    });
  }

  const randomPassword = crypto.randomBytes(12).toString('base64'); // Temporary random password
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(randomPassword + salt).digest('hex');

  const verificationToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await client.query(
    `INSERT INTO "user_auth" 
      (handle, first_name, last_name, email, verification_token, verification_expires_at, hash, salt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
    [handle, first_name, last_name, email, verificationToken, expiresAt, hash, salt]
  );

  // Send invitation email
  await sendMail(
    email,
    'admin@prosaurus.com',
    'You’ve been invited to join prosaurus.com',
    `
    <h3>Welcome to Prosaurus!</h3>
    <p>You’ve been invited to join our platform. To activate your account and choose a password, please click the link below:</p>
    <p><a href="https://prosaurus.com/verify?token=${verificationToken}">Complete Your Registration</a></p>
    <p>This link will expire in 1 hour.</p>
    `
  );

  client.release();
  
  res.status(201).json({ message: 'Invitation sent to user.' });
});

module.exports = router;
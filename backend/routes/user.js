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
  try {
    console.log('Fetching all users...');
    const users = await client.query(
      'SELECT id, handle, first_name, last_name, email FROM "user_auth";'
    );

    res.status(200).json({
      message: 'Users retrieved',
      users: users.rows,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to retrieve users' });
  } finally {
    client.release();
  }
});


router.post('/invite', async (req, res) => {
  console.log('Request');
  //console.log(req);
  
  const { handle, email, first_name, last_name } = req.body;

  if (!handle || !email || !first_name || !last_name) {
    return res.status(400).json({ 
      message: 'Missing required fields.' 
    });
  }
  console.log(`Creating user ${handle} with email ${email}. ${first_name}, ${last_name}`);
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

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { handle, first_name, last_name, email } = req.body;

  if (!handle || !first_name || !last_name || !email) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const client = await getClient();
  try {
    // Check for duplicate handle or email (excluding current user)
    const existing = await client.query(
      'SELECT id FROM "user_auth" WHERE (handle = $1 OR email = $2) AND id != $3;',
      [handle, email, id]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        message: 'Another user with this handle or email already exists.',
      });
    }

    const result = await client.query(
      `UPDATE "user_auth"
       SET handle = $1, first_name = $2, last_name = $3, email = $4
       WHERE id = $5
       RETURNING id, handle, first_name, last_name, email;`,
      [handle, first_name, last_name, email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user.' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      'DELETE FROM "user_auth" WHERE id = $1 RETURNING id;',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user.' });
  } finally {
    client.release();
  }
});


module.exports = router;
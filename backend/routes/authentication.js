const express = require('express');
const router = express.Router();

const { getClient } = require('../utilities/db');
const { sendMail } = require('../utilities/sendgrid-email');

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

    sendMail(req.body.email, 'admin@prosaurus.com', 
      'Please verify your email for prosaurus.com', 
      `<h3>Thank you for registering a new account with prosuarus.com</h3>
       <p>In order to complete your registration we will need to verify
          your email address.  You can do that by clicking 
          <a href='https://prosaurus.com/verify?token=${verificationToken}'>here</a>.
       </p>`
    );

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
  try {
    console.log('Parsing body...');
    console.log('Request body:', req.body);

    const client = await getClient();
    console.log('Connected to DB');
  
    const user = await client.query('SELECT * FROM "users" WHERE handle = $1', [req.body.handle]);

    if (user.rowCount === 1) {
      // User has been located
      const hash = await hashPasswordWithSalt(req.body.password, user.rows[0].salt);
      if (hash === user.rows[0].hash) {

        const payload = { username: req.body.handle };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

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
    client.release();
    
    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    return res.json({ username: payload.username });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('jwtToken', {
    domain: process.env.NODE_ENV === 'production' ? '.prosaurus.com' : undefined
  });

  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
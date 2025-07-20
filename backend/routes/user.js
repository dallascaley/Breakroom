const express = require('express');
const router = express.Router();

const { getClient } = require('../utilities/db');

require('dotenv').config();

// Define authentication-related routes
router.get('/all', async (req, res) => {
  const client = await getClient();

  const users = await client.query('SELECT id, handle, first_name, last_name, email FROM "user_auth";');

  res.status(200).json({
      message: 'Users retrieved',
      users: users
    });
});


module.exports = router;
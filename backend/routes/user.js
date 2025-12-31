const express = require('express');
const router = express.Router();

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { sendMail } = require('../utilities/sendgrid-email');

const { getClient } = require('../utilities/db');

require('dotenv').config();

router.get('/all', async (req, res) => {
  const client = await getClient();
  try {
    console.log('Fetching all users...');
    const users = await client.query(
      `SELECT 
         id, handle, first_name, last_name, email 
      FROM "users"
      ORDER BY id;`
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
    'SELECT id FROM "users" WHERE handle = $1 OR email = $2;',
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
    `INSERT INTO "users" 
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
  const { user, permissions, groups } = req.body;

  // make sure the basic fields are available
  if (!user.handle || !user.first_name || !user.last_name || !user.email) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const client = await getClient();
  try {
    // Check for duplicate handle or email (excluding current user)
    const existing = await client.query(
      'SELECT id FROM "users" WHERE (handle = $1 OR email = $2) AND id != $3;',
      [user.handle, user.email, id]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        message: 'Another user with this handle or email already exists.',
      });
    }

    // Begin the transactional part of the process
    await client.beginTransaction();

    const searchResult = await client.query(
      `UPDATE users SET 
        handle = $1,
        first_name = $2,
        last_name = $3,
        email = $4
      WHERE id = $5`,
      [user.handle, user.first_name, user.last_name, user.email, id]
    );

    // make sure there is even a user to update
    if (searchResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Clear current permissions
    await client.query(
      `DELETE FROM user_permissions WHERE user_id = $1`,
      [id]
    );

    // Insert new ones
    const filteredPermissions = permissions.filter(p => p.has_permission);
    if (filteredPermissions.length > 0) {
      // this is some complicated bullshit to prevent sql injection, trust the robot bro, it works...
      const values = filteredPermissions
        .map((_, i) => `($1, $${i + 2})`)
        .join(',');

      const params = [id, ...filteredPermissions.map(p => p.permission_id)];

      await client.query(
        `INSERT INTO user_permissions (user_id, permission_id) VALUES ${values}`,
        params
      );
    }

    // Clear current groups
    await client.query(
      `DELETE FROM user_groups WHERE user_id = $1`,
      [id]
    );

    // Insert new ones
    const filteredGroups = groups.filter(p => p.has_group);
    if (filteredGroups.length > 0) {
      // more bs, one day you should examine this to actually understand it...
      const values = filteredGroups
        .map((_, i) => `($1, $${i + 2})`)
        .join(',');

      const params = [id, ...filteredGroups.map(p => p.group_id)];

      await client.query(
        `INSERT INTO user_groups (user_id, group_id) VALUES ${values}`,
        params
      );
    }

    await client.commit();

    // Return updated user (optionally with fresh data if needed)
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    await client.rollback();
    console.error('Error updating user', err);
    res.status(500).json({ message: 'Failed to update user' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
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

router.get('/permissionMatrix/:id', async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    console.log('Fetching all user related permission data');
    const permissionsResult = await client.query(
      `SELECT 
        p.id, p.name, p.description, p.is_active,
        CASE 
          WHEN up.user_id IS NOT NULL THEN true
          ELSE false 
        END AS has_permission
      FROM permissions p
      LEFT JOIN user_permissions up
        ON p.id = up.permission_id
        AND up.user_id = $1
      WHERE up.user_id = $1
        OR up.user_id IS NULL;`,
      [id]
    );

    console.log('Fetching all group data');
    const groupsResult = await client.query(
      `SELECT 
        g.id, g.name, g.description, g.is_active,
        CASE
          WHEN ug.user_id IS NOT NULL THEN true
          ELSE false
        END AS has_group
      FROM groups g
      LEFT JOIN user_groups ug
        ON g.id = ug.group_id
        AND ug.user_id = $1
      WHERE ug.user_id = $1
        OR ug.user_id IS NULL
      ORDER BY g.id;`,
      [id]
    );

    const groups = groupsResult.rows;

    console.log('Fetching group_permissions for each group');

    for (const group of groups) {
      const groupPermissionsResult = await client.query(
        'SELECT permission_id FROM group_permissions WHERE group_id = $1',
        [group.id]
      );

      group.group_permissions = groupPermissionsResult.rows.map(row => row.permission_id);
    }

    res.status(200).json({
      message: 'Permission matrix retrieved',
      permissions: permissionsResult.rows,
      groups: groups
    });

  } catch (err) {
    console.error('Error fetching permission matrix', err);
    res.status(500).json({ message: 'Failed to retrieve permission matrix' });
  } finally {
    client.release();
  }
});



module.exports = router;
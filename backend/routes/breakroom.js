const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');

require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Middleware to verify JWT and get user info
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);

    const client = await getClient();
    const user = await client.query('SELECT id, handle FROM users WHERE handle = $1', [payload.username]);
    client.release();

    if (user.rowCount === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.rows[0].id,
      handle: user.rows[0].handle
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get current user's layout blocks
router.get('/layout', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    const blocks = await client.query(
      `SELECT b.id, b.block_type, b.content_id, b.x, b.y, b.w, b.h, b.title, b.settings,
              cr.name as content_name
       FROM breakroom_blocks b
       LEFT JOIN chat_rooms cr ON b.block_type = 'chat' AND b.content_id = cr.id
       WHERE b.user_id = $1
       ORDER BY b.y, b.x`,
      [req.user.id]
    );

    res.status(200).json({ blocks: blocks.rows });
  } catch (err) {
    console.error('Error fetching layout:', err);
    res.status(500).json({ message: 'Failed to fetch layout' });
  } finally {
    client.release();
  }
});

// Add a new block
router.post('/blocks', authenticateToken, async (req, res) => {
  const { block_type, content_id, x, y, w, h, title, settings } = req.body;

  if (!block_type) {
    return res.status(400).json({ message: 'Block type is required' });
  }

  const client = await getClient();
  try {
    const result = await client.query(
      `INSERT INTO breakroom_blocks (user_id, block_type, content_id, x, y, w, h, title, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.id,
        block_type,
        content_id || null,
        x || 0,
        y || 0,
        w || 1,
        h || 1,
        title || null,
        settings ? JSON.stringify(settings) : null
      ]
    );

    // Fetch the created block with content info
    const newBlock = await client.query(
      `SELECT b.id, b.block_type, b.content_id, b.x, b.y, b.w, b.h, b.title, b.settings,
              cr.name as content_name
       FROM breakroom_blocks b
       LEFT JOIN chat_rooms cr ON b.block_type = 'chat' AND b.content_id = cr.id
       WHERE b.id = $1`,
      [result.insertId]
    );

    res.status(201).json({ block: newBlock.rows[0] });
  } catch (err) {
    console.error('Error creating block:', err);
    res.status(500).json({ message: 'Failed to create block' });
  } finally {
    client.release();
  }
});

// Update a single block
router.put('/blocks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { x, y, w, h, title, settings, content_id } = req.body;

  const client = await getClient();
  try {
    // Verify block belongs to user
    const block = await client.query(
      'SELECT id FROM breakroom_blocks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (block.rowCount === 0) {
      return res.status(404).json({ message: 'Block not found' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (x !== undefined) { updates.push(`x = $${paramIndex++}`); values.push(x); }
    if (y !== undefined) { updates.push(`y = $${paramIndex++}`); values.push(y); }
    if (w !== undefined) { updates.push(`w = $${paramIndex++}`); values.push(w); }
    if (h !== undefined) { updates.push(`h = $${paramIndex++}`); values.push(h); }
    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    if (settings !== undefined) { updates.push(`settings = $${paramIndex++}`); values.push(JSON.stringify(settings)); }
    if (content_id !== undefined) { updates.push(`content_id = $${paramIndex++}`); values.push(content_id); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    values.push(id);
    await client.query(
      `UPDATE breakroom_blocks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Fetch updated block
    const updated = await client.query(
      `SELECT b.id, b.block_type, b.content_id, b.x, b.y, b.w, b.h, b.title, b.settings,
              cr.name as content_name
       FROM breakroom_blocks b
       LEFT JOIN chat_rooms cr ON b.block_type = 'chat' AND b.content_id = cr.id
       WHERE b.id = $1`,
      [id]
    );

    res.status(200).json({ block: updated.rows[0] });
  } catch (err) {
    console.error('Error updating block:', err);
    res.status(500).json({ message: 'Failed to update block' });
  } finally {
    client.release();
  }
});

// Batch update layout (for drag-drop save)
router.put('/layout', authenticateToken, async (req, res) => {
  const { blocks } = req.body;

  if (!Array.isArray(blocks)) {
    return res.status(400).json({ message: 'Blocks array is required' });
  }

  const client = await getClient();
  try {
    await client.beginTransaction();

    for (const block of blocks) {
      if (!block.id) continue;

      await client.query(
        `UPDATE breakroom_blocks SET x = $1, y = $2, w = $3, h = $4
         WHERE id = $5 AND user_id = $6`,
        [block.x, block.y, block.w, block.h, block.id, req.user.id]
      );
    }

    await client.commit();
    res.status(200).json({ message: 'Layout saved' });
  } catch (err) {
    await client.rollback();
    console.error('Error saving layout:', err);
    res.status(500).json({ message: 'Failed to save layout' });
  } finally {
    client.release();
  }
});

// Delete a block
router.delete('/blocks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const client = await getClient();
  try {
    const result = await client.query(
      'DELETE FROM breakroom_blocks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Block not found' });
    }

    res.status(200).json({ message: 'Block deleted' });
  } catch (err) {
    console.error('Error deleting block:', err);
    res.status(500).json({ message: 'Failed to delete block' });
  } finally {
    client.release();
  }
});

module.exports = router;

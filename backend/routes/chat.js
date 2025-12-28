const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getClient } = require('../utilities/db');
const { checkPermission } = require('../middleware/checkPermission');

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

    // Get user ID from database
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

// Get all chat rooms
router.get('/rooms', authenticateToken, async (req, res) => {
  const client = await getClient();
  try {
    const rooms = await client.query(
      `SELECT cr.id, cr.name, cr.description, cr.is_active, cr.created_at,
              cr.owner_id, u.handle as owner_handle
       FROM chat_rooms cr
       LEFT JOIN users u ON cr.owner_id = u.id
       WHERE cr.is_active = true
       ORDER BY cr.name`
    );

    res.status(200).json({
      rooms: rooms.rows
    });
  } catch (err) {
    console.error('Error fetching chat rooms:', err);
    res.status(500).json({ message: 'Failed to retrieve chat rooms' });
  } finally {
    client.release();
  }
});

// Get messages for a room (with pagination)
router.get('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, before } = req.query; // before is a message ID for pagination

  const client = await getClient();
  try {
    let query;
    let params;

    if (before) {
      // Get messages before a specific message ID (for loading older messages)
      query = `
        SELECT
          m.id, m.message, m.created_at,
          u.id as user_id, u.handle
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1 AND m.id < $2
        ORDER BY m.created_at DESC
        LIMIT $3
      `;
      params = [roomId, before, parseInt(limit)];
    } else {
      // Get most recent messages
      query = `
        SELECT
          m.id, m.message, m.created_at,
          u.id as user_id, u.handle
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2
      `;
      params = [roomId, parseInt(limit)];
    }

    const messages = await client.query(query, params);

    // Reverse to get chronological order
    res.status(200).json({
      messages: messages.rows.reverse()
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Failed to retrieve messages' });
  } finally {
    client.release();
  }
});

// Send a message to a room (REST fallback when socket not available)
router.post('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ message: 'Message cannot exceed 1000 characters' });
  }

  const client = await getClient();
  try {
    // Verify room exists
    const room = await client.query('SELECT id FROM chat_rooms WHERE id = $1 AND is_active = true', [roomId]);
    if (room.rowCount === 0) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Insert message
    const result = await client.query(
      'INSERT INTO chat_messages (room_id, user_id, message) VALUES ($1, $2, $3)',
      [roomId, req.user.id, message.trim()]
    );

    // Get the inserted message with user info
    const newMessage = await client.query(
      `SELECT
        m.id, m.message, m.created_at,
        u.id as user_id, u.handle
      FROM chat_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1`,
      [result.insertId]
    );

    res.status(201).json({
      message: newMessage.rows[0]
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to send message' });
  } finally {
    client.release();
  }
});

// Create a new chat room
router.post('/rooms', authenticateToken, checkPermission('create_room'), async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Room name is required' });
  }

  if (name.length > 64) {
    return res.status(400).json({ message: 'Room name cannot exceed 64 characters' });
  }

  const client = await getClient();
  try {
    // Check for duplicate room name
    const existing = await client.query(
      'SELECT id FROM chat_rooms WHERE name = $1',
      [name.trim()]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'A room with this name already exists' });
    }

    // Insert the new room
    const result = await client.query(
      'INSERT INTO chat_rooms (name, description, owner_id) VALUES ($1, $2, $3)',
      [name.trim(), description?.trim() || null, req.user.id]
    );

    // Fetch the created room
    const newRoom = await client.query(
      `SELECT cr.id, cr.name, cr.description, cr.is_active, cr.created_at,
              cr.owner_id, u.handle as owner_handle
       FROM chat_rooms cr
       LEFT JOIN users u ON cr.owner_id = u.id
       WHERE cr.id = $1`,
      [result.insertId]
    );

    res.status(201).json({ room: newRoom.rows[0] });
  } catch (err) {
    console.error('Error creating chat room:', err);
    res.status(500).json({ message: 'Failed to create chat room' });
  } finally {
    client.release();
  }
});

// Update a chat room (owner only)
router.put('/rooms/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Room name is required' });
  }

  if (name.length > 64) {
    return res.status(400).json({ message: 'Room name cannot exceed 64 characters' });
  }

  const client = await getClient();
  try {
    // Verify room exists and check ownership
    const room = await client.query(
      'SELECT owner_id FROM chat_rooms WHERE id = $1 AND is_active = true',
      [id]
    );

    if (room.rowCount === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the room owner can edit this room' });
    }

    // Check for duplicate name (excluding current room)
    const existing = await client.query(
      'SELECT id FROM chat_rooms WHERE name = $1 AND id != $2',
      [name.trim(), id]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'A room with this name already exists' });
    }

    // Update the room
    await client.query(
      'UPDATE chat_rooms SET name = $1, description = $2 WHERE id = $3',
      [name.trim(), description?.trim() || null, id]
    );

    // Fetch updated room
    const updated = await client.query(
      `SELECT cr.id, cr.name, cr.description, cr.is_active, cr.created_at,
              cr.owner_id, u.handle as owner_handle
       FROM chat_rooms cr
       LEFT JOIN users u ON cr.owner_id = u.id
       WHERE cr.id = $1`,
      [id]
    );

    res.status(200).json({ room: updated.rows[0] });
  } catch (err) {
    console.error('Error updating chat room:', err);
    res.status(500).json({ message: 'Failed to update chat room' });
  } finally {
    client.release();
  }
});

// Delete a chat room (owner only, soft delete)
router.delete('/rooms/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const client = await getClient();
  try {
    // Verify room exists and check ownership
    const room = await client.query(
      'SELECT owner_id, name FROM chat_rooms WHERE id = $1 AND is_active = true',
      [id]
    );

    if (room.rowCount === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Prevent deletion of General room (owner_id is null)
    if (room.rows[0].owner_id === null) {
      return res.status(403).json({ message: 'The General room cannot be deleted' });
    }

    if (room.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Only the room owner can delete this room' });
    }

    // Soft delete (set is_active = false)
    await client.query(
      'UPDATE chat_rooms SET is_active = false WHERE id = $1',
      [id]
    );

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Error deleting chat room:', err);
    res.status(500).json({ message: 'Failed to delete chat room' });
  } finally {
    client.release();
  }
});

module.exports = router;

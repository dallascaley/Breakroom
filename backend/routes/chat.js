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
      'SELECT id, name, description, is_active, created_at FROM chat_rooms WHERE is_active = true ORDER BY name'
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

module.exports = router;

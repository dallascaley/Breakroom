const jwt = require('jsonwebtoken');
const { getClient } = require('./db');

require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Store socket connections by user ID
const userSockets = new Map();

const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('jwtToken=')[1]?.split(';')[0];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, SECRET_KEY);

      // Get user from database
      const client = await getClient();
      const user = await client.query('SELECT id, handle FROM users WHERE handle = $1', [payload.username]);
      client.release();

      if (user.rowCount === 0) {
        return next(new Error('User not found'));
      }

      socket.user = {
        id: user.rows[0].id,
        handle: user.rows[0].handle
      };

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.handle} (socket: ${socket.id})`);

    // Store socket reference
    userSockets.set(socket.user.id, socket);

    // Join a chat room
    socket.on('join_room', async (roomId) => {
      const client = await getClient();
      try {
        // Verify room exists
        const room = await client.query('SELECT id, name FROM chat_rooms WHERE id = $1 AND is_active = true', [roomId]);
        if (room.rowCount === 0) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        socket.join(`room_${roomId}`);
        console.log(`${socket.user.handle} joined room ${room.rows[0].name}`);

        // Notify room that user joined
        socket.to(`room_${roomId}`).emit('user_joined', {
          user: socket.user.handle,
          roomId: roomId
        });
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('error', { message: 'Failed to join room' });
      } finally {
        client.release();
      }
    });

    // Leave a chat room
    socket.on('leave_room', (roomId) => {
      socket.leave(`room_${roomId}`);
      console.log(`${socket.user.handle} left room ${roomId}`);

      // Notify room that user left
      socket.to(`room_${roomId}`).emit('user_left', {
        user: socket.user.handle,
        roomId: roomId
      });
    });

    // Send a message
    socket.on('send_message', async (data) => {
      console.log('Received send_message from', socket.user.handle, ':', data);
      const { roomId, message } = data;

      if (!message || message.trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      if (message.length > 1000) {
        socket.emit('error', { message: 'Message cannot exceed 1000 characters' });
        return;
      }

      const client = await getClient();
      try {
        // Verify room exists
        const room = await client.query('SELECT id FROM chat_rooms WHERE id = $1 AND is_active = true', [roomId]);
        if (room.rowCount === 0) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        // Insert message
        const result = await client.query(
          'INSERT INTO chat_messages (room_id, user_id, message) VALUES ($1, $2, $3)',
          [roomId, socket.user.id, message.trim()]
        );

        // Get the inserted message
        const newMessage = await client.query(
          `SELECT
            m.id, m.message, m.created_at,
            u.id as user_id, u.handle
          FROM chat_messages m
          JOIN users u ON m.user_id = u.id
          WHERE m.id = $1`,
          [result.insertId]
        );

        const messageData = newMessage.rows[0];

        // Broadcast message to everyone in the room (including sender)
        const socketsInRoom = io.sockets.adapter.rooms.get(`room_${roomId}`);
        console.log('Broadcasting new_message to room_' + roomId, 'sockets in room:', socketsInRoom ? [...socketsInRoom] : 'none', messageData);
        io.to(`room_${roomId}`).emit('new_message', {
          roomId: roomId,
          message: messageData
        });

        // Also emit directly to sender as backup
        socket.emit('new_message', {
          roomId: roomId,
          message: messageData
        });
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      } finally {
        client.release();
      }
    });

    // Typing indicator
    socket.on('typing_start', (roomId) => {
      socket.to(`room_${roomId}`).emit('user_typing', {
        user: socket.user.handle,
        roomId: roomId
      });
    });

    socket.on('typing_stop', (roomId) => {
      socket.to(`room_${roomId}`).emit('user_stopped_typing', {
        user: socket.user.handle,
        roomId: roomId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.handle}`);
      userSockets.delete(socket.user.id);
    });
  });
};

module.exports = { initializeSocket, userSockets };

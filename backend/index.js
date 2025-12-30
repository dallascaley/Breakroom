require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createRedisClients } = require('./utilities/redis');

const app = express();
const server = http.createServer(app);
const port = 3000;

// Set up Socket.IO - allow multiple origins
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'https://prosaurus.com',
  'https://www.prosaurus.com'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Initialize Socket.IO with Redis adapter
(async () => {
  try {
    const { pubClient, subClient } = await createRedisClients();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis adapter initialized');
  } catch (err) {
    console.error('Redis adapter failed, using in-memory:', err.message);
  }

  const { initializeSocket } = require('./utilities/socket');
  initializeSocket(io);
})();

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


app.set('view engine', 'ejs');

const authentication = require('./routes/authentication');
const user = require('./routes/user');
const permissionRoutes = require('./routes/permission');
const groupRoutes = require('./routes/group');
const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');
const breakroomRoutes = require('./routes/breakroom');
const friendsRoutes = require('./routes/friends');



// Middleware to parse incoming JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Use routes
app.use('/api/auth', authentication);
app.use('/api/user', user);
app.use('/api/permission', permissionRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/breakroom', breakroomRoutes);
app.use('/api/friends', friendsRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));


// Serve frontend static files
app.use(express.static(path.join(__dirname, 'dist')));


// Serve index.html for all non-API, non-static requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // let API routes handle their paths
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

console.log('Serving static from:', path.join(__dirname, 'dist'));
console.log('Fallback route will catch anything not under /api');

server.listen(port, () => {
  console.log(`App running on ${process.env.CORS_ORIGIN}:${port}`);
  console.log('Socket.IO server is ready');
});


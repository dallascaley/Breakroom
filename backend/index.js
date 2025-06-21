// backend/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 80;

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Example API route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from API' });
});

// Serve index.html for all non-API, non-static requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // let API routes handle their paths
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('Serving static from:', path.join(__dirname, 'public'));
console.log('Fallback route will catch anything not under /api');

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const cookieParser = require('cookie-parser');
const port = 3000;

// Load your SSL certificate and key
const fs = require('fs');

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));


app.set('view engine', 'ejs');

const authentication = require('./routes/authentication');

// Middleware to parse incoming JSON data
app.use(express.json());
app.use(cookieParser());

// Use routes
app.use('/api/auth', authentication);


// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));


// Serve index.html for all non-API, non-static requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // let API routes handle their paths
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('Serving static from:', path.join(__dirname, 'public'));
console.log('Fallback route will catch anything not under /api');

app.listen(port, () => {
  console.log(`App running on ${process.env.CORS_ORIGIN}:${port}`);
});


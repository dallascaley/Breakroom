require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const https = require('https');
const port = 3000;

// Load your SSL certificate and key
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/prosaurus.com/privkey.pem', 'utf8'),
  cert: fs.readFileSync('/etc/letsencrypt/live/prosaurus.com/fullchain.pem', 'utf8')
};


app.use(cors());

app.set('view engine', 'ejs');

const authentication = require('./routes/authentication');

// Middleware to parse incoming JSON data
app.use(express.json());

// Use routes
app.use('/api/auth', authentication);


// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Example API route
/*
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from API' });
});
*/

// Serve index.html for all non-API, non-static requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // let API routes handle their paths
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('Serving static from:', path.join(__dirname, 'public'));
console.log('Fallback route will catch anything not under /api');

https.createServer(options, app).listen(port, () => {
  //const backendUrl = process.env.BACKEND_URL || 'https://www.prosaurus.com';
  //console.log(`Backend server running on ${backendUrl}`);
  console.log(`HTTPS Server running on https://localhost:${port}`);
});

/*
app.listen(port, () => {
  console.log(`App running on https://localhost:${port}`);
});
*/

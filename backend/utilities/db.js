const { Pool } = require('pg');

// Set up your database connection details (you can also use environment variables)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT
});

// Function to get a client from the pool
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client; // Return the connected client to be used in the route
  } catch (error) {
    console.error('Error getting DB client:', error);
    throw error; // Throw the error so it can be caught in the route
  }
};

// Export the getClient function for use in routes
module.exports = {
  getClient
};
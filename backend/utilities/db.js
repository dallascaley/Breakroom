const mysql = require('mysql2/promise');

console.log('Connecting to DB host:', process.env.DB_HOST);

// Set up your database connection pool
const pool = mysql.createPool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to get a connection from the pool
// Returns a wrapper that mimics the pg client interface for easier migration
const getClient = async () => {
  try {
    const connection = await pool.getConnection();

    // Create a wrapper that provides a similar interface to pg
    return {
      // Execute a query - converts $1, $2 style to ? style automatically
      async query(sql, params = []) {
        // Convert PostgreSQL-style $1, $2 placeholders to MySQL ? placeholders
        const convertedSql = sql.replace(/\$(\d+)/g, '?');

        const [rows, fields] = await connection.execute(convertedSql, params);

        // Return an object that mimics pg's result format
        return {
          rows: Array.isArray(rows) ? rows : [],
          rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
          affectedRows: rows.affectedRows,
          insertId: rows.insertId
        };
      },

      // Release the connection back to the pool
      release() {
        connection.release();
      },

      // For transaction support
      async beginTransaction() {
        await connection.beginTransaction();
      },

      async commit() {
        await connection.commit();
      },

      async rollback() {
        await connection.rollback();
      }
    };
  } catch (error) {
    console.error('Error getting DB client:', error);
    throw error;
  }
};

// Export the getClient function for use in routes
module.exports = {
  getClient,
  pool
};

const mysql = require('mysql');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL server:', err.stack);
    throw err;
  }
  console.log('Connected to MySQL server as ID', connection.threadId);
});

connection.on('error', (err) => {
  console.error('MySQL Connection Error:', err.stack);
  connection.destroy();
});

module.exports = connection;

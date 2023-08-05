const connection = require('./db');
const bcrypt = require('bcrypt');
const saltRounds = 10;

class User {
  constructor(id, username, password, email, createdAt, updatedAt) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.email = email;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static getByUsername(username, callback) {
    const sql = `SELECT * FROM loginserver WHERE username = ?`;
    connection.query(sql, [username], (err, results) => {
      if (err) {
        console.error('Error getting user by username:', err);
        callback(err, null);
        return;
      }
      if (results.length === 0) {
        console.log('User not found');
        callback(null, null);
        return;
      }
      const { id, username, password, email, created_at, updated_at } = results[0];
      console.log('User found with ID', id);
      const user = new User(id, username, password, email, created_at, updated_at);
      console.log('Stored password hash:', password);
      callback(null, user);
    });
  }

  checkPassword(password, callback) {
    bcrypt.compare(password, this.password, (err, isMatch) => {
      if (err) {
        console.error('Error checking password:', err);
        callback(err, null);
      } else {
	console.log('Input password hash:', bcrypt.hashSync(password, saltRounds)); // Add this line
        callback(null, isMatch);
      }
    });
  }

  update() {
    const now = new Date().toISOString();
    const sql = `UPDATE loginserver SET username = ?, password = ?, email = ?, updated_at = ? WHERE id = ?`;
    const values = [this.username, this.password, this.email, now, this.id];
    connection.query(sql, values, (err) => {
      if (err) {
        console.error('Error updating user:', err);
        return;
      }
      console.log('User updated with ID', this.id);
      this.updatedAt = now;
      return this;
    });
  }

  delete() {
    const sql = `DELETE FROM loginserver WHERE id = ?`;
    connection.query(sql, [this.id], (err) => {
      if (err) {
        console.error('Error deleting user:', err);
        return;
      }
      console.log('User deleted with ID', this.id);
      return;
    });
  }
}

User.create = (userData, callback) => {
  const { username, password, email } = userData;
  const saltRounds = 10;
  const hash = bcrypt.hashSync(password, saltRounds); // Changed this line
  const newUser = {
    username,
    password: hash,
    email,
    created_at: new Date(),
    updated_at: new Date()
  };

  const query = 'INSERT INTO loginserver SET ?';

  connection.query(query, newUser, (err, result) => {
    if (err) {
      return callback(err);
    }
    callback(null, result.insertId);
  });
};

User.getById = (id, callback) => {
  const sql = `SELECT * FROM loginserver WHERE id = ?`;
  connection.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error getting user by ID:', err);
      callback(err, null);
      return;
    }
    if (results.length === 0) {
      console.log('User not found');
      callback(null, null);
      return;
    }
    const { id, username, password, email, created_at, updated_at } = results[0];
    console.log('User found with ID', id);
    const user = new User(id, username, password, email, created_at, updated_at);
    callback(null, user);
  });
};


module.exports = User;


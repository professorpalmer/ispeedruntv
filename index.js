const express = require('express');
const https = require('https');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql');
const User = require('./server/users');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, process.env.PRIVATE_KEY)),
  cert: fs.readFileSync(path.join(__dirname, process.env.CERT_KEY))
}, app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'views', 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

console.log(bcrypt);

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.getByUsername(username, (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      user.checkPassword(password, (err, isMatch) => {
        if (err) {
          return done(err);
        }
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      });
    });
  }
));

async function sendEmail(email, message) {
  const userEmail = process.env.EMAIL;
  const userPassword = process.env.EMAIL_PASSWORD;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: userEmail,
      pass: userPassword
    }
  });

  const mailOptions = {
    from: email,
    to: userEmail,
    subject: 'Contact Form Submission',
    text: message
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully.');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.getById(id, (err, user) => {
    done(err, user);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/live', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'live.html'));
});

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('Failed to connect to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

io.on('connection', (socket) => {
  console.log('WebSocket connection established');

  socket.on('message', (msg) => {
    console.log('message: ' + msg);
    io.emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket connection closed');
  });
});

app.post('/send_email', async (req, res) => {
  const { email, message } = req.body;

  if (!email || !message) {
    return res.status(400).send('Email and message are required.');
  }

  try {
    await sendEmail(email, message);
    res.status(200).send('Email sent successfully.');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email.');
  }
});

app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  User.getByUsername(username, (err, user) => {
    if (err) {
      console.error('Error getting user:', err);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }

    if (user) {
      res.status(409).json({ message: 'Username already exists' });
      return;
    }

    User.create({ username, password, email }, (err) => {
      if (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Internal server error' });
        return;
      }

      res.status(201).json({ message: 'User registered successfully' });
    });
  });
});

app.post('/login', (req, res, next) => {
  console.log('Received login request:', req.body);

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Error during authentication:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!user) {
      console.log('Invalid credentials:', info.message);
      return res.status(401).json({ message: info.message });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('Error logging in:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      console.log('Login successful for user:', user.username);
      return res.status(200).json({ message: 'Login successful' });
    });
  })(req, res, next);
});

io.on('connection', async (socket) => {
  console.log('WebSocket connection established');
  console.log('User:', socket.request.user);

  const userId = socket.request.user ? socket.request.user.id : null;
  if (!userId) {
    socket.emit('message', { text: 'You must be logged in to send messages.' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    socket.emit('message', { text: 'Invalid user account.' });
    return;
  }

  socket.on('message', async (msg) => {
    console.log('message: ' + msg);
    const username = user.username;
    io.emit('message', { username, text: msg });
  });

  socket.on('disconnect', () => {
    console.log('WebSocket connection closed');
  });
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

const PORT = process.env.PORT || 6611;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

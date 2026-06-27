const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatar_url };
}

// POST /api/auth/signup  { name, email, password }
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *`,
      [name, email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// POST /api/auth/google  { idToken }
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google sign-in is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let result = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [
      googleId,
      email.toLowerCase(),
    ]);
    let user = result.rows[0];

    if (!user) {
      const insert = await pool.query(
        `INSERT INTO users (name, email, google_id, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name || email, email.toLowerCase(), googleId, picture]
      );
      user = insert.rows[0];
    } else if (!user.google_id) {
      const update = await pool.query(
        `UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3 RETURNING *`,
        [googleId, picture, user.id]
      );
      user = update.rows[0];
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Google sign-in error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;

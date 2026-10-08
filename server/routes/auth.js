const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

const signToken = (user) =>
  jwt.sign(
    {
      UserId: user.UserId,
      Username: user.Username,
      Role: user.Role,
      FullName: user.FullName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// Fetch permission keys for a user (Admin gets all)
const fetchPermissions = async (userId, role) => {
  if (role === 'Admin') {
    const pool = await getPool();
    const r = await pool.request().query('SELECT PermissionKey FROM Permissions');
    return r.recordset.map(x => x.PermissionKey);
  }
  const pool = await getPool();
  const r = await pool.request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT p.PermissionKey
      FROM UserPermissions up
      JOIN Permissions p ON up.PermissionId = p.PermissionId
      WHERE up.UserId = @UserId
    `);
  return r.recordset.map(x => x.PermissionKey);
};

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Username', sql.NVarChar(100), username)
      .query('SELECT * FROM Users WHERE Username = @Username');

    if (!result.recordset.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    if (!user.IsActive) return res.status(403).json({ error: 'Account is disabled' });

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.request()
      .input('id', sql.Int, user.UserId)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserId = @id');

    const token = signToken(user);
    const permissions = await fetchPermissions(user.UserId, user.Role);

    res.json({
      token,
      user: {
        UserId: user.UserId,
        Username: user.Username,
        FullName: user.FullName,
        Role: user.Role,
      },
      permissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ME — refresh permissions too
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const permissions = await fetchPermissions(req.user.UserId, req.user.Role);
    res.json({ user: req.user, permissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- LOGIN ----------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Username', sql.NVarChar(100), username)
      .query('SELECT * FROM Users WHERE Username = @Username');

    if (!result.recordset.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    if (!user.IsActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await pool.request()
      .input('id', sql.Int, user.UserId)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserId = @id');

    const token = signToken(user);

    res.json({
      token,
      user: {
        UserId: user.UserId,
        Username: user.Username,
        FullName: user.FullName,
        Role: user.Role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ME ----------------
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ---------------- CHANGE PASSWORD ----------------
router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.UserId)
      .query('SELECT PasswordHash FROM Users WHERE UserId = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(oldPassword, result.recordset[0].PasswordHash);
    if (!ok) return res.status(400).json({ error: 'Old password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('id', sql.Int, req.user.UserId)
      .input('hash', sql.NVarChar(255), hash)
      .query('UPDATE Users SET PasswordHash = @hash WHERE UserId = @id');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
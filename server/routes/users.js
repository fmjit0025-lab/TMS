const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All user routes require Admin
router.use(authMiddleware, requireRole('Admin'));

// LIST
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT UserId, Username, FullName, Role, IsActive, CreatedAt, LastLogin
      FROM Users ORDER BY Username
    `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE
router.post('/', async (req, res) => {
  const { Username, Password, FullName, Role, IsActive } = req.body;
  if (!Username || !Password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (Password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const validRoles = ['Admin', 'User'];
  const role = validRoles.includes(Role) ? Role : 'User';

  try {
    const pool = await getPool();
    const exists = await pool.request()
      .input('Username', sql.NVarChar(100), Username)
      .query('SELECT UserId FROM Users WHERE Username=@Username');
    if (exists.recordset.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(Password, 10);
    const result = await pool.request()
      .input('Username', sql.NVarChar(100), Username)
      .input('PasswordHash', sql.NVarChar(255), hash)
      .input('FullName', sql.NVarChar(200), FullName)
      .input('Role', sql.NVarChar(30), role)
      .input('IsActive', sql.Bit, IsActive === false ? 0 : 1)
      .query(`
        INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive)
        OUTPUT INSERTED.UserId, INSERTED.Username, INSERTED.FullName, INSERTED.Role, INSERTED.IsActive
        VALUES (@Username, @PasswordHash, @FullName, @Role, @IsActive)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { FullName, Role, IsActive, Password } = req.body;
  const id = parseInt(req.params.id);
  const validRoles = ['Admin', 'User'];
  const role = validRoles.includes(Role) ? Role : 'User';

  try {
    const pool = await getPool();

    // Prevent admin from disabling/demoting self
    if (id === req.user.UserId) {
      if (IsActive === false) return res.status(400).json({ error: 'You cannot disable your own account' });
      if (role !== 'Admin') return res.status(400).json({ error: 'You cannot demote yourself' });
    }

    if (Password && Password.length >= 6) {
      const hash = await bcrypt.hash(Password, 10);
      await pool.request()
        .input('id', sql.Int, id)
        .input('PasswordHash', sql.NVarChar(255), hash)
        .query('UPDATE Users SET PasswordHash=@PasswordHash WHERE UserId=@id');
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('FullName', sql.NVarChar(200), FullName)
      .input('Role', sql.NVarChar(30), role)
      .input('IsActive', sql.Bit, IsActive === false ? 0 : 1)
      .query(`UPDATE Users SET FullName=@FullName, Role=@Role, IsActive=@IsActive WHERE UserId=@id`);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.UserId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Users WHERE UserId=@id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
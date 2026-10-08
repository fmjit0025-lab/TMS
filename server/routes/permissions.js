const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All permission-management endpoints require Admin
router.use(authMiddleware, requireRole('Admin'));

// List the full permission catalog
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT * FROM Permissions ORDER BY Module, Action'
    );
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get permissions assigned to a user
router.get('/user/:userId', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserId', sql.Int, req.params.userId)
      .query(`
        SELECT p.PermissionKey
        FROM UserPermissions up
        JOIN Permissions p ON up.PermissionId = p.PermissionId
        WHERE up.UserId = @UserId
      `);
    res.json(result.recordset.map(x => x.PermissionKey));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Replace all permissions for a user
router.put('/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { permissions = [] } = req.body; // array of PermissionKey strings

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'permissions must be an array of strings' });
  }

  try {
    const pool = await getPool();

    // Block editing permissions for Admin users (they always have all)
    const u = await pool.request()
      .input('id', sql.Int, userId)
      .query('SELECT Role FROM Users WHERE UserId = @id');
    if (!u.recordset.length) return res.status(404).json({ error: 'User not found' });
    if (u.recordset[0].Role === 'Admin') {
      return res.status(400).json({ error: 'Admin users always have all permissions' });
    }

    // Clear then reinsert
    await pool.request()
      .input('UserId', sql.Int, userId)
      .query('DELETE FROM UserPermissions WHERE UserId = @UserId');

    if (permissions.length) {
      // Map keys → IDs
      const placeholders = permissions.map((_, i) => `@k${i}`).join(',');
      const query = pool.request();
      permissions.forEach((k, i) => query.input(`k${i}`, sql.NVarChar(100), k));
      const ids = await query.query(
        `SELECT PermissionId FROM Permissions WHERE PermissionKey IN (${placeholders})`
      );

      for (const row of ids.recordset) {
        await pool.request()
          .input('UserId', sql.Int, userId)
          .input('PermissionId', sql.Int, row.PermissionId)
          .query('INSERT INTO UserPermissions (UserId, PermissionId) VALUES (@UserId, @PermissionId)');
      }
    }

    res.json({ success: true, count: permissions.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
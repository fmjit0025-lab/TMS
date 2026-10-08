const { sql, getPool } = require('../config/db');

/**
 * Middleware factory — requires a specific permission.
 * Admins bypass the check.
 * Usage: router.post('/', requirePermission('aod.create'), handler)
 */
const requirePermission = (...requiredPermissions) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  // Admin implicitly has every permission
  if (req.user.Role === 'Admin') return next();

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserId', sql.Int, req.user.UserId)
      .query(`
        SELECT p.PermissionKey
        FROM UserPermissions up
        JOIN Permissions p ON up.PermissionId = p.PermissionId
        WHERE up.UserId = @UserId
      `);

    const userPerms = new Set(result.recordset.map(r => r.PermissionKey));
    const allowed = requiredPermissions.some(k => userPerms.has(k));

    if (!allowed) {
      return res.status(403).json({
        error: `Missing permission: ${requiredPermissions.join(' or ')}`,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { requirePermission };
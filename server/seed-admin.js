// server/seed-admin.js
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('./config/db');

(async () => {
  const password = 'admin123'; // change later!
  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();
  await pool.request()
    .input('Username', sql.NVarChar(100), 'admin')
    .input('PasswordHash', sql.NVarChar(255), hash)
    .input('FullName', sql.NVarChar(200), 'System Administrator')
    .query(`
      IF NOT EXISTS (SELECT 1 FROM Users WHERE Username=@Username)
      INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive)
      VALUES (@Username, @PasswordHash, 'System Administrator', 'Admin', 1);
    `);
  console.log('✅ Admin user created (username=admin, password=159)');
  process.exit(0);
})();
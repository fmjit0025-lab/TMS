const bcrypt = require('bcrypt');   // native bcrypt — matches your $2b$ hash
const { sql, getPool } = require('./config/db');

(async () => {
  const username = process.argv[2] || 'admin';
  const newPassword = process.argv[3] || '147';

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    console.log('Username:', username);
    console.log('New password:', newPassword);
    console.log('New hash:', hash);
    console.log('Prefix:', hash.substring(0, 4));

    const pool = await getPool();
    const res = await pool.request()
      .input('Username', sql.NVarChar(100), username)
      .input('PasswordHash', sql.NVarChar(255), hash)
      .query('UPDATE Users SET PasswordHash=@PasswordHash, IsActive=1 WHERE Username=@Username');

    if (res.rowsAffected[0] === 0) {
      console.log(`❌ No user "${username}" found.`);
    } else {
      console.log(`✅ Password reset for "${username}" → "${newPassword}"`);

      // Immediate round-trip check
      const verify = await bcrypt.compare(newPassword, hash);
      console.log('Self-verify:', verify);
    }
    process.exit(0);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();
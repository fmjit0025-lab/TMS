const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise;
const getPool = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect()
      .then((p) => { console.log('✅ MSSQL connected'); return p; })
      .catch((e) => { console.error('❌ DB error:', e.message); throw e; });
  }
  return poolPromise;
};

module.exports = { sql, getPool };
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

router.get('/', async (req, res) => {
  const { search = '' } = req.query;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .query(`
        SELECT * FROM Inv
        WHERE Invno LIKE @search OR Customer LIKE @search
           OR AODno LIKE @search OR Product LIKE @search OR ProductCode LIKE @search
        ORDER BY [D] DESC
      `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { D, Invno, Product, Customer, AODno, ProductCode, qty } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('D', sql.DateTime, D || new Date())
      .input('Invno', sql.NVarChar(50), Invno)
      .input('Product', sql.NVarChar(250), Product)
      .input('Customer', sql.NVarChar(250), Customer)
      .input('AODno', sql.NVarChar(250), AODno)
      .input('ProductCode', sql.NVarChar(250), ProductCode)
      .input('qty', sql.Int, qty || 0)
      .query(`INSERT INTO Inv ([D],[Invno],[Product],[Customer],[AODno],[ProductCode],[qty])
              VALUES (@D,@Invno,@Product,@Customer,@AODno,@ProductCode,@qty)`);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  const { Invno, ProductCode, D, Product, Customer, AODno, qty } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('Invno', sql.NVarChar(50), Invno)
      .input('ProductCode', sql.NVarChar(250), ProductCode)
      .input('D', sql.DateTime, D)
      .input('Product', sql.NVarChar(250), Product)
      .input('Customer', sql.NVarChar(250), Customer)
      .input('AODno', sql.NVarChar(250), AODno)
      .input('qty', sql.Int, qty || 0)
      .query(`UPDATE Inv SET [D]=@D,[Product]=@Product,[Customer]=@Customer,
              [AODno]=@AODno,[qty]=@qty
              WHERE Invno=@Invno AND ProductCode=@ProductCode`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/', async (req, res) => {
  const { Invno, ProductCode } = req.query;
  try {
    const pool = await getPool();
    await pool.request()
      .input('Invno', sql.NVarChar(50), Invno)
      .input('ProductCode', sql.NVarChar(250), ProductCode)
      .query('DELETE FROM Inv WHERE Invno=@Invno AND ProductCode=@ProductCode');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
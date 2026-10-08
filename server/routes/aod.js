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
        SELECT * FROM AOD
        WHERE AODno LIKE @search OR Customer LIKE @search
           OR Product LIKE @search OR ProductCode LIKE @search
        ORDER BY [D] DESC
      `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { D, AODno, ProductCode, Product, location, qty, Customer } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('D', sql.DateTime, D || new Date())
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .input('Product', sql.NVarChar(250), Product)
      .input('location', sql.NVarChar(250), location)
      .input('qty', sql.Int, qty || 0)
      .input('Customer', sql.NVarChar(250), Customer)
      .query(`INSERT INTO AOD ([D],[AODno],[ProductCode],[Product],[location],[qty],[Customer])
              VALUES (@D,@AODno,@ProductCode,@Product,@location,@qty,@Customer)`);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  const { AODno, ProductCode, D, Product, location, qty, Customer } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .input('D', sql.DateTime, D)
      .input('Product', sql.NVarChar(250), Product)
      .input('location', sql.NVarChar(250), location)
      .input('qty', sql.Int, qty || 0)
      .input('Customer', sql.NVarChar(250), Customer)
      .query(`UPDATE AOD SET [D]=@D,[Product]=@Product,[location]=@location,
              [qty]=@qty,[Customer]=@Customer
              WHERE AODno=@AODno AND ProductCode=@ProductCode`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// Get AOD quantity + how much has already been returned
router.get('/remaining/:aodno/:productcode', async (req, res) => {
  const { aodno, productcode } = req.params;
  try {
    const pool = await getPool();

    const aod = await pool.request()
      .input('AODno', sql.NVarChar(150), aodno)
      .input('ProductCode', sql.NVarChar(150), productcode)
      .query(`
        SELECT ISNULL(SUM(qty),0) AS AODQty
        FROM AOD
        WHERE AODno = @AODno AND ProductCode = @ProductCode
      `);

    const returned = await pool.request()
      .input('AODno', sql.NVarChar(150), aodno)
      .input('ProductCode', sql.NVarChar(150), productcode)
      .query(`
        SELECT ISNULL(SUM(ReturnQty),0) AS ReturnedQty
        FROM ReturnItems
        WHERE AODno = @AODno
          AND ProductCode = @ProductCode
          AND Status <> 'Rejected'
      `);

    const aodQty = aod.recordset[0]?.AODQty || 0;
    const returnedQty = returned.recordset[0]?.ReturnedQty || 0;
    const remaining = aodQty - returnedQty;

    res.json({ AODQty: aodQty, ReturnedQty: returnedQty, Remaining: remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
router.delete('/', async (req, res) => {
  const { AODno, ProductCode } = req.query;
  try {
    const pool = await getPool();
    await pool.request()
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .query('DELETE FROM AOD WHERE AODno=@AODno AND ProductCode=@ProductCode');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
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
        SELECT * FROM AOD_SecondCopy
        WHERE AODno LIKE @search OR Customer LIKE @search
           OR Product LIKE @search OR ProductCode LIKE @search
           OR Receivedby LIKE @search
        ORDER BY [D] DESC
      `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { D, AODno, ProductCode, Product, location, qty,
    SealedDate, Receivedby, Remark, RTNQTY, Customer, CreatedUser } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('D', sql.DateTime, D || new Date())
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .input('Product', sql.NVarChar(250), Product)
      .input('location', sql.NVarChar(250), location)
      .input('qty', sql.Int, qty || 0)
      .input('SealedDate', sql.DateTime, SealedDate || null)
      .input('Receivedby', sql.NVarChar(250), Receivedby)
      .input('Remark', sql.NVarChar(250), Remark)
      .input('RTNQTY', sql.Int, RTNQTY || 0)
      .input('Customer', sql.NVarChar(150), Customer)
      .input('CreatedDate', sql.DateTime, new Date())
      .input('CreatedUser', sql.NVarChar(150), CreatedUser || 'admin')
      .query(`INSERT INTO AOD_SecondCopy
        ([D],[AODno],[ProductCode],[Product],[location],[qty],
         [SealedDate],[Receivedby],[Remark],[RTNQTY],[Customer],
         [CreatedDate],[CreatedUser])
        VALUES (@D,@AODno,@ProductCode,@Product,@location,@qty,
                @SealedDate,@Receivedby,@Remark,@RTNQTY,@Customer,
                @CreatedDate,@CreatedUser)`);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', async (req, res) => {
  const { AODno, ProductCode, D, Product, location, qty,
    SealedDate, Receivedby, Remark, RTNQTY, Customer } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .input('D', sql.DateTime, D)
      .input('Product', sql.NVarChar(250), Product)
      .input('location', sql.NVarChar(250), location)
      .input('qty', sql.Int, qty || 0)
      .input('SealedDate', sql.DateTime, SealedDate || null)
      .input('Receivedby', sql.NVarChar(250), Receivedby)
      .input('Remark', sql.NVarChar(250), Remark)
      .input('RTNQTY', sql.Int, RTNQTY || 0)
      .input('Customer', sql.NVarChar(150), Customer)
      .query(`UPDATE AOD_SecondCopy
              SET [D]=@D,[Product]=@Product,[location]=@location,[qty]=@qty,
                  [SealedDate]=@SealedDate,[Receivedby]=@Receivedby,
                  [Remark]=@Remark,[RTNQTY]=@RTNQTY,[Customer]=@Customer
              WHERE AODno=@AODno AND ProductCode=@ProductCode`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/', async (req, res) => {
  const { AODno, ProductCode } = req.query;
  try {
    const pool = await getPool();
    await pool.request()
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .query('DELETE FROM AOD_SecondCopy WHERE AODno=@AODno AND ProductCode=@ProductCode');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
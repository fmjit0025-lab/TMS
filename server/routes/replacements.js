const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// Pipeline lookup — must be BEFORE '/:id' to avoid conflicts
router.get('/pipeline/:aodno', async (req, res) => {
  try {
    const pool = await getPool();
    const a = req.params.aodno;
    const aod = await pool.request().input('a', sql.NVarChar, a).query('SELECT * FROM AOD WHERE AODno=@a');
    const inv = await pool.request().input('a', sql.NVarChar, a).query('SELECT * FROM Inv WHERE AODno=@a');
    const sc = await pool.request().input('a', sql.NVarChar, a).query('SELECT * FROM AOD_SecondCopy WHERE AODno=@a');
    const ret = await pool.request().input('a', sql.NVarChar, a).query('SELECT * FROM ReturnItems WHERE AODno=@a');
    const qc = await pool.request().input('a', sql.NVarChar, a)
      .query(`SELECT q.* FROM QCInspection q JOIN ReturnItems r ON q.ReturnId=r.ReturnId WHERE r.AODno=@a`);
    const repl = await pool.request().input('a', sql.NVarChar, a).query('SELECT * FROM Replacements WHERE AODno=@a');
    res.json({
      aod: aod.recordset,
      invoices: inv.recordset,
      secondCopy: sc.recordset,
      returns: ret.recordset,
      qc: qc.recordset,
      replacements: repl.recordset,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  const { search = '' } = req.query;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .query(`
        SELECT p.*, r.ReturnNo
        FROM Replacements p
        LEFT JOIN ReturnItems r ON p.ReturnId = r.ReturnId
        WHERE p.ReplacementNo LIKE @search OR p.AODno LIKE @search
           OR p.Product LIKE @search OR p.Customer LIKE @search
        ORDER BY p.[D] DESC
      `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { ReplacementNo, D, ReturnId, AODno, ProductCode, Product, Customer,
    ReplacedQty, DeliveredBy, DeliveryDate, Status, Notes, CreatedUser } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('ReplacementNo', sql.NVarChar(50), ReplacementNo)
      .input('D', sql.DateTime, D || new Date())
      .input('ReturnId', sql.Int, ReturnId)
      .input('AODno', sql.NVarChar(150), AODno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .input('Product', sql.NVarChar(250), Product)
      .input('Customer', sql.NVarChar(250), Customer)
      .input('ReplacedQty', sql.Int, ReplacedQty || 0)
      .input('DeliveredBy', sql.NVarChar(250), DeliveredBy)
      .input('DeliveryDate', sql.DateTime, DeliveryDate || null)
      .input('Status', sql.NVarChar(30), Status || 'Pending')
      .input('Notes', sql.NVarChar(1000), Notes)
      .input('CreatedUser', sql.NVarChar(150), CreatedUser || 'admin')
      .query(`INSERT INTO Replacements
        (ReplacementNo,[D],ReturnId,AODno,ProductCode,Product,Customer,
         ReplacedQty,DeliveredBy,DeliveryDate,Status,Notes,CreatedUser)
        VALUES (@ReplacementNo,@D,@ReturnId,@AODno,@ProductCode,@Product,@Customer,
                @ReplacedQty,@DeliveredBy,@DeliveryDate,@Status,@Notes,@CreatedUser)`);

    await pool.request()
      .input('id', sql.Int, ReturnId)
      .query(`UPDATE ReturnItems SET Status='Replaced' WHERE ReturnId=@id`);

    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const { DeliveredBy, DeliveryDate, Status, Notes } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('DeliveredBy', sql.NVarChar(250), DeliveredBy)
      .input('DeliveryDate', sql.DateTime, DeliveryDate || null)
      .input('Status', sql.NVarChar(30), Status)
      .input('Notes', sql.NVarChar(1000), Notes)
      .query(`UPDATE Replacements
              SET DeliveredBy=@DeliveredBy, DeliveryDate=@DeliveryDate,
                  Status=@Status, Notes=@Notes WHERE ReplacementId=@id`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, req.params.id)
      .query('DELETE FROM Replacements WHERE ReplacementId=@id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
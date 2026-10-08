const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

router.get('/', async (req, res) => {
  const { search = '', status = '' } = req.query;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar, `%${search}%`)
      .input('status', sql.NVarChar(30), status)
      .query(`
        SELECT r.*,
          (SELECT TOP 1 Result FROM QCInspection q WHERE q.ReturnId=r.ReturnId ORDER BY QCId DESC) AS QCResult,
          (SELECT ISNULL(SUM(ReplacedQty),0) FROM Replacements p WHERE p.ReturnId=r.ReturnId) AS ReplacedQty
        FROM ReturnItems r
        WHERE (@status='' OR r.Status=@status)
          AND (r.ReturnNo LIKE @search OR r.AODno LIKE @search
               OR r.Product LIKE @search OR r.Customer LIKE @search)
        ORDER BY r.[D] DESC
      `);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);
    const ret = await pool.request().input('id', sql.Int, id)
      .query('SELECT * FROM ReturnItems WHERE ReturnId=@id');
    if (!ret.recordset.length) return res.status(404).json({ error: 'Not found' });
    const qc = await pool.request().input('id', sql.Int, id)
      .query('SELECT * FROM QCInspection WHERE ReturnId=@id ORDER BY QCId DESC');
    const repl = await pool.request().input('id', sql.Int, id)
      .query('SELECT * FROM Replacements WHERE ReturnId=@id ORDER BY ReplacementId DESC');
    res.json({ return: ret.recordset[0], inspections: qc.recordset, replacements: repl.recordset });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { ReturnNo, D, AODno, Invno, ProductCode, Product, Customer,
    ReturnQty, ReturnReason, ReceivedFrom, ReceiverName, CreatedUser } = req.body;

  try {
    const pool = await getPool();

    // --- Validate return qty against AOD qty ---
    if (AODno && ProductCode) {
      const aod = await pool.request()
        .input('AODno', sql.NVarChar(150), AODno)
        .input('ProductCode', sql.NVarChar(150), ProductCode)
        .query(`SELECT ISNULL(SUM(qty),0) AS AODQty FROM AOD
                WHERE AODno=@AODno AND ProductCode=@ProductCode`);
      const aodQty = aod.recordset[0]?.AODQty || 0;

      const returned = await pool.request()
        .input('AODno', sql.NVarChar(150), AODno)
        .input('ProductCode', sql.NVarChar(150), ProductCode)
        .query(`SELECT ISNULL(SUM(ReturnQty),0) AS ReturnedQty FROM ReturnItems
                WHERE AODno=@AODno AND ProductCode=@ProductCode AND Status <> 'Rejected'`);
      const returnedQty = returned.recordset[0]?.ReturnedQty || 0;

      const remaining = aodQty - returnedQty;
      const requested = parseInt(ReturnQty || 0);

      if (aodQty === 0) {
        return res.status(400).json({
          error: `No matching AOD found for ${AODno} / ${ProductCode}. Cannot create return.`,
        });
      }

      if (requested > remaining) {
        return res.status(400).json({
          error: `Return Qty (${requested}) exceeds remaining returnable qty (${remaining}). AOD Qty = ${aodQty}, already returned = ${returnedQty}.`,
        });
      }
    }

    await pool.request()
      .input('ReturnNo', sql.NVarChar(50), ReturnNo)
      .input('D', sql.DateTime, D || new Date())
      .input('AODno', sql.NVarChar(150), AODno)
      .input('Invno', sql.NVarChar(50), Invno)
      .input('ProductCode', sql.NVarChar(150), ProductCode)
      .input('Product', sql.NVarChar(250), Product)
      .input('Customer', sql.NVarChar(250), Customer)
      .input('ReturnQty', sql.Int, ReturnQty || 0)
      .input('ReturnReason', sql.NVarChar(500), ReturnReason)
      .input('ReceivedFrom', sql.NVarChar(50), ReceivedFrom)
      .input('ReceiverName', sql.NVarChar(250), ReceiverName)
      .input('CreatedUser', sql.NVarChar(150), CreatedUser || 'admin')
      .query(`INSERT INTO ReturnItems
        (ReturnNo,[D],AODno,Invno,ProductCode,Product,Customer,
         ReturnQty,ReturnReason,ReceivedFrom,ReceiverName,CreatedUser)
        VALUES (@ReturnNo,@D,@AODno,@Invno,@ProductCode,@Product,@Customer,
                @ReturnQty,@ReturnReason,@ReceivedFrom,@ReceiverName,@CreatedUser)`);

    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  const { ReturnQty, ReturnReason, ReceiverName, Status } = req.body;
  try {
    const pool = await getPool();

    // Load existing return to know its AODno/ProductCode
    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT AODno, ProductCode FROM ReturnItems WHERE ReturnId=@id');

    if (!existing.recordset.length) {
      return res.status(404).json({ error: 'Return not found' });
    }
    const { AODno, ProductCode } = existing.recordset[0];

    // Validate against AOD qty (excluding this row's old qty)
    if (AODno && ProductCode && ReturnQty != null) {
      const aod = await pool.request()
        .input('AODno', sql.NVarChar(150), AODno)
        .input('ProductCode', sql.NVarChar(150), ProductCode)
        .query(`SELECT ISNULL(SUM(qty),0) AS AODQty FROM AOD
                WHERE AODno=@AODno AND ProductCode=@ProductCode`);
      const aodQty = aod.recordset[0]?.AODQty || 0;

      const returned = await pool.request()
        .input('AODno', sql.NVarChar(150), AODno)
        .input('ProductCode', sql.NVarChar(150), ProductCode)
        .input('id', sql.Int, req.params.id)
        .query(`SELECT ISNULL(SUM(ReturnQty),0) AS ReturnedQty FROM ReturnItems
                WHERE AODno=@AODno AND ProductCode=@ProductCode
                  AND Status <> 'Rejected' AND ReturnId <> @id`);
      const returnedQty = returned.recordset[0]?.ReturnedQty || 0;

      const remaining = aodQty - returnedQty;
      const requested = parseInt(ReturnQty || 0);

      if (requested > remaining) {
        return res.status(400).json({
          error: `Return Qty (${requested}) exceeds remaining returnable qty (${remaining}).`,
        });
      }
    }

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('ReturnQty', sql.Int, ReturnQty || 0)
      .input('ReturnReason', sql.NVarChar(500), ReturnReason)
      .input('ReceiverName', sql.NVarChar(250), ReceiverName)
      .input('Status', sql.NVarChar(30), Status)
      .query(`UPDATE ReturnItems SET ReturnQty=@ReturnQty, ReturnReason=@ReturnReason,
              ReceiverName=@ReceiverName, Status=@Status WHERE ReturnId=@id`);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id);
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Replacements WHERE ReturnId=@id');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM QCInspection WHERE ReturnId=@id');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM ReturnItems WHERE ReturnId=@id');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
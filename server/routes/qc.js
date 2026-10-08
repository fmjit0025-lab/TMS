const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

router.post('/', async (req, res) => {
  const { ReturnId, InspectorName, InspectionDate, Condition, Result,
    ApprovedQty, RejectedQty, Remarks, CreatedUser } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('ReturnId', sql.Int, ReturnId)
      .input('InspectorName', sql.NVarChar(250), InspectorName)
      .input('InspectionDate', sql.DateTime, InspectionDate || new Date())
      .input('Condition', sql.NVarChar(50), Condition)
      .input('Result', sql.NVarChar(30), Result)
      .input('ApprovedQty', sql.Int, ApprovedQty || 0)
      .input('RejectedQty', sql.Int, RejectedQty || 0)
      .input('Remarks', sql.NVarChar(1000), Remarks)
      .input('CreatedUser', sql.NVarChar(150), CreatedUser || 'admin')
      .query(`INSERT INTO QCInspection
        (ReturnId,InspectorName,InspectionDate,Condition,Result,
         ApprovedQty,RejectedQty,Remarks,CreatedUser)
        VALUES (@ReturnId,@InspectorName,@InspectionDate,@Condition,@Result,
                @ApprovedQty,@RejectedQty,@Remarks,@CreatedUser)`);

    const newStatus = Result === 'Rejected' ? 'Rejected' : 'QCCompleted';
    await pool.request()
      .input('id', sql.Int, ReturnId)
      .input('status', sql.NVarChar(30), newStatus)
      .query('UPDATE ReturnItems SET Status=@status WHERE ReturnId=@id');

    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:returnId', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.returnId)
      .query('SELECT * FROM QCInspection WHERE ReturnId=@id ORDER BY QCId DESC');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
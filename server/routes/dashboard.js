const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');

router.get('/stats', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(DISTINCT AODno) FROM AOD) AS UniqueAODs,
        (SELECT COUNT(*) FROM AOD) AS AODRows,
        (SELECT COUNT(DISTINCT Invno) FROM Inv) AS UniqueInvoices,
        (SELECT COUNT(*) FROM Inv) AS InvRows,
        (SELECT COUNT(*) FROM AOD_SecondCopy) AS SecondCopyRows,
        (SELECT ISNULL(SUM(RTNQTY),0) FROM AOD_SecondCopy) AS ReturnedFromSC,
        (SELECT COUNT(*) FROM ReturnItems) AS TotalReturns,
        (SELECT ISNULL(SUM(ReturnQty),0) FROM ReturnItems) AS TotalReturnQty,
        (SELECT COUNT(*) FROM ReturnItems WHERE Status='PendingQC') AS PendingQC,
        (SELECT COUNT(*) FROM ReturnItems WHERE Status='QCCompleted') AS QCCompleted,
        (SELECT COUNT(*) FROM ReturnItems WHERE Status='Replaced') AS ReplacedCount,
        (SELECT COUNT(*) FROM ReturnItems WHERE Status='Rejected') AS RejectedCount,
        (SELECT COUNT(*) FROM Replacements) AS TotalReplacements,
        (SELECT ISNULL(SUM(ReplacedQty),0) FROM Replacements) AS TotalReplacedQty
    `);
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/funnel', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(DISTINCT AODno) FROM AOD) AS StageAOD,
        (SELECT COUNT(DISTINCT Invno) FROM Inv) AS StageInvoice,
        (SELECT COUNT(*) FROM AOD_SecondCopy) AS StageSecondCopy,
        (SELECT COUNT(*) FROM ReturnItems) AS StageReturned,
        (SELECT COUNT(*) FROM QCInspection) AS StageQC,
        (SELECT COUNT(*) FROM Replacements) AS StageReplaced
    `);
    res.json(r.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
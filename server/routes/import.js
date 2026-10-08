const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();
const { sql, getPool } = require('../config/db');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// --- helpers ---
const excelDateToJS = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400000);
  }
  const d = new Date(val);
  return isNaN(d) ? null : d;
};

const cleanStr = (v, max = null) => {
  if (v === undefined || v === null) return null;
  let s = String(v).trim();
  if (!s) return null;
  if (max && s.length > max) s = s.substring(0, max);
  return s;
};

const toInt = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
};

// Split "S000001384 (Groviva 400g HDPE Container (Large))" into code + name
const splitCodeAndProduct = (raw) => {
  if (!raw) return { code: null, name: null };
  const s = String(raw).trim();
  // Match "CODE (name)" where name may itself contain parens
  const match = s.match(/^([A-Z0-9]+)\s*\((.+)\)\s*$/i);
  if (match) {
    return { code: cleanStr(match[1], 250), name: cleanStr(match[2], 250) };
  }
  return { code: cleanStr(s, 250), name: null };
};

// --- header synonym maps ---
const AOD_HEADER_MAP = {
  D:           ['d', 'date'],
  AODno:       ['aodno', 'aod no', 'p. o. #', 'po', 'po#', 'p.o.#', 'p.o. no', 'po number', 'pono'],
  ProductCode: ['productcode', 'product code', 'code', 'item', 'item code'],
  Product:     ['product', 'product name', 'description', 'item name', 'memo'],
  location:    ['location', 'source name', 'source', 'warehouse', 'location name'],
  qty:         ['qty', 'quantity', 'quantities'],
  Customer:    ['customer', 'client', 'customer name', 'name'],
};

const INV_HEADER_MAP = {
  D:           ['d', 'date'],
  Invno:       ['invno', 'inv no', 'invoice no', 'invoice number', 'inv#', 'num', 'number'],
  Product:     ['product', 'product name', 'description', 'item name', 'memo'],
  Customer:    ['customer', 'client', 'customer name', 'name'],
  AODno:       ['aodno', 'aod no', 'p. o. #', 'po', 'p.o.#', 'po number', 'fob', 'fob#'],
  ProductCode: ['productcode', 'product code', 'code', 'item', 'item code'],
  qty:         ['qty', 'quantity', 'quantities'],
};

const mapColumns = (headers, synonymMap) => {
  const lower = headers.map((h) => String(h || '').trim().toLowerCase());
  const result = {};
  for (const [field, synonyms] of Object.entries(synonymMap)) {
    let idx = -1;
    for (const syn of synonyms) {
      idx = lower.indexOf(syn);
      if (idx !== -1) break;
    }
    result[field] = idx;
  }
  return result;
};

const findHeaderRow = (rows, synonymMap) => {
  const allKeywords = new Set(Object.values(synonymMap).flat());
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowVals = rows[i].map((c) => String(c || '').trim().toLowerCase());
    const hits = rowVals.filter((h) => allKeywords.has(h)).length;
    if (hits >= 2) return i;
  }
  return -1;
};

// ================= AOD IMPORT =================
router.post('/aod', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (rows.length < 2) return res.status(400).json({ error: 'File has no data rows' });

    const headerIdx = findHeaderRow(rows, AOD_HEADER_MAP);
    if (headerIdx === -1) {
      return res.status(400).json({
        error: 'Header row not found. Expected one of: ' +
          [...new Set(Object.values(AOD_HEADER_MAP).flat())].join(', '),
      });
    }

    const headers = rows[headerIdx];
    const col = mapColumns(headers, AOD_HEADER_MAP);

    if (col.AODno === -1 && col.ProductCode === -1) {
      return res.status(400).json({
        error: 'Need at least "AODno" or "ProductCode" column. Detected: ' + headers.join(' | '),
      });
    }

    const dataRows = rows.slice(headerIdx + 1).filter((r) => r && r.some((c) => c !== null && c !== ''));

    const pool = await getPool();
    let inserted = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const excelRowNum = headerIdx + i + 2;

      try {
        const D = excelDateToJS(col.D >= 0 ? row[col.D] : null);
        const AODno = cleanStr(col.AODno >= 0 ? row[col.AODno] : null, 150);
        let ProductCode = cleanStr(col.ProductCode >= 0 ? row[col.ProductCode] : null, 150);
        let Product = cleanStr(col.Product >= 0 ? row[col.Product] : null, 250);

        if (ProductCode && !Product) {
          const split = splitCodeAndProduct(ProductCode);
          ProductCode = split.code;
          Product = split.name;
        }

        const location = cleanStr(col.location >= 0 ? row[col.location] : null, 250);
        const qty = toInt(col.qty >= 0 ? row[col.qty] : 0);
        const Customer = cleanStr(col.Customer >= 0 ? row[col.Customer] : null, 250);

        if (!AODno && !ProductCode) {
          errors.push({ row: excelRowNum, error: 'Both AODno and ProductCode are empty' });
          continue;
        }

        await pool.request()
          .input('D', sql.DateTime, D)
          .input('AODno', sql.NVarChar(150), AODno)
          .input('ProductCode', sql.NVarChar(150), ProductCode)
          .input('Product', sql.NVarChar(250), Product)
          .input('location', sql.NVarChar(250), location)
          .input('qty', sql.Int, qty)
          .input('Customer', sql.NVarChar(250), Customer)
          .query(`INSERT INTO AOD ([D],[AODno],[ProductCode],[Product],[location],[qty],[Customer])
                  VALUES (@D,@AODno,@ProductCode,@Product,@location,@qty,@Customer)`);
        inserted++;
      } catch (rowErr) {
        errors.push({ row: excelRowNum, error: rowErr.message });
      }
    }

    res.json({
      success: true,
      total: dataRows.length,
      inserted,
      failed: errors.length,
      errors: errors.slice(0, 50),
      detectedColumns: col,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= INVOICE IMPORT =================
router.post('/invoice', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (rows.length < 2) return res.status(400).json({ error: 'File has no data rows' });

    const headerIdx = findHeaderRow(rows, INV_HEADER_MAP);
    if (headerIdx === -1) {
      return res.status(400).json({
        error: 'Header row not found. Expected one of: ' +
          [...new Set(Object.values(INV_HEADER_MAP).flat())].join(', '),
      });
    }

    const headers = rows[headerIdx];
    const col = mapColumns(headers, INV_HEADER_MAP);

    if (col.Invno === -1 && col.ProductCode === -1) {
      return res.status(400).json({
        error: 'Need at least "Invno" or "ProductCode" column. Detected: ' + headers.join(' | '),
      });
    }

    const dataRows = rows.slice(headerIdx + 1).filter((r) => r && r.some((c) => c !== null && c !== ''));

    const pool = await getPool();
    let inserted = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const excelRowNum = headerIdx + i + 2;

      try {
        const D = excelDateToJS(col.D >= 0 ? row[col.D] : null);
        const Invno = cleanStr(col.Invno >= 0 ? row[col.Invno] : null, 50);
        let Product = cleanStr(col.Product >= 0 ? row[col.Product] : null, 250);
        const Customer = cleanStr(col.Customer >= 0 ? row[col.Customer] : null, 250);
        const AODno = cleanStr(col.AODno >= 0 ? row[col.AODno] : null, 250);
        let ProductCode = cleanStr(col.ProductCode >= 0 ? row[col.ProductCode] : null, 250);
        const qty = toInt(col.qty >= 0 ? row[col.qty] : 0);

        // Auto-split "CODE (Name)" into ProductCode + Product
        if (ProductCode && !Product) {
          const split = splitCodeAndProduct(ProductCode);
          ProductCode = split.code;
          Product = split.name;
        }

        if (!Invno && !ProductCode) {
          errors.push({ row: excelRowNum, error: 'Both Invno and ProductCode are empty' });
          continue;
        }

        await pool.request()
          .input('D', sql.DateTime, D)
          .input('Invno', sql.NVarChar(50), Invno)
          .input('Product', sql.NVarChar(250), Product)
          .input('Customer', sql.NVarChar(250), Customer)
          .input('AODno', sql.NVarChar(250), AODno)
          .input('ProductCode', sql.NVarChar(250), ProductCode)
          .input('qty', sql.Int, qty)
          .query(`INSERT INTO Inv ([D],[Invno],[Product],[Customer],[AODno],[ProductCode],[qty])
                  VALUES (@D,@Invno,@Product,@Customer,@AODno,@ProductCode,@qty)`);
        inserted++;
      } catch (rowErr) {
        errors.push({ row: excelRowNum, error: rowErr.message });
      }
    }

    res.json({
      success: true,
      total: dataRows.length,
      inserted,
      failed: errors.length,
      errors: errors.slice(0, 50),
      detectedColumns: col,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
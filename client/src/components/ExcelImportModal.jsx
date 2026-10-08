import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button, Modal } from './ui';

export default function ExcelImportModal({
  open, onClose, title = 'Import from Excel',
  expectedColumns = [], onImport, importType = 'aod',
}) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName('');
    setParsedRows([]);
    setError('');
    setResult(null);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file) => {
    setError('');
    setResult(null);
    setParsedRows([]);
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      if (rows.length < 2) throw new Error('File has no data rows');

      // Detect header row within first 5 rows
      let headerIdx = -1;
      const expected = expectedColumns.map((c) => c.key.toLowerCase());
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowVals = rows[i].map((c) => String(c || '').trim().toLowerCase());
        if (rowVals.some((h) => expected.includes(h))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) {
        throw new Error(
          `Header row not found. Expected columns: ${expectedColumns.map((c) => c.key).join(', ')}`
        );
      }

      const headers = rows[headerIdx].map((h) => String(h || '').trim().toLowerCase());
      const colMap = {};
      expectedColumns.forEach((c) => {
        colMap[c.key] = headers.indexOf(c.key.toLowerCase());
      });

      const parsed = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.some((c) => c !== null && c !== '')) continue;
        const obj = {};
        expectedColumns.forEach((c) => {
          const idx = colMap[c.key];
          let v = idx >= 0 ? r[idx] : null;
          obj[c.key] = v;
        });
        parsed.push(obj);
      }

      if (!parsed.length) throw new Error('No valid data rows found');
      setFileName(file.name);
      setParsedRows(parsed);
    } catch (e) {
      setError(e.message);
      setFileName('');
      setParsedRows([]);
    }
  };

  const runImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const res = await onImport(parsedRows, file, importType);
      setResult(res);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const fmt = (v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toLocaleDateString();
    return String(v);
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} wide>
      {!result ? (
        <>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center mb-4">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
              id="excel-input"
            />
            <label htmlFor="excel-input" className="cursor-pointer block">
              <div className="text-4xl mb-2">📂</div>
              <p className="text-sm font-medium text-slate-700">
                {fileName || 'Click to select an Excel file (.xlsx / .xls / .csv)'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                First sheet will be read. Max 20MB.
              </p>
            </label>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              EXPECTED COLUMNS (header row)
            </p>
            <div className="flex flex-wrap gap-2">
              {expectedColumns.map((c) => (
                <span
                  key={c.key}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                >
                  {c.key}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Preview ({parsedRows.length} rows detected — showing first 5):
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      {expectedColumns.map((c) => (
                        <th key={c.key} className="px-2 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap">
                          {c.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {expectedColumns.map((c) => (
                          <td key={c.key} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                            {fmt(r[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={runImport} disabled={!parsedRows.length || importing}>
              {importing ? 'Importing…' : `Import ${parsedRows.length || ''} Rows`}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={`rounded-lg p-4 mb-4 ${result.failed ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="text-lg font-semibold mb-1">
              {result.failed ? '⚠️ Import completed with issues' : '✅ Import successful'}
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div>
                <p className="text-slate-500">Total rows</p>
                <p className="text-xl font-bold">{result.total}</p>
              </div>
              <div>
                <p className="text-slate-500">Inserted</p>
                <p className="text-xl font-bold text-green-700">{result.inserted}</p>
              </div>
              <div>
                <p className="text-slate-500">Failed</p>
                <p className="text-xl font-bold text-red-600">{result.failed}</p>
              </div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Errors ({result.errors.length}
                {result.failed > result.errors.length ? ` of ${result.failed}` : ''}):
              </p>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold w-20">Row</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 text-slate-500">{e.row}</td>
                        <td className="px-2 py-1.5 text-red-600">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={reset}>Import Another File</Button>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
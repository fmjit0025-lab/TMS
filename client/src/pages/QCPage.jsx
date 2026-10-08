import { useEffect, useState } from 'react';
import { returnsApi, qcApi } from '../services/api';
import { Button, Card, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { Can } from '../components/PermissionGate';

const today = () => new Date().toISOString().slice(0, 16);

export default function QCPage() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    InspectorName: '', InspectionDate: today(),
    Condition: 'Good', Result: 'Approved',
    ApprovedQty: 0, RejectedQty: 0, Remarks: '', CreatedUser: 'admin',
  });

  const load = async () => {
    const pendingRows = await returnsApi.list({ status: 'PendingQC' });
    const inQc = await returnsApi.list({ status: 'InQC' });
    const completed = await returnsApi.list({ status: 'QCCompleted' });
    const rejected = await returnsApi.list({ status: 'Rejected' });
    setPending([...pendingRows, ...inQc]);
    setHistory([...completed, ...rejected]);
  };

  useEffect(() => { load(); }, []);

  const start = (r) => {
    setSelected(r);
    setForm({
      InspectorName: '', InspectionDate: today(),
      Condition: 'Good', Result: 'Approved',
      ApprovedQty: r.ReturnQty, RejectedQty: 0,
      Remarks: '', CreatedUser: 'admin',
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    await qcApi.create({
      ...form,
      ReturnId: selected.ReturnId,
      ApprovedQty: parseInt(form.ApprovedQty || 0),
      RejectedQty: parseInt(form.RejectedQty || 0),
    });
    setOpen(false);
    load();
  };

  return (
    <div className="p-8">
      <PageHeader
        title="QC Inspection"
        subtitle="Inspection reports from QC department for returned items"
      />

      <h2 className="text-sm font-semibold text-slate-600 mb-3">⏳ PENDING INSPECTION</h2>
      <Card className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Return No</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pending.map(r => (
              <tr key={r.ReturnId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-brand-700">{r.ReturnNo}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.D?.slice(0, 10)}</td>
                <td className="px-4 py-3">{r.Customer}</td>
                <td className="px-4 py-3">
                  {r.Product}
                  <div className="text-xs text-slate-400 font-mono">{r.ProductCode}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{r.ReturnQty}</td>
                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={r.ReturnReason}>
                  {r.ReturnReason}
                </td>
                <td className="px-4 py-3 text-right">
                  <Can perm="qc.create">
                    <Button onClick={() => start(r)}>Start Inspection</Button>
                  </Can>
                </td>
              </tr>
            ))}
            {!pending.length && (
              <tr><td colSpan="7" className="text-center py-10 text-slate-400">No pending inspections 🎉</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <h2 className="text-sm font-semibold text-slate-600 mb-3">✅ COMPLETED INSPECTIONS</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Return No</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Return Qty</th>
              <th className="text-right px-4 py-3">Replaced</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">QC Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map(r => (
              <tr key={r.ReturnId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{r.ReturnNo}</td>
                <td className="px-4 py-3">{r.Customer}</td>
                <td className="px-4 py-3">{r.Product}</td>
                <td className="px-4 py-3 text-right">{r.ReturnQty}</td>
                <td className="px-4 py-3 text-right text-green-600">{r.ReplacedQty}</td>
                <td className="px-4 py-3"><StatusBadge status={r.Status} /></td>
                <td className="px-4 py-3">{r.QCResult ? <StatusBadge status={r.QCResult} /> : '—'}</td>
              </tr>
            ))}
            {!history.length && (
              <tr><td colSpan="7" className="text-center py-10 text-slate-400">No completed inspections</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} wide
        title={`QC Inspection — ${selected?.ReturnNo || ''}`}>
        {selected && (
          <>
            <div className="bg-slate-50 rounded-lg p-4 mb-5 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">Product:</span> {selected.Product}</div>
                <div><span className="text-slate-500">Code:</span> {selected.ProductCode}</div>
                <div><span className="text-slate-500">Customer:</span> {selected.Customer}</div>
                <div><span className="text-slate-500">Return Qty:</span> <strong>{selected.ReturnQty}</strong></div>
                <div className="col-span-2"><span className="text-slate-500">Reason:</span> {selected.ReturnReason}</div>
              </div>
            </div>

            <form onSubmit={save}>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Inspector Name" value={form.InspectorName}
                  onChange={(e) => setForm({ ...form, InspectorName: e.target.value })} required />
                <Input label="Inspection Date" type="datetime-local" value={form.InspectionDate}
                  onChange={(e) => setForm({ ...form, InspectionDate: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Condition" value={form.Condition}
                  onChange={(e) => setForm({ ...form, Condition: e.target.value })}>
                  <option>Good</option>
                  <option>Damaged</option>
                  <option>Defective</option>
                  <option>Expired</option>
                </Select>
                <Select label="Result" value={form.Result}
                  onChange={(e) => setForm({ ...form, Result: e.target.value })}>
                  <option>Approved</option>
                  <option>Partial</option>
                  <option>Rejected</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Approved Qty" type="number" value={form.ApprovedQty}
                  onChange={(e) => setForm({ ...form, ApprovedQty: e.target.value })} />
                <Input label="Rejected Qty" type="number" value={form.RejectedQty}
                  onChange={(e) => setForm({ ...form, RejectedQty: e.target.value })} />
              </div>
              <Textarea label="Remarks" value={form.Remarks}
                onChange={(e) => setForm({ ...form, Remarks: e.target.value })} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Submit Inspection</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
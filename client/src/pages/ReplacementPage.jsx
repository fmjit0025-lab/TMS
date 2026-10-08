import { useEffect, useState } from 'react';
import { replacementsApi, returnsApi } from '../services/api';
import { Button, Card, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { Can } from '../components/PermissionGate';

const today = () => new Date().toISOString().slice(0, 16);
const genReplNo = () => `RPL-${Date.now().toString().slice(-6)}`;

export default function ReplacementPage() {
  const [items, setItems] = useState([]);
  const [approved, setApproved] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    ReplacementNo: '', D: today(), ReplacedQty: 0,
    DeliveredBy: '', DeliveryDate: today(), Status: 'Pending',
    Notes: '', CreatedUser: 'admin',
  });

  const load = async () => {
    setItems(await replacementsApi.list({ search }));
    const qcDone = await returnsApi.list({ status: 'QCCompleted' });
    const filtered = qcDone.filter(r => (r.ReplacedQty || 0) < r.ReturnQty);
    setApproved(filtered);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const start = (r) => {
    setSelected(r);
    setForm({
      ReplacementNo: genReplNo(), D: today(),
      ReplacedQty: r.ReturnQty, DeliveredBy: '', DeliveryDate: today(),
      Status: 'Pending', Notes: '', CreatedUser: 'admin',
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    await replacementsApi.create({
      ...form,
      ReturnId: selected.ReturnId,
      AODno: selected.AODno,
      ProductCode: selected.ProductCode,
      Product: selected.Product,
      Customer: selected.Customer,
      ReplacedQty: parseInt(form.ReplacedQty || 0),
    });
    setOpen(false);
    load();
  };

  const markDelivered = async (r) => {
    if (!confirm(`Mark replacement ${r.ReplacementNo} as Delivered?`)) return;
    await replacementsApi.update(r.ReplacementId, {
      DeliveredBy: r.DeliveredBy, DeliveryDate: r.DeliveryDate,
      Status: 'Delivered', Notes: r.Notes,
    });
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this replacement?')) return;
    await replacementsApi.remove(id);
    load();
  };

  return (
    <div className="p-8">
      <PageHeader title="Replacements"
        subtitle="Replacement deliveries for QC-approved returns" />

      <h2 className="text-sm font-semibold text-slate-600 mb-3">📦 QC-APPROVED RETURNS — READY FOR REPLACEMENT</h2>
      <Card className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Return No</th>
              <th className="text-left px-4 py-3">AOD No</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Return Qty</th>
              <th className="text-right px-4 py-3">Replaced</th>
              <th className="text-right px-4 py-3">Remaining</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {approved.map(r => {
              const remaining = (r.ReturnQty || 0) - (r.ReplacedQty || 0);
              return (
                <tr key={r.ReturnId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-brand-700">{r.ReturnNo}</td>
                  <td className="px-4 py-3 text-slate-500">{r.AODno}</td>
                  <td className="px-4 py-3">{r.Customer}</td>
                  <td className="px-4 py-3">
                    {r.Product}
                    <div className="text-xs text-slate-400 font-mono">{r.ProductCode}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{r.ReturnQty}</td>
                  <td className="px-4 py-3 text-right text-green-600">{r.ReplacedQty}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-600">{remaining}</td>
                  <td className="px-4 py-3 text-right">
                    <Can perm="replacement.create">
                      <Button onClick={() => start(r)}>Issue Replacement</Button>
                    </Can>
                  </td>
                </tr>
              );
            })}
            {!approved.length && (
              <tr><td colSpan="8" className="text-center py-10 text-slate-400">No approved returns awaiting replacement</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <h2 className="text-sm font-semibold text-slate-600 mb-3">🚚 ALL REPLACEMENTS</h2>
      <Card className="p-4 mb-4">
        <Input placeholder="🔍 Search Replacement#, AOD#, Product, Customer…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Repl No</th>
              <th className="text-left px-4 py-3">Return No</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-left px-4 py-3">Delivered By</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(r => (
              <tr key={r.ReplacementId} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">{r.D?.slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium text-brand-700">{r.ReplacementNo}</td>
                <td className="px-4 py-3 text-slate-500">{r.ReturnNo}</td>
                <td className="px-4 py-3">{r.Customer}</td>
                <td className="px-4 py-3">{r.Product}</td>
                <td className="px-4 py-3 text-right font-semibold">{r.ReplacedQty}</td>
                <td className="px-4 py-3">{r.DeliveredBy}</td>
                <td className="px-4 py-3"><StatusBadge status={r.Status} /></td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  {r.Status !== 'Delivered' && (
                    <Can perm="replacement.edit">
                      <button onClick={() => markDelivered(r)} className="text-green-600 hover:underline text-xs">Mark Delivered</button>
                    </Can>
                  )}
                  <Can perm="replacement.delete">
                    <button onClick={() => remove(r.ReplacementId)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </Can>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="9" className="text-center py-10 text-slate-400">No replacements</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} wide
        title={`New Replacement — ${selected?.ReturnNo || ''}`}>
        {selected && (
          <>
            <div className="bg-slate-50 rounded-lg p-4 mb-5 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">Product:</span> {selected.Product}</div>
                <div><span className="text-slate-500">Code:</span> {selected.ProductCode}</div>
                <div><span className="text-slate-500">Customer:</span> {selected.Customer}</div>
                <div><span className="text-slate-500">Return Qty:</span> <strong>{selected.ReturnQty}</strong></div>
                <div><span className="text-slate-500">Already Replaced:</span> {selected.ReplacedQty}</div>
                <div><span className="text-slate-500">Remaining:</span> {selected.ReturnQty - selected.ReplacedQty}</div>
              </div>
            </div>

            <form onSubmit={save}>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Replacement No" value={form.ReplacementNo}
                  onChange={(e) => setForm({ ...form, ReplacementNo: e.target.value })} required />
                <Input label="Date" type="datetime-local" value={form.D}
                  onChange={(e) => setForm({ ...form, D: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Replaced Qty" type="number" value={form.ReplacedQty}
                  onChange={(e) => setForm({ ...form, ReplacedQty: e.target.value })} required />
                <Select label="Status" value={form.Status}
                  onChange={(e) => setForm({ ...form, Status: e.target.value })}>
                  <option>Pending</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Delivered By" value={form.DeliveredBy}
                  onChange={(e) => setForm({ ...form, DeliveredBy: e.target.value })} />
                <Input label="Delivery Date" type="datetime-local" value={form.DeliveryDate}
                  onChange={(e) => setForm({ ...form, DeliveryDate: e.target.value })} />
              </div>
              <Textarea label="Notes" value={form.Notes}
                onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Create Replacement</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
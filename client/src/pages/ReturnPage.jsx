import { useEffect, useState } from 'react';
import { returnsApi, aodApi } from '../services/api';
import { Button, Card, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';
import StatusBadge from '../components/StatusBadge';
import { Can } from '../components/PermissionGate';

const today = () => new Date().toISOString().slice(0, 16);
const gen = () => `RTN-${Date.now().toString().slice(-6)}`;

const empty = {
  ReturnNo: '', D: today(), AODno: '', Invno: '', ProductCode: '', Product: '',
  Customer: '', ReturnQty: '', ReturnReason: '', ReceivedFrom: 'Customer',
  ReceiverName: '', CreatedUser: 'admin',
};

const statuses = ['', 'PendingQC', 'InQC', 'QCCompleted', 'Replaced', 'Rejected'];

export default function ReturnPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  // --- qty validation state ---
  const [qtyInfo, setQtyInfo] = useState(null);
  const [qtyError, setQtyError] = useState('');
  const [qtyLoading, setQtyLoading] = useState(false);

  // --- AOD picker state ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aods, setAods] = useState([]);
  const [aodSearch, setAodSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);

  const load = async () => setItems(await returnsApi.list({ search, status }));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, status]);

  // ---------- AOD PICKER ----------
  const openPicker = async () => {
    setPickerOpen(true);
    setAodSearch('');
    setPickerLoading(true);
    try {
      const data = await aodApi.list({ search: '' });
      setAods(data);
    } finally {
      setPickerLoading(false);
    }
  };

  const filteredAods = aods.filter((a) => {
    const q = aodSearch.toLowerCase();
    if (!q) return true;
    return (
      String(a.AODno || '').toLowerCase().includes(q) ||
      String(a.Product || '').toLowerCase().includes(q) ||
      String(a.ProductCode || '').toLowerCase().includes(q) ||
      String(a.Customer || '').toLowerCase().includes(q) ||
      String(a.location || '').toLowerCase().includes(q)
    );
  });

  const pickAod = (a) => {
    setForm({
      ...empty,
      ReturnNo: gen(),
      D: today(),
      AODno: a.AODno || '',
      ProductCode: a.ProductCode || '',
      Product: a.Product || '',
      Customer: a.Customer || '',
      ReceivedFrom: 'Customer',
      CreatedUser: 'admin',
    });
    setEditing(null);
    setQtyInfo(null);
    setQtyError('');
    setPickerOpen(false);
    setOpen(true);
  };
  // --------------------------------

  // --- fetch remaining qty ---
  useEffect(() => {
    const check = async () => {
      setQtyInfo(null);
      setQtyError('');
      const { AODno, ProductCode } = form;

      if (!AODno || !ProductCode) return;
      if (editing) return;

      setQtyLoading(true);
      try {
        const info = await aodApi.remaining(AODno, ProductCode);
        setQtyInfo(info);
        if (info.AODQty === 0) {
          setQtyError('No matching AOD found for this AOD# / Product Code combination.');
        }
      } catch (e) {
        setQtyError(e.response?.data?.error || 'Could not check remaining quantity.');
      } finally {
        setQtyLoading(false);
      }
    };
    const t = setTimeout(check, 400);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [form.AODno, form.ProductCode]);

  // --- live qty validation ---
  useEffect(() => {
    if (!qtyInfo) return;
    const v = parseInt(form.ReturnQty || 0);
    if (v > qtyInfo.Remaining) {
      setQtyError(`Return Qty (${v}) exceeds remaining returnable qty (${qtyInfo.Remaining}).`);
    } else if (v < 0) {
      setQtyError('Return Qty cannot be negative.');
    } else {
      setQtyError('');
    }
  }, [form.ReturnQty, qtyInfo]);

  const openCreate = () => {
    setForm({ ...empty, ReturnNo: gen(), D: today() });
    setEditing(null);
    setQtyInfo(null);
    setQtyError('');
    setOpen(true);
  };

  const openEdit = (r) => {
    setForm({ ...r, D: r.D?.slice(0, 16) });
    setEditing(r.ReturnId);
    setQtyInfo(null);
    setQtyError('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (qtyError) return;

    const payload = { ...form, ReturnQty: parseInt(form.ReturnQty || 0) };
    try {
      if (editing) await returnsApi.update(editing, payload);
      else await returnsApi.create(payload);
      setOpen(false);
      load();
    } catch (err) {
      setQtyError(err.response?.data?.error || err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this return and its QC/replacements?')) return;
    await returnsApi.remove(id);
    load();
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Return Items"
        subtitle="Items received back from customer / deliveryman"
        action={
          <Can perm="return.create">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openPicker}>📋 Load from AOD</Button>
              <Button onClick={openCreate}>+ New Return</Button>
            </div>
          </Can>
        }
      />

      <Card className="p-4 mb-4 flex gap-3 items-center flex-wrap">
        <input
          placeholder="🔍 Search Return#, AOD#, Product, Customer…"
          className="flex-1 min-w-[240px] px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          {statuses.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-3">Date</th>
              <th className="text-left px-3 py-3">Return No</th>
              <th className="text-left px-3 py-3">AOD / Inv</th>
              <th className="text-left px-3 py-3">Customer</th>
              <th className="text-left px-3 py-3">Product</th>
              <th className="text-right px-3 py-3">Qty</th>
              <th className="text-left px-3 py-3">From</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">QC</th>
              <th className="text-right px-3 py-3">Replaced</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(r => (
              <tr key={r.ReturnId} className="hover:bg-slate-50">
                <td className="px-3 py-3 whitespace-nowrap">{r.D?.slice(0, 10)}</td>
                <td className="px-3 py-3 font-medium text-brand-700">{r.ReturnNo}</td>
                <td className="px-3 py-3 text-xs">
                  <div>{r.AODno}</div>
                  {r.Invno && <div className="text-slate-400">{r.Invno}</div>}
                </td>
                <td className="px-3 py-3">{r.Customer}</td>
                <td className="px-3 py-3">
                  {r.Product}
                  <div className="text-xs text-slate-400 font-mono">{r.ProductCode}</div>
                </td>
                <td className="px-3 py-3 text-right font-semibold">{r.ReturnQty}</td>
                <td className="px-3 py-3">{r.ReceivedFrom}</td>
                <td className="px-3 py-3"><StatusBadge status={r.Status} /></td>
                <td className="px-3 py-3">
                  {r.QCResult ? <StatusBadge status={r.QCResult} /> : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-green-600 font-semibold">{r.ReplacedQty}</td>
                <td className="px-3 py-3 text-right space-x-2 whitespace-nowrap">
                  <Can perm="return.edit">
                    <button onClick={() => openEdit(r)} className="text-brand-600 hover:underline text-xs">Edit</button>
                  </Can>
                  <Can perm="return.delete">
                    <button onClick={() => remove(r.ReturnId)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </Can>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="11" className="text-center py-10 text-slate-400">No returns</td></tr>}
          </tbody>
        </table>
      </Card>

      {/* ================= RETURN FORM ================= */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Return' : 'New Return'}>
        <form onSubmit={save}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Return No" value={form.ReturnNo}
              onChange={(e) => setForm({ ...form, ReturnNo: e.target.value })} required disabled={!!editing} />
            <Input label="Date" type="datetime-local" value={form.D}
              onChange={(e) => setForm({ ...form, D: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="AOD No" value={form.AODno}
              onChange={(e) => setForm({ ...form, AODno: e.target.value })} />
            <Input label="Invoice No" value={form.Invno}
              onChange={(e) => setForm({ ...form, Invno: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Code" value={form.ProductCode}
              onChange={(e) => setForm({ ...form, ProductCode: e.target.value })} />
            <Input label="Product" value={form.Product}
              onChange={(e) => setForm({ ...form, Product: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer" value={form.Customer}
              onChange={(e) => setForm({ ...form, Customer: e.target.value })} />
            <Input
              label="Return Qty"
              type="number"
              min="0"
              max={qtyInfo ? qtyInfo.Remaining : undefined}
              value={form.ReturnQty}
              onChange={(e) => setForm({ ...form, ReturnQty: e.target.value })}
              required
              className={qtyError ? 'border-red-400 focus:ring-red-500' : ''}
            />
          </div>

          {qtyLoading && <p className="text-xs text-slate-500 mb-3">Checking AOD qty…</p>}

          {qtyInfo && !qtyLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">AOD Qty</div>
                  <div className="font-semibold text-slate-700">{qtyInfo.AODQty}</div>
                </div>
                <div>
                  <div className="text-slate-500">Already Returned</div>
                  <div className="font-semibold text-amber-600">{qtyInfo.ReturnedQty}</div>
                </div>
                <div>
                  <div className="text-slate-500">Remaining</div>
                  <div className={`font-semibold ${qtyInfo.Remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {qtyInfo.Remaining}
                  </div>
                </div>
              </div>
            </div>
          )}

          {qtyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
              ⚠️ {qtyError}
            </div>
          )}

          <Textarea label="Return Reason" value={form.ReturnReason}
            onChange={(e) => setForm({ ...form, ReturnReason: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Received From" value={form.ReceivedFrom}
              onChange={(e) => setForm({ ...form, ReceivedFrom: e.target.value })}>
              <option>Customer</option>
              <option>Deliveryman</option>
            </Select>
            <Input label="Receiver Name" value={form.ReceiverName}
              onChange={(e) => setForm({ ...form, ReceiverName: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!!qtyError}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* ================= AOD PICKER ================= */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Select an AOD to Return" wide>
        <Input
          placeholder="🔍 Search AOD#, Customer, Product, Location…"
          value={aodSearch}
          onChange={(e) => setAodSearch(e.target.value)}
          autoFocus
        />

        {pickerLoading && <p className="text-slate-500 text-center py-6">Loading AODs…</p>}

        {!pickerLoading && (
          <>
            <p className="text-xs text-slate-500 mb-2">
              {filteredAods.length} AOD line{filteredAods.length !== 1 ? 's' : ''} found — click a row to load it.
            </p>
            <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                    <th className="text-left px-3 py-2 font-semibold">AOD No</th>
                    <th className="text-left px-3 py-2 font-semibold">Customer</th>
                    <th className="text-left px-3 py-2 font-semibold">Product</th>
                    <th className="text-left px-3 py-2 font-semibold">Code</th>
                    <th className="text-left px-3 py-2 font-semibold">Location</th>
                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAods.map((a, i) => (
                    <tr
                      key={`${a.AODno}-${a.ProductCode}-${i}`}
                      onClick={() => pickAod(a)}
                      className="hover:bg-brand-50 cursor-pointer transition"
                      title="Click to load this AOD"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">{a.D?.slice(0, 10)}</td>
                      <td className="px-3 py-2 font-medium text-brand-700">{a.AODno}</td>
                      <td className="px-3 py-2">{a.Customer}</td>
                      <td className="px-3 py-2">{a.Product}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.ProductCode}</td>
                      <td className="px-3 py-2">{a.location}</td>
                      <td className="px-3 py-2 text-right font-semibold">{a.qty}</td>
                    </tr>
                  ))}
                  {!filteredAods.length && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">
                        No AODs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={() => setPickerOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
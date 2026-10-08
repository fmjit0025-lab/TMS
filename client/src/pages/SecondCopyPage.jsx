import { useEffect, useState } from 'react';
import { secondCopyApi, aodApi } from '../services/api';
import { Button, Card, Input, Modal, PageHeader } from '../components/ui';
import { Can } from '../components/PermissionGate';

const today = () => new Date().toISOString().slice(0, 16);
const empty = {
  D: today(), AODno: '', ProductCode: '', Product: '', location: '', qty: '',
  SealedDate: today(), Receivedby: '', Remark: '', RTNQTY: 0, Customer: '', CreatedUser: 'admin',
};

export default function SecondCopyPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);

  // --- AOD picker state ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aods, setAods] = useState([]);
  const [aodSearch, setAodSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);

  const load = async () => setItems(await secondCopyApi.list({ search }));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

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
      String(a.Customer || '').toLowerCase().includes(q)
    );
  });

  // Pick an AOD -> prefill form
  const pickAod = (a) => {
    setForm({
      ...empty,
      D: a.D ? a.D.slice(0, 16) : today(),
      AODno: a.AODno || '',
      ProductCode: a.ProductCode || '',
      Product: a.Product || '',
      location: a.location || '',
      qty: a.qty ?? '',
      Customer: a.Customer || '',
      SealedDate: today(),
      CreatedUser: 'admin',
    });
    setEditing(false);
    setPickerOpen(false);
    setOpen(true);
  };
  // --------------------------------

  const openCreate = () => {
    setForm({ ...empty, D: today(), SealedDate: today() });
    setEditing(false);
    setOpen(true);
  };

  const openEdit = (r) => {
    setForm({
      D: r.D?.slice(0, 16), AODno: r.AODno, ProductCode: r.ProductCode,
      Product: r.Product, location: r.location, qty: r.qty,
      SealedDate: r.SealedDate?.slice(0, 16), Receivedby: r.Receivedby,
      Remark: r.Remark, RTNQTY: r.RTNQTY, Customer: r.Customer, CreatedUser: r.CreatedUser,
    });
    setEditing(true);
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, qty: parseInt(form.qty || 0), RTNQTY: parseInt(form.RTNQTY || 0) };
    if (editing) await secondCopyApi.update(payload);
    else await secondCopyApi.create(payload);
    setOpen(false);
    load();
  };

  const remove = async (r) => {
    if (!confirm(`Delete second copy ${r.AODno} / ${r.ProductCode}?`)) return;
    await secondCopyApi.remove(r.AODno, r.ProductCode);
    load();
  };

  return (
    <div className="p-8">
      <PageHeader
        title="AOD Second Copy"
        subtitle="Sealed copies received from customer / deliveryman"
        action={
          <Can perm="secondcopy.create">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openPicker}>📋 Load from AOD</Button>
              <Button onClick={openCreate}>+ New Second Copy</Button>
            </div>
          </Can>
        }
      />

      <Card className="p-4 mb-4">
        <Input placeholder="🔍 Search AOD#, Customer, Product, Received by…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-3">Date</th>
              <th className="text-left px-3 py-3">AOD No</th>
              <th className="text-left px-3 py-3">Customer</th>
              <th className="text-left px-3 py-3">Product</th>
              <th className="text-left px-3 py-3">Code</th>
              <th className="text-left px-3 py-3">Location</th>
              <th className="text-right px-3 py-3">Qty</th>
              <th className="text-left px-3 py-3">Sealed</th>
              <th className="text-left px-3 py-3">Received by</th>
              <th className="text-right px-3 py-3">RTN Qty</th>
              <th className="text-left px-3 py-3">Remark</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-3 whitespace-nowrap">{r.D?.slice(0, 10)}</td>
                <td className="px-3 py-3 font-medium text-brand-700">{r.AODno}</td>
                <td className="px-3 py-3">{r.Customer}</td>
                <td className="px-3 py-3">{r.Product}</td>
                <td className="px-3 py-3 font-mono text-xs">{r.ProductCode}</td>
                <td className="px-3 py-3">{r.location}</td>
                <td className="px-3 py-3 text-right font-semibold">{r.qty}</td>
                <td className="px-3 py-3 whitespace-nowrap">{r.SealedDate?.slice(0, 10) || '-'}</td>
                <td className="px-3 py-3">{r.Receivedby}</td>
                <td className={`px-3 py-3 text-right font-semibold ${r.RTNQTY > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {r.RTNQTY ?? 0}
                </td>
                <td className="px-3 py-3 max-w-[200px] truncate" title={r.Remark}>{r.Remark}</td>
                <td className="px-3 py-3 text-right space-x-2 whitespace-nowrap">
                  <Can perm="secondcopy.edit">
                    <button onClick={() => openEdit(r)} className="text-brand-600 hover:underline text-xs">Edit</button>
                  </Can>
                  <Can perm="secondcopy.delete">
                    <button onClick={() => remove(r)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </Can>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="12" className="text-center py-10 text-slate-400">No records</td></tr>}
          </tbody>
        </table>
      </Card>

      {/* ========== SECOND COPY FORM MODAL ========== */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Second Copy' : 'New Second Copy'}>
        <form onSubmit={save}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="datetime-local" value={form.D}
              onChange={(e) => setForm({ ...form, D: e.target.value })} required />
            <Input label="Sealed Date" type="datetime-local" value={form.SealedDate}
              onChange={(e) => setForm({ ...form, SealedDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="AOD No" value={form.AODno}
              onChange={(e) => setForm({ ...form, AODno: e.target.value })} required disabled={editing} />
            <Input label="Customer" value={form.Customer}
              onChange={(e) => setForm({ ...form, Customer: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Code" value={form.ProductCode}
              onChange={(e) => setForm({ ...form, ProductCode: e.target.value })} required disabled={editing} />
            <Input label="Product" value={form.Product}
              onChange={(e) => setForm({ ...form, Product: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Location" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Qty" type="number" value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })} required />
            <Input label="RTN Qty" type="number" value={form.RTNQTY}
              onChange={(e) => setForm({ ...form, RTNQTY: e.target.value })} />
          </div>
          <Input label="Received by" value={form.Receivedby}
            onChange={(e) => setForm({ ...form, Receivedby: e.target.value })} />
          <Input label="Remark" value={form.Remark}
            onChange={(e) => setForm({ ...form, Remark: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      {/* ========== AOD PICKER MODAL ========== */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Select an AOD" wide>
        <Input
          placeholder="🔍 Search AOD#, Customer, Product…"
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
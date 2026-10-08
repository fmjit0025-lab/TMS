import { useEffect, useState } from 'react';
import { invoiceApi, importApi } from '../services/api';
import { Button, Card, Input, Modal, PageHeader } from '../components/ui';
import ExcelImportModal from '../components/ExcelImportModal';
import { Can } from '../components/PermissionGate';

const today = () => new Date().toISOString().slice(0, 16);
const gen = () => `INV-${Date.now().toString().slice(-6)}`;
const empty = { D: today(), Invno: '', Product: '', Customer: '', AODno: '', ProductCode: '', qty: '' };

const INV_COLUMNS = [
  { key: 'D' }, { key: 'Invno' }, { key: 'Product' }, { key: 'Customer' },
  { key: 'AODno' }, { key: 'ProductCode' }, { key: 'qty' },
];

export default function InvoicePage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);

  const load = async () => setItems(await invoiceApi.list({ search }));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const openCreate = () => {
    setForm({ ...empty, D: today(), Invno: gen() });
    setEditing(false);
    setOpen(true);
  };

  const openEdit = (r) => {
    setForm({
      D: r.D?.slice(0, 16), Invno: r.Invno, Product: r.Product,
      Customer: r.Customer, AODno: r.AODno, ProductCode: r.ProductCode, qty: r.qty,
    });
    setEditing(true);
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, qty: parseInt(form.qty || 0) };
    if (editing) await invoiceApi.update(payload);
    else await invoiceApi.create(payload);
    setOpen(false);
    load();
  };

  const remove = async (r) => {
    if (!confirm(`Delete Invoice ${r.Invno} / ${r.ProductCode}?`)) return;
    await invoiceApi.remove(r.Invno, r.ProductCode);
    load();
  };

  const handleImport = async (rows, file) => {
    const result = await importApi.invoice(file);
    await load();
    return result;
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Invoices"
        subtitle="Invoice line items linked to AOD"
        action={
          <div className="flex gap-2">
            <Can perm="invoice.import">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>📥 Import Excel</Button>
            </Can>
            <Can perm="invoice.create">
              <Button onClick={openCreate}>+ New Invoice</Button>
            </Can>
          </div>
        }
      />

      <Card className="p-4 mb-4">
        <Input placeholder="🔍 Search Inv#, AOD#, Customer, Product…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Inv No</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">AOD No</th>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">{r.D?.slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium text-brand-700">{r.Invno}</td>
                <td className="px-4 py-3">{r.Customer}</td>
                <td className="px-4 py-3 text-slate-500">{r.AODno}</td>
                <td className="px-4 py-3">{r.Product}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.ProductCode}</td>
                <td className="px-4 py-3 text-right font-semibold">{r.qty}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <Can perm="invoice.edit">
                    <button onClick={() => openEdit(r)} className="text-brand-600 hover:underline text-xs">Edit</button>
                  </Can>
                  <Can perm="invoice.delete">
                    <button onClick={() => remove(r)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </Can>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="8" className="text-center py-10 text-slate-400">No records</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Invoice' : 'New Invoice'}>
        <form onSubmit={save}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="datetime-local" value={form.D}
              onChange={(e) => setForm({ ...form, D: e.target.value })} required />
            <Input label="Invoice No" value={form.Invno}
              onChange={(e) => setForm({ ...form, Invno: e.target.value })} required disabled={editing} />
          </div>
          <Input label="Customer" value={form.Customer}
            onChange={(e) => setForm({ ...form, Customer: e.target.value })} required />
          <Input label="AOD No" value={form.AODno}
            onChange={(e) => setForm({ ...form, AODno: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product" value={form.Product}
              onChange={(e) => setForm({ ...form, Product: e.target.value })} />
            <Input label="Product Code" value={form.ProductCode}
              onChange={(e) => setForm({ ...form, ProductCode: e.target.value })} required disabled={editing} />
          </div>
          <Input label="Qty" type="number" value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })} required />
          <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-5 px-5 py-3 mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Invoices from Excel"
        expectedColumns={INV_COLUMNS}
        onImport={handleImport}
        importType="invoice"
      />
    </div>
  );
}
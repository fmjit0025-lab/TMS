import { useEffect, useState } from 'react';
import { usersApi } from '../services/api';
import { Button, Card, Input, Modal, PageHeader, Select } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const empty = { Username: '', Password: '', FullName: '', Role: 'User', IsActive: true };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => setItems(await usersApi.list());
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(empty);
    setEditing(null);
    setErr('');
    setOpen(true);
  };

  const openEdit = (r) => {
    setForm({ ...r, Password: '' });
    setEditing(r.UserId);
    setErr('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (editing) await usersApi.update(editing, form);
      else await usersApi.create(form);
      setOpen(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const remove = async (r) => {
    if (!confirm(`Delete user "${r.Username}"?`)) return;
    try {
      await usersApi.remove(r.UserId);
      load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="User Management"
        subtitle="Create, edit, and manage user accounts"
        action={<Button onClick={openCreate}>+ New User</Button>}
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Full Name</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((r) => (
              <tr key={r.UserId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{r.Username}</td>
                <td className="px-4 py-3">{r.FullName}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${r.Role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                    {r.Role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {r.IsActive
                    ? <span className="text-green-600 text-xs font-semibold">● Active</span>
                    : <span className="text-red-600 text-xs font-semibold">● Disabled</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {r.LastLogin ? new Date(r.LastLogin).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="text-brand-600 hover:underline text-xs">Edit</button>
                  <button
                    onClick={() => remove(r)}
                    disabled={r.UserId === me.UserId}
                    className="text-red-600 hover:underline text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                    title={r.UserId === me.UserId ? "You can't delete yourself" : ''}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="6" className="text-center py-10 text-slate-400">No users</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit User' : 'New User'}>
        <form onSubmit={save}>
          <Input
            label="Username"
            value={form.Username}
            onChange={(e) => setForm({ ...form, Username: e.target.value })}
            required
            disabled={!!editing}
          />
          <Input
            label={editing ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            value={form.Password}
            onChange={(e) => setForm({ ...form, Password: e.target.value })}
            required={!editing}
          />
          <Input
            label="Full Name"
            value={form.FullName || ''}
            onChange={(e) => setForm({ ...form, FullName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={form.Role}
              onChange={(e) => setForm({ ...form, Role: e.target.value })}
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </Select>
            <Select
              label="Status"
              value={form.IsActive ? '1' : '0'}
              onChange={(e) => setForm({ ...form, IsActive: e.target.value === '1' })}
            >
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </Select>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
              ⚠️ {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
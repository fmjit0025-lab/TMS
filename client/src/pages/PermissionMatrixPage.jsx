import { useEffect, useMemo, useState } from 'react';
import { usersApi, permissionsApi } from '../services/api';
import { Button, Card, PageHeader, Modal, Select } from '../components/ui';

const ACTION_ORDER = ['view', 'create', 'edit', 'delete', 'import'];

export default function PermissionMatrixPage() {
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [granted, setGranted] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([usersApi.list(), permissionsApi.catalog()])
      .then(([u, c]) => { setUsers(u); setCatalog(c); })
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  // Group permissions by module
  const grouped = useMemo(() => {
    const g = {};
    for (const p of catalog) {
      if (!g[p.Module]) g[p.Module] = [];
      g[p.Module].push(p);
    }
    for (const m of Object.keys(g)) {
      g[m].sort((a, b) => ACTION_ORDER.indexOf(a.Action) - ACTION_ORDER.indexOf(b.Action));
    }
    return g;
  }, [catalog]);

  const openFor = async (u) => {
    if (u.Role === 'Admin') {
      alert('Admin users always have all permissions.');
      return;
    }
    setSelected(u);
    setErr('');
    setOpen(true);
    try {
      const keys = await permissionsApi.forUser(u.UserId);
      setGranted(new Set(keys));
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const toggle = (key) => {
    const next = new Set(granted);
    next.has(key) ? next.delete(key) : next.add(key);
    setGranted(next);
  };

  const toggleModule = (module, on) => {
    const next = new Set(granted);
    for (const p of grouped[module]) {
      if (on) next.add(p.PermissionKey);
      else next.delete(p.PermissionKey);
    }
    setGranted(next);
  };

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      await permissionsApi.setForUser(selected.UserId, [...granted]);
      setOpen(false);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="User Permissions"
        subtitle="Assign granular permissions per user"
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Full Name</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Permissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.UserId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.Username}</td>
                <td className="px-4 py-3">{u.FullName}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    u.Role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {u.Role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.IsActive
                    ? <span className="text-green-600 text-xs font-semibold">● Active</span>
                    : <span className="text-red-600 text-xs font-semibold">● Disabled</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.Role === 'Admin' ? (
                    <span className="text-xs text-slate-400 italic">All (admin)</span>
                  ) : (
                    <Button variant="secondary" onClick={() => openFor(u)}>
                      Manage Permissions
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400">No users</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Permission matrix modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Permissions — ${selected?.Username || ''}`}
        wide
      >
        {selected && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-4">
              Tick the actions this user is allowed to perform. Admins always have all permissions.
            </div>

            <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Module</th>
                    <th className="text-center px-3 py-2 font-semibold w-20">All</th>
                    {ACTION_ORDER.map((a) => (
                      <th key={a} className="text-center px-3 py-2 font-semibold w-20 capitalize">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(grouped).map((module) => {
                    const perms = grouped[module];
                    const allChecked = perms.every(p => granted.has(p.PermissionKey));
                    return (
                      <tr key={module} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{module}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(e) => toggleModule(module, e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        {ACTION_ORDER.map((action) => {
                          const perm = perms.find(p => p.Action === action);
                          return (
                            <td key={action} className="px-3 py-2 text-center">
                              {perm ? (
                                <input
                                  type="checkbox"
                                  checked={granted.has(perm.PermissionKey)}
                                  onChange={() => toggle(perm.PermissionKey)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mt-4 text-sm">
                ⚠️ {err}
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-slate-500">
                {granted.size} permission{granted.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
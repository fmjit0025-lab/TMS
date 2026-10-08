import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [permissions, setPermissions] = useState(() => {
    try {
      const raw = localStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
    setUser(data.user);
    setPermissions(data.permissions || []);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions([]);
  };

  const isAdmin = user?.Role === 'Admin';

  // Check a specific permission
  const can = (permissionKey) => {
    if (!user) return false;
    if (isAdmin) return true;                       // admin bypasses
    return permissions.includes(permissionKey);
  };

  // Refresh permissions from the server (e.g. after admin changes them)
  const refreshPermissions = async () => {
    const d = await authApi.me();
    setUser(d.user);
    setPermissions(d.permissions || []);
    localStorage.setItem('user', JSON.stringify(d.user));
    localStorage.setItem('permissions', JSON.stringify(d.permissions || []));
  };

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      setLoading(true);
      authApi.me()
        .then((d) => {
          setUser(d.user);
          setPermissions(d.permissions || []);
          localStorage.setItem('user', JSON.stringify(d.user));
          localStorage.setItem('permissions', JSON.stringify(d.permissions || []));
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line

  return (
    <AuthContext.Provider
      value={{ user, permissions, login, logout, isAdmin, can, loading, refreshPermissions }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
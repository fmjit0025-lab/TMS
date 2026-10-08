import { useAuth } from '../context/AuthContext';

// Render children only if user has permission
export function Can({ perm, children, fallback = null }) {
  const { can } = useAuth();
  return can(perm) ? children : fallback;
}

// Route-level guard
import { Navigate } from 'react-router-dom';

export function RequirePermission({ perm, children }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!can(perm)) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">🚫</div>
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm mt-1">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  return children;
}
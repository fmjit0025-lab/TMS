import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { RequirePermission } from './components/PermissionGate';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import PermissionMatrixPage from './pages/PermissionMatrixPage';
import Dashboard from './pages/Dashboard';
import AODPage from './pages/AODPage';
import InvoicePage from './pages/InvoicePage';
import SecondCopyPage from './pages/SecondCopyPage';
import ReturnPage from './pages/ReturnPage';
import QCPage from './pages/QCPage';
import ReplacementPage from './pages/ReplacementPage';
import PipelinePage from './pages/PipelinePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index                  element={<RequirePermission perm="dashboard.view"><Dashboard /></RequirePermission>} />
            <Route path="aod"             element={<RequirePermission perm="aod.view"><AODPage /></RequirePermission>} />
            <Route path="invoices"        element={<RequirePermission perm="invoice.view"><InvoicePage /></RequirePermission>} />
            <Route path="second-copy"     element={<RequirePermission perm="secondcopy.view"><SecondCopyPage /></RequirePermission>} />
            <Route path="returns"         element={<RequirePermission perm="return.view"><ReturnPage /></RequirePermission>} />
            <Route path="qc"              element={<RequirePermission perm="qc.view"><QCPage /></RequirePermission>} />
            <Route path="replacements"    element={<RequirePermission perm="replacement.view"><ReplacementPage /></RequirePermission>} />
            <Route path="pipeline"        element={<RequirePermission perm="pipeline.view"><PipelinePage /></RequirePermission>} />
            <Route path="users"           element={<RequirePermission perm="users.view"><UsersPage /></RequirePermission>} />
            <Route path="permissions"     element={<RequirePermission perm="users.edit"><PermissionMatrixPage /></RequirePermission>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
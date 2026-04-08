import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ProtectedRouter } from '@/components/ProtectedRouter';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import IncidentHistory from '@/pages/IncidentHistory';
import Login from '@/pages/Login';
import NetworkCreator from '@/pages/NetworkCreator';
import PdfTwin from '@/pages/PdfTwin';
import { NetworkManagement } from '@/components/NetworkManagementSimple';

function AppRoutes() {
  const { user, loading } = useAuthContext();

  return (
    <Routes>
      <Route path="/login" element={user && !loading ? <Navigate to="/app/architect" replace /> : <Login />} />
      <Route
        path="/app"
        element={
          <ProtectedRouter>
            <AppShell />
          </ProtectedRouter>
        }
      >
        <Route index element={<Navigate to="architect" replace />} />
        <Route path="architect" element={<NetworkCreator />} />
        <Route path="history" element={<IncidentHistory />} />
        <Route path="pdf" element={<PdfTwin />} />
        <Route path="network" element={<NetworkManagement />} />
        <Route path="creator" element={<Navigate to="architect" replace />} />
        <Route path="myconnection" element={<Navigate to="architect" replace />} />
        <Route path="myhealth" element={<Navigate to="architect" replace />} />
      </Route>
      <Route path="/" element={<Navigate to={user ? '/app/architect' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

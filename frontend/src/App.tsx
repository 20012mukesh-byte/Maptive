import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { ProtectedRouter } from '@/components/ProtectedRouter';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import Login from '@/pages/Login';
import NetworkCreator from '@/pages/NetworkCreator';
import MaptiveDashboard from '@/pages/MaptiveDashboard';
import NetworkAnalysis from '@/pages/NetworkAnalysis';
import { NetworkManagement } from '@/components/NetworkManagementSimple';

const SettingsPage = () => (
  <div className="mx-auto max-w-4xl space-y-8">
    <header>
      <h2 className="text-3xl font-bold tracking-tight text-slate-800">System Settings</h2>
      <p className="mt-1 text-slate-500">Global configurations for your Maptive Enterprise instance.</p>
    </header>
    <div className="grid gap-6">
      <div className="rounded-[24px] border border-white/40 bg-white/70 p-8 backdrop-blur-xl shadow-glass">
        <h3 className="text-lg font-bold text-slate-800 mb-6">AI Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-700">Groq API Connection</p>
              <p className="text-xs text-slate-500">Status: Connected to llama-3.1-8b-instant</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuthContext();

  return (
    <Routes>
      <Route path="/login" element={user && !loading ? <Navigate to="/app/dashboard" replace /> : <Login />} />
      <Route
        path="/app"
        element={
          <ProtectedRouter>
            <AppShell />
          </ProtectedRouter>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<MaptiveDashboard />} />
        <Route path="architect" element={<NetworkCreator />} />
        <Route path="health" element={<NetworkManagement />} />
        <Route path="analysis" element={<NetworkAnalysis />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to={user ? '/app/dashboard' : '/login'} replace />} />
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

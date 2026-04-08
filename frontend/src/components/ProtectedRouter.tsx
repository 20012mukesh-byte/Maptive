import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { firebaseReady } from '@/lib/firebase';

export function ProtectedRouter({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-industrial-bg text-slate-300">
        Loading Maptive...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (firebaseReady && !user.isMock && profileLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-industrial-bg text-slate-300">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400/50 border-t-sky-200" />
        <p className="text-sm">Verifying dashboard access against Firestore...</p>
      </div>
    );
  }

  return <>{children}</>;
}

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { firebaseReady } from '@/lib/firebase';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuthContext();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-industrial-bg text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }

  const waitForDb =
    firebaseReady && !user.isMock && profileLoading;

  if (waitForDb) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-industrial-bg text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <p className="text-sm">Checking account in database…</p>
      </div>
    );
  }

  return <>{children}</>;
}

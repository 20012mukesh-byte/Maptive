import { Activity, AlertTriangle } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { GlassCard } from '@/components/ui/GlassCard';
import { db, firebaseReady } from '@/lib/firebase';
import type { AppUser } from '@/context/AuthContext';

export function SystemHealthWidget({
  breakdownCount,
  uptimePercent,
  averageLatency,
  user,
}: {
  breakdownCount: number;
  uptimePercent: number;
  averageLatency: number;
  user: AppUser | null;
}) {
  const canWrite = Boolean(firebaseReady && db && user && !user.isMock && user.role === 'admin');

  const simulateBreakdown = async () => {
    if (!db || !user) return;
    await setDoc(
      doc(db, 'network_logs', 'R1'),
      {
        nodeId: 'R1',
        status: 'DOWN',
        latencyMs: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  return (
    <GlassCard className="border-slate-500/20 p-4">
      <div className="flex items-center gap-2 text-slate-200">
        <Activity className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold tracking-wide">Network Health</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Down</p>
          <p className="mt-1 text-2xl font-bold text-red-300">{breakdownCount}</p>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Uptime</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{uptimePercent}%</p>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Latency</p>
          <p className="mt-1 text-2xl font-bold text-sky-300">{averageLatency}</p>
          <p className="text-[10px] text-slate-500">ms</p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/90" />
        Firestore collection <code className="text-slate-300">network_logs</code> drives the live glow state and dashboard telemetry.
      </p>
      {canWrite ? (
        <button
          type="button"
          onClick={() => void simulateBreakdown()}
          className="mt-3 w-full rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-950/50"
        >
          Simulate DOWN on R1
        </button>
      ) : (
        <p className="mt-3 text-[11px] text-slate-500">Admin Firebase login required to write live test telemetry.</p>
      )}
    </GlassCard>
  );
}

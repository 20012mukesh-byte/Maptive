import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Gauge, ShieldCheck, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthContext } from '@/context/AuthContext';
import { useBreakdown } from '@/hooks/useBreakdown';
import { firebaseReady } from '@/lib/firebase';

export default function Dashboard() {
  const { user, userProfile } = useAuthContext();
  const breakdown = useBreakdown(Boolean(firebaseReady));
  const { breakdownCount, averageLatency, uptimePercent, records } = breakdown;
  const recent = records.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 5);

  return (
    <div className="h-full overflow-y-auto px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <GlassCard className="overflow-hidden border-sky-500/20 p-6 shadow-glass backdrop-blur-xl">
            <div className="relative">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.14),transparent_38%)]" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-400">Maptive</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-50">AI-powered network simulation cockpit</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                Protected access, live Firestore telemetry, and Grok-generated topologies flowing straight into the React Flow canvas.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/app/creator"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300"
                >
                  Launch canvas <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-2 text-xs text-slate-400">
                  Signed in as <span className="font-medium text-slate-200">{user?.email}</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="border-slate-500/20 p-6 shadow-glass backdrop-blur-xl">
            <div className="flex items-center gap-2 text-slate-200">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-semibold">Access status</h3>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {userProfile?.isFirstLogin
                ? 'First authenticated visit recorded. Your profile is now persisted for future sessions.'
                : 'ProtectedRouter is active and your dashboard session is authenticated.'}
            </p>
            <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/55 p-4 text-sm text-slate-300">
              <p>Role: <span className="capitalize text-slate-100">{user?.role}</span></p>
              <p className="mt-1">Telemetry source: <span className="text-slate-100">{firebaseReady ? 'Firestore network_logs' : 'Local fallback'}</span></p>
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <GlassCard className="border-slate-500/20 p-5">
            <div className="flex items-center gap-2 text-red-300">
              <Activity className="h-5 w-5" />
              <span className="text-sm font-semibold">Breakdown Count</span>
            </div>
            <p className="mt-3 text-4xl font-bold text-slate-50">{breakdownCount}</p>
            <p className="mt-1 text-xs text-slate-500">Nodes currently reporting DOWN</p>
          </GlassCard>
          <GlassCard className="border-slate-500/20 p-5">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-semibold">Uptime</span>
            </div>
            <p className="mt-3 text-4xl font-bold text-slate-50">{uptimePercent}%</p>
            <p className="mt-1 text-xs text-slate-500">Based on active `network_logs` records</p>
          </GlassCard>
          <GlassCard className="border-slate-500/20 p-5">
            <div className="flex items-center gap-2 text-sky-300">
              <Gauge className="h-5 w-5" />
              <span className="text-sm font-semibold">Latency</span>
            </div>
            <p className="mt-3 text-4xl font-bold text-slate-50">{averageLatency} ms</p>
            <p className="mt-1 text-xs text-slate-500">Average across current node telemetry</p>
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="border-slate-500/20 p-5">
            <div className="flex items-center gap-2 text-slate-200">
              <Sparkles className="h-5 w-5 text-sky-300" />
              <h3 className="text-sm font-semibold">2026 UX features</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>Glassmorphism HUD panels with deep blur and layered gradients.</li>
              <li>Live packet animation on active links and dashed blue self-heal redundancy lines.</li>
              <li>Dagre-powered Maptive layouts as soon as Grok returns JSON.</li>
              <li>Realtime Firestore node state driving pulsing red failure visuals.</li>
            </ul>
          </GlassCard>

          <GlassCard className="border-slate-500/20 p-5">
            <h3 className="text-sm font-semibold text-slate-200">Recent telemetry</h3>
            {recent.length ? (
              <div className="mt-4 space-y-2">
                {recent.map((record) => (
                  <div key={record.id} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/45 px-3 py-2 text-sm">
                    <div>
                      <p className="font-mono text-slate-200">{record.nodeId}</p>
                      <p className="text-xs text-slate-500">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'Pending timestamp'}</p>
                    </div>
                    <div className="text-right">
                      <p className={record.status === 'DOWN' ? 'text-red-300' : record.status === 'DEGRADED' ? 'text-amber-300' : 'text-emerald-300'}>{record.status}</p>
                      <p className="text-xs text-slate-500">{typeof record.latencyMs === 'number' ? `${record.latencyMs} ms` : 'n/a'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No telemetry records yet. Add Firebase keys or write to `network_logs` to light this up.</p>
            )}
          </GlassCard>
        </section>
      </div>
    </div>
  );
}

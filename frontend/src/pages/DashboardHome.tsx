import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthContext } from '@/context/AuthContext';
import { useBreakdownLogs } from '@/hooks/useBreakdownLogs';
import { firebaseReady } from '@/lib/firebase';

export default function DashboardHome() {
  const { user, userProfile } = useAuthContext();
  const logsOn = Boolean(firebaseReady);
  const { breakdownCount, rawEvents } = useBreakdownLogs(logsOn);
  const recent = [...rawEvents].slice(-5).reverse();

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {userProfile?.isFirstLogin ? (
          <GlassCard className="border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="text-sm font-semibold text-emerald-100">
              Welcome — first sign-in recorded in the database.
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Source:{' '}
              <span className="font-mono text-emerald-100">
                {userProfile.source === 'firestore' ? 'Firestore users/' : 'Local demo registry'}
              </span>
              . Next visits will update last login only.
            </p>
          </GlassCard>
        ) : null}

        <div>
          <h2 className="text-xl font-semibold text-slate-50">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="text-slate-200">{user?.email}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard className="border-slate-500/20 p-5">
            <div className="flex items-center gap-2 text-violet-300">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">AI network creator</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Describe topologies in plain language (Gemini or local mock). Layout runs with dagre.
            </p>
            <Link
              to="/app/creator"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-400 hover:text-sky-300"
            >
              Open creator <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassCard>

          <GlassCard className="border-slate-500/20 p-5">
            <div className="flex items-center gap-2 text-amber-300">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-semibold">Breakdown trends</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Total breakdown events logged:{' '}
              <span className="font-mono text-lg text-slate-100">{breakdownCount}</span>
              {!logsOn ? (
                <span className="block text-xs text-amber-200/80">
                  Enable Firebase to sync live logs from Firestore.
                </span>
              ) : null}
            </p>
            <Link
              to="/app/trends"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              View trends <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassCard>
        </div>

        {logsOn && recent.length > 0 ? (
          <GlassCard className="border-slate-500/20 p-4">
            <h3 className="text-sm font-semibold text-slate-200">Recent log activity</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              {recent.map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between gap-2 border-b border-slate-800/80 py-1 last:border-0"
                >
                  <span className="font-mono text-slate-300">{e.nodeId}</span>
                  <span
                    className={
                      e.event === 'breakdown' ? 'text-red-400' : 'text-emerald-400'
                    }
                  >
                    {e.event}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
}

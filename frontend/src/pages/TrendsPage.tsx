import { useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useBreakdown } from '@/hooks/useBreakdown';
import { firebaseReady } from '@/lib/firebase';

export default function TrendsPage() {
  const { records, breakdownCount, averageLatency, uptimePercent } = useBreakdown(Boolean(firebaseReady));

  const byStatus = useMemo(() => {
    const groups = new Map<string, number>();
    for (const record of records) {
      groups.set(record.status, (groups.get(record.status) ?? 0) + 1);
    }
    return [...groups.entries()];
  }, [records]);

  const recent = records.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Network telemetry trends</h2>
          <p className="mt-1 text-sm text-slate-400">
            This view summarizes the Firestore <code className="text-slate-300">network_logs</code> collection that drives the canvas health state.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard className="border-slate-500/20 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Current breakdowns</p>
            <p className="mt-2 text-4xl font-bold text-red-300">{breakdownCount}</p>
          </GlassCard>
          <GlassCard className="border-slate-500/20 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Fleet uptime</p>
            <p className="mt-2 text-4xl font-bold text-emerald-300">{uptimePercent}%</p>
          </GlassCard>
          <GlassCard className="border-slate-500/20 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Average latency</p>
            <p className="mt-2 text-4xl font-bold text-sky-300">{averageLatency} ms</p>
          </GlassCard>
        </div>

        <GlassCard className="border-slate-500/20 p-5">
          <h3 className="text-sm font-semibold text-slate-200">Status distribution</h3>
          <div className="mt-4 space-y-4">
            {byStatus.length ? (
              byStatus.map(([status, count]) => {
                const width = records.length ? Math.max(8, Math.round((count / records.length) * 100)) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{status}</span>
                      <span>{count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={status === 'DOWN' ? 'h-full rounded-full bg-red-500/70' : status === 'DEGRADED' ? 'h-full rounded-full bg-amber-500/70' : 'h-full rounded-full bg-emerald-500/70'}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No records yet.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="border-slate-500/20 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Node feed</h3>
          <div className="mt-2 max-h-72 overflow-y-auto text-xs">
            <table className="w-full text-left text-slate-400">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="py-2 pr-2">Node</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Latency</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((record) => (
                  <tr key={record.id} className="border-b border-slate-800/80">
                    <td className="py-1.5 font-mono text-slate-300">{record.nodeId}</td>
                    <td className={record.status === 'DOWN' ? 'text-red-400' : record.status === 'DEGRADED' ? 'text-amber-400' : 'text-emerald-400'}>{record.status}</td>
                    <td>{typeof record.latencyMs === 'number' ? `${record.latencyMs} ms` : 'n/a'}</td>
                    <td className="text-slate-500">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'Pending timestamp'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

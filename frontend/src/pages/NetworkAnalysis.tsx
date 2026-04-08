import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { History, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { db, firebaseReady } from '@/lib/firebase';
import type { IncidentRecord } from '@/types/topology';

function toMillis(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value && 'toMillis' in value) return (value as Timestamp).toMillis();
  return undefined;
}

export default function NetworkAnalysis() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);

  useEffect(() => {
    if (!firebaseReady || !db) return;
    const unsubscribe = onSnapshot(collection(db, 'incident_reports'), (snapshot) => {
      setIncidents(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            latencyMs: typeof data.latency === 'number' ? data.latency : 0,
            packetLoss: typeof data.packet_loss === 'number' ? data.packet_loss : 0,
            locationId: typeof data.location_id === 'string' ? data.location_id : 'Campus Central',
            createdAt: toMillis(data.createdAt ?? data.timestamp),
            resolvedAt: toMillis(data.resolvedAt),
            summary: typeof data.summary === 'string' ? data.summary : 'Link Issue',
          } satisfies IncidentRecord;
        })
      );
    });
    return () => unsubscribe();
  }, []);

  const chartData = useMemo(() => {
    // Generate dummy time-series data for the demo
    return Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      latency: 20 + Math.random() * 40,
      traffic: 400 + Math.random() * 600,
    }));
  }, []);

  const sorted = useMemo(() => [...incidents].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [incidents]);

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 text-center">Infrastructure Analysis</h2>
        <p className="mt-1 text-slate-500 text-center">Diagnostic overview and historical telemetry logs.</p>
      </header>

      {/* Analytics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6 border-white/50 bg-white/60">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
            <h3 className="font-bold uppercase tracking-wider text-xs">Latency Performance (24h)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="ms" />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#4f46e5" fillOpacity={1} fill="url(#colorLat)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-white/50 bg-white/60">
          <div className="flex items-center gap-2 mb-6 text-sky-600">
            <TrendingUp className="h-5 w-5" />
            <h3 className="font-bold uppercase tracking-wider text-xs">Traffic Load (Mbps)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="traffic" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Incident Table */}
      <GlassCard className="p-6 border-white/50">
        <div className="flex items-center gap-2 mb-6">
          <History className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg font-bold">Historical Incident Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-indigo-50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <th className="py-4 pr-3">Summary</th>
                <th className="py-4 pr-3">Location</th>
                <th className="py-4 pr-3">Telemetry</th>
                <th className="py-4 pr-3">Status</th>
                <th className="py-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length > 0 ? sorted.map((incident) => (
                <tr key={incident.id} className="border-b border-indigo-50/50 group hover:bg-indigo-50/20 transition-colors">
                  <td className="py-4 pr-3 font-semibold text-slate-700">{incident.summary}</td>
                  <td className="py-4 pr-3 text-slate-500">{incident.locationId}</td>
                  <td className="py-4 pr-3">
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[10px] font-bold">{incident.latencyMs}ms</span>
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold">{incident.packetLoss}%</span>
                    </div>
                  </td>
                  <td className="py-4 pr-3">
                    {incident.resolvedAt ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-tighter">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-tighter">
                        <AlertTriangle className="h-3 w-3 animate-pulse" /> Active
                      </div>
                    )}
                  </td>
                  <td className="py-4 text-slate-400 tabular-nums">
                    {incident.createdAt ? new Date(incident.createdAt).toLocaleTimeString() : '--'}
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-400 italic">No historical logs found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

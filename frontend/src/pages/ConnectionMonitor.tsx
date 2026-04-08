import { addDoc, collection, onSnapshot, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { AlertTriangle, Cloud, Laptop, MapPinned, Radio, Wifi, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GrokAnalyst } from '@/components/GrokAnalyst';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthContext } from '@/context/AuthContext';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { db, firebaseReady } from '@/lib/firebase';
import { campusMapLocations } from '@/lib/themes';
import type { IncidentRecord } from '@/types/topology';

function toMillis(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value && 'toMillis' in value) return (value as Timestamp).toMillis();
  return undefined;
}

export default function ConnectionMonitor() {
  const { user } = useAuthContext();
  const { monitor, locationId, setLocationId } = useNetworkMonitor('lab_a');
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!firebaseReady || !db) return;
    const unsubscribe = onSnapshot(collection(db, 'incident_reports'), (snapshot) => {
      setIncidents(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            uid: typeof data.uid === 'string' ? data.uid : undefined,
            email: typeof data.email === 'string' ? data.email : null,
            latencyMs: typeof data.latency === 'number' ? data.latency : 0,
            packetLoss: typeof data.packet_loss === 'number' ? data.packet_loss : 0,
            locationId: typeof data.location_id === 'string' ? data.location_id : 'lab_a',
            connectionType: typeof data.connection_type === 'string' ? data.connection_type : undefined,
            createdAt: toMillis(data.createdAt ?? data.timestamp),
            resolvedAt: toMillis(data.resolvedAt),
            summary: typeof data.summary === 'string' ? data.summary : undefined,
            explanation: typeof data.explanation === 'string' ? data.explanation : undefined,
            edgeId: typeof data.edgeId === 'string' ? data.edgeId : undefined,
          } satisfies IncidentRecord;
        })
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseReady || !db || !user || user.isMock) return;
    if (!monitor.breakdownDetected) {
      loggedRef.current = false;
      return;
    }
    if (loggedRef.current) return;
    loggedRef.current = true;

    void addDoc(collection(db, 'incident_reports'), {
      uid: user.uid,
      email: user.email,
      latency: monitor.pingMs,
      packet_loss: monitor.packetLoss,
      location_id: locationId,
      connection_type: monitor.connectionType,
      summary: `BREAKDOWN: Connection degraded near ${locationId}`,
      createdAt: serverTimestamp(),
    });
  }, [locationId, monitor, user]);

  const byLocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const incident of incidents) {
      map.set(incident.locationId, (map.get(incident.locationId) ?? 0) + 1);
    }
    return map;
  }, [incidents]);

  return (
    <div className="h-full overflow-y-auto bg-[#f0f9ff] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="border-white/40 p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-sky-500">MyHealth</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-800">University connection diagnostics</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">Live browser telemetry, background ping sampling, automatic breakdown logging, and AI recovery suggestions in one arctic glass workspace.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-white/40 bg-white/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Connection Type</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{monitor.connectionType}</p>
              </div>
              <div className="rounded-[24px] border border-white/40 bg-white/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Latency</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{monitor.pingMs >= 0 ? `${monitor.pingMs} ms` : 'offline'}</p>
              </div>
              <div className="rounded-[24px] border border-white/40 bg-white/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Packet Loss</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{monitor.packetLoss}%</p>
              </div>
              <div className="rounded-[24px] border border-white/40 bg-white/30 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Downlink</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{monitor.downlink || 0} Mbps</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="border-white/40 p-6">
            <div className="flex items-center gap-2 text-slate-700"><Radio className="h-5 w-5 text-sky-500" /><h3 className="text-sm font-semibold">Breakdown dashboard</h3></div>
            {monitor.breakdownDetected ? (
              <div className="mt-4 rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-4 text-rose-600 shadow-[0_0_0_1px_rgba(255,45,85,0.35),0_0_28px_rgba(255,45,85,0.22)]">
                <div className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" /> Breakdown Detected</div>
                <p className="mt-2 text-sm">Packet loss above 5% or latency above 200ms triggered incident logging.</p>
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-emerald-200/80 bg-emerald-50/80 p-4 text-emerald-700 shadow-[0_0_0_1px_rgba(167,243,208,0.55),0_0_24px_rgba(167,243,208,0.2)]">
                <div className="flex items-center gap-2 text-sm font-semibold"><Wifi className="h-4 w-4" /> Link Healthy</div>
                <p className="mt-2 text-sm">Your laptop path is currently stable with no immediate breakdown indicators.</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
              <MapPinned className="h-4 w-4 text-sky-500" />
              <label htmlFor="location_id">Campus location</label>
              <select id="location_id" value={locationId} onChange={(event) => setLocationId(event.target.value)} className="rounded-xl border border-white/40 bg-white/40 px-3 py-2 text-sm text-slate-700 outline-none">
                {Object.entries(campusMapLocations).map(([id, location]) => <option key={id} value={id}>{location.label}</option>)}
              </select>
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="overflow-hidden border-white/40 p-6">
            <div className="flex items-center gap-2 text-slate-700"><Laptop className="h-5 w-5 text-sky-500" /><h3 className="text-sm font-semibold">My Laptop node</h3></div>
            <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-[32px] border border-white/40 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.24),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.34))] p-6">
              <div className="relative flex w-full max-w-4xl items-center justify-between gap-6">
                <motion.div
                  className="relative w-48 rounded-[32px] border border-white/40 bg-white/40 p-6 shadow-[0_20px_50px_rgba(148,163,184,0.18)]"
                  animate={monitor.breakdownDetected ? { scale: [1, 1.03, 1], boxShadow: ['0 0 0 rgba(255,45,85,0)', '0 0 0 10px rgba(255,45,85,0.22)', '0 0 0 rgba(255,45,85,0)'] } : { y: [0, -8, 0] }}
                  transition={{ duration: monitor.breakdownDetected ? 1.1 : 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="absolute inset-x-6 bottom-[-18px] h-6 rounded-full bg-slate-300/35 blur-xl" />
                  <Laptop className="h-14 w-14 text-sky-500" />
                  <p className="mt-4 text-lg font-semibold text-slate-800">My Laptop</p>
                  <p className="mt-1 text-sm text-slate-500">{monitor.breakdownDetected ? 'Attention required' : 'Soft green glow means healthy link'}</p>
                  <div className={`mt-4 h-2 rounded-full ${monitor.breakdownDetected ? 'bg-rose-300' : 'bg-emerald-300'}`} />
                </motion.div>

                <div className="relative hidden flex-1 items-center justify-center md:flex">
                  <motion.div className={monitor.breakdownDetected ? 'h-1 w-full rounded-full bg-rose-300 shadow-[0_0_20px_rgba(255,45,85,0.45)]' : monitor.weakSignal ? 'h-1 w-full rounded-full bg-amber-300 shadow-[0_0_20px_rgba(253,186,116,0.55)]' : 'h-1 w-full rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(167,243,208,0.65)]'} animate={monitor.breakdownDetected ? { opacity: [1, 0.2, 1] } : monitor.weakSignal ? { opacity: [1, 0.35, 1] } : { opacity: [0.8, 1, 0.8] }} transition={{ duration: monitor.breakdownDetected ? 0.8 : 1.6, repeat: Infinity, ease: 'easeInOut' }} />
                  <motion.div className="absolute h-4 w-4 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.8)]" animate={{ x: ['-48%', '48%', '-48%'] }} transition={{ duration: monitor.breakdownDetected ? 5 : 3.2, repeat: Infinity, ease: 'easeInOut' }} />
                </div>

                <motion.div className="relative w-44 rounded-[32px] border border-white/40 bg-white/40 p-6 shadow-[0_20px_50px_rgba(148,163,184,0.18)]" animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <div className="absolute inset-x-6 bottom-[-18px] h-6 rounded-full bg-slate-300/35 blur-xl" />
                  <Cloud className="h-14 w-14 text-sky-400" />
                  <p className="mt-4 text-lg font-semibold text-slate-800">College Cloud</p>
                  <p className="mt-1 text-sm text-slate-500">Gateway edge</p>
                </motion.div>
              </div>
            </div>
          </GlassCard>

          <GrokAnalyst
            incident={monitor.breakdownDetected ? {
              id: 'local',
              latencyMs: monitor.pingMs,
              packetLoss: monitor.packetLoss,
              locationId,
            } : null}
            onExplanation={setAnalysis}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <GlassCard className="border-white/40 p-6">
            <div className="flex items-center gap-2 text-slate-700"><MapPinned className="h-5 w-5 text-sky-500" /><h3 className="text-sm font-semibold">Campus-Wide Heatmap</h3></div>
            <div className="mt-6 relative h-[340px] overflow-hidden rounded-[28px] border border-white/40 bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.45),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.54))]">
              {Object.entries(campusMapLocations).map(([id, location]) => {
                const count = byLocation.get(id) ?? 0;
                return (
                  <div key={id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: location.x, top: location.y }}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full border text-sm font-semibold ${count > 0 ? 'border-rose-200 bg-rose-100/80 text-rose-600' : 'border-sky-100 bg-white/70 text-slate-500'}`}>
                      {count}
                    </div>
                    <p className="mt-2 whitespace-nowrap text-center text-xs text-slate-600">{location.label}</p>
                  </div>
                );
              })}
            </div>
            {analysis ? (
              <div className="mt-4 rounded-[22px] border border-white/40 bg-white/40 p-4 text-sm text-slate-700">{analysis}</div>
            ) : null}
          </GlassCard>

          <GlassCard className="border-white/40 p-6">
            <div className="flex items-center gap-2 text-slate-700"><Wrench className="h-5 w-5 text-sky-500" /><h3 className="text-sm font-semibold">AI Fix Suggestions</h3></div>
            <p className="mt-3 text-sm text-slate-600">Use the Grok analyst button to generate incident-specific explanations and fixes. Each breakdown also logs to Firestore `incident_reports`.</p>
            <div className="mt-4 rounded-[22px] border border-white/40 bg-white/40 p-4 text-sm text-slate-700">
              Live state: {monitor.online ? 'Online' : 'Offline'} | Ping {monitor.pingMs >= 0 ? `${monitor.pingMs} ms` : 'n/a'} | Packet loss {monitor.packetLoss}%
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

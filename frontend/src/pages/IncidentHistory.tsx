import { collection, onSnapshot, type Timestamp, updateDoc, doc } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { db, firebaseReady } from '@/lib/firebase';
import type { IncidentRecord } from '@/types/topology';

function toMillis(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value && 'toMillis' in value) return (value as Timestamp).toMillis();
  return undefined;
}

function durationMinutes(createdAt?: number, resolvedAt?: number) {
  if (!createdAt) return 'n/a';
  const end = resolvedAt ?? Date.now();
  const mins = Math.max(1, Math.round((end - createdAt) / 60000));
  return `${mins} min`;
}

export default function IncidentHistory() {
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
            locationId: typeof data.location_id === 'string' ? data.location_id : 'lab_a',
            createdAt: toMillis(data.createdAt ?? data.timestamp),
            resolvedAt: toMillis(data.resolvedAt),
            summary: typeof data.summary === 'string' ? data.summary : 'Breakdown',
            explanation: typeof data.explanation === 'string' ? data.explanation : undefined,
          } satisfies IncidentRecord;
        })
      );
    });
    return () => unsubscribe();
  }, []);

  const sorted = useMemo(() => [...incidents].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [incidents]);

  const markResolved = async (id: string) => {
    if (!firebaseReady || !db) return;
    await updateDoc(doc(db, 'incident_reports', id), { resolvedAt: Date.now() });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f0f9ff] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <GlassCard className="border-white/40 p-6">
          <h2 className="text-2xl font-semibold text-slate-800">Incident History</h2>
          <p className="mt-2 text-sm text-slate-600">Every breakdown and AI explanation saved in Firestore `incident_reports`.</p>
        </GlassCard>

        <GlassCard className="border-white/40 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-white/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Summary</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Latency</th>
                  <th className="py-2 pr-3">Packet Loss</th>
                  <th className="py-2 pr-3">Opened</th>
                  <th className="py-2 pr-3">Resolved</th>
                  <th className="py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((incident) => (
                  <tr key={incident.id} className="border-b border-white/30">
                    <td className="py-2 pr-3 font-semibold text-slate-700">{incident.summary}</td>
                    <td className="py-2 pr-3">{incident.locationId}</td>
                    <td className="py-2 pr-3">{incident.latencyMs} ms</td>
                    <td className="py-2 pr-3">{incident.packetLoss}%</td>
                    <td className="py-2 pr-3">{incident.createdAt ? new Date(incident.createdAt).toLocaleString() : 'n/a'}</td>
                    <td className="py-2 pr-3">
                      {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : (
                        <button type="button" onClick={() => void markResolved(incident.id)} className="rounded-full border border-white/50 bg-white/50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white/70">Mark Resolved</button>
                      )}
                    </td>
                    <td className="py-2">{durationMinutes(incident.createdAt, incident.resolvedAt)}</td>
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

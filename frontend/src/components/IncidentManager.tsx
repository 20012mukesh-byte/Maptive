import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  type Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, firebaseReady } from '@/lib/firebase';
import type { IncidentRecord, TopologyEdgeSpec } from '@/types/topology';

// ─── helpers ─────────────────────────────────────────────────────────────────

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value && 'toMillis' in value)
    return (value as Timestamp).toMillis();
  return undefined;
}

function mockEdgeFailure(edges: TopologyEdgeSpec[]) {
  if (!edges.length) return null;
  const edge = edges[Math.floor(Math.random() * edges.length)];
  return {
    id: `mock-${Date.now()}`,
    latencyMs: 240,
    packetLoss: 12,
    locationId: 'lab_a',
    createdAt: Date.now(),
    summary: `BREAKDOWN: Connection lost between ${edge.source} and ${edge.target}`,
    edgeId: edge.id,
  } satisfies IncidentRecord;
}

// ─── Duration for auto-dismiss toasts (ms) ───────────────────────────────────

const TOAST_DURATION_MS = 30_000;

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useIncidentManager({
  edges,
  enabled,
}: {
  edges: TopologyEdgeSpec[];
  enabled: boolean;
}) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [activeIncident, setActiveIncident] = useState<IncidentRecord | null>(null);
  // IDs the user has manually dismissed (only hides from toast; doesn't resolve)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  // ── 1. Firestore live listener ────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !firebaseReady || !db) {
      setIncidents([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'incident_reports'), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          latencyMs: typeof data.latency === 'number' ? data.latency : 0,
          packetLoss: typeof data.packet_loss === 'number' ? data.packet_loss : 0,
          locationId: typeof data.location_id === 'string' ? data.location_id : 'lab_a',
          createdAt: toMillis(data.createdAt ?? data.timestamp),
          resolvedAt: toMillis(data.resolvedAt),
          summary: typeof data.summary === 'string' ? data.summary : undefined,
          explanation: typeof data.explanation === 'string' ? data.explanation : undefined,
          edgeId: typeof data.edgeId === 'string' ? data.edgeId : undefined,
        } satisfies IncidentRecord;
      });
      setIncidents(list);
    });
    return () => unsubscribe();
  }, [enabled]);

  // ── 2. Mock mode fallback ─────────────────────────────────────────────────
  useEffect(() => {
    if (!edges.length) return;
    if (enabled && firebaseReady && db) return;
    const interval = setInterval(() => {
      const incident = mockEdgeFailure(edges);
      if (incident) {
        setIncidents((current) => [incident, ...current].slice(0, 12));
      }
    }, 24_000);
    return () => clearInterval(interval);
  }, [edges, enabled]);

  // ── 3. Active incident (latest unresolved) ────────────────────────────────
  useEffect(() => {
    if (!incidents.length) {
      setActiveIncident(null);
      return;
    }
    const latest = [...incidents]
      .filter((i) => !i.resolvedAt)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    setActiveIncident(latest ?? null);
  }, [incidents]);

  // ── 4. brokenEdgeIds: unresolved incidents with an edgeId ──────────────────
  const brokenEdgeIds = useMemo(
    () =>
      incidents
        .filter((incident) => !incident.resolvedAt && incident.edgeId)
        .map((incident) => incident.edgeId!)
        .slice(0, 3),
    [incidents]
  );

  // ── 5. Auto-resolve: watch when a brokenEdge disappears ───────────────────
  //    We compare the previous broken set against the new one; any ID that
  //    was broken before but is no longer broken gets auto-resolved.
  const prevBrokenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentSet = new Set(brokenEdgeIds);
    const recovered: string[] = [];

    prevBrokenRef.current.forEach((edgeId) => {
      if (!currentSet.has(edgeId)) recovered.push(edgeId);
    });

    if (recovered.length) {
      const resolvedAt = Date.now();
      recovered.forEach((edgeId) => {
        // Find every unresolved incident that matches this edgeId
        const targets = incidents.filter(
          (i) => i.edgeId === edgeId && !i.resolvedAt
        );

        if (firebaseReady && db) {
          // Write resolvedAt to Firestore for real incidents
          targets.forEach((incident) => {
            updateDoc(doc(db!, 'incident_reports', incident.id), {
              resolvedAt,
            }).catch(() => {/* swallow; Firestore will sync live */});
          });
        } else {
          // Mock mode: resolve in local state
          setIncidents((current) =>
            current.map((i) =>
              i.edgeId === edgeId && !i.resolvedAt ? { ...i, resolvedAt } : i
            )
          );
        }
      });
    }

    prevBrokenRef.current = currentSet;
  }, [brokenEdgeIds, incidents]);

  // ── 6. Dismiss handler (local-only, does not write resolvedAt) ────────────
  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  return { incidents, activeIncident, brokenEdgeIds, dismissedIds, dismiss };
}

// ─── Toast stack component ────────────────────────────────────────────────────

function ToastCountdownRing({ createdAt }: { createdAt?: number }) {
  const [remaining, setRemaining] = useState(TOAST_DURATION_MS);

  useEffect(() => {
    const origin = createdAt ?? Date.now();
    const tick = () => {
      const elapsed = Date.now() - origin;
      setRemaining(Math.max(0, TOAST_DURATION_MS - elapsed));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [createdAt]);

  const pct = remaining / TOAST_DURATION_MS; // 1 → 0
  const r = 10;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      className="shrink-0 rotate-[-90deg]"
      aria-label={`${Math.ceil(remaining / 1000)}s`}
    >
      <circle cx={14} cy={14} r={r} fill="none" stroke="#e2e8f0" strokeWidth={2.5} />
      <circle
        cx={14}
        cy={14}
        r={r}
        fill="none"
        stroke={remaining < 8000 ? '#fb923c' : '#38bdf8'}
        strokeWidth={2.5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s linear' }}
      />
      <text
        x={14}
        y={14}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={7}
        fontWeight={700}
        fill="#475569"
        style={{ rotate: '90deg', transformOrigin: '50% 50%', transform: 'rotate(90deg)' }}
      >
        {Math.ceil(remaining / 1000)}
      </text>
    </svg>
  );
}

interface IncidentToastStackProps {
  incidents: IncidentRecord[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
}

export function IncidentToastStack({
  incidents,
  dismissedIds,
  onDismiss,
}: IncidentToastStackProps) {
  // Auto-dismiss after TOAST_DURATION_MS by adding to dismissedIds
  const [autoDismissed, setAutoDismissed] = useState<Set<string>>(() => new Set());

  const active = useMemo(
    () =>
      [...incidents]
        .filter((i) => !i.resolvedAt && !dismissedIds.has(i.id) && !autoDismissed.has(i.id))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 3),
    [incidents, dismissedIds, autoDismissed]
  );

  // Set a timer per toast for auto-dismiss
  useEffect(() => {
    if (!active.length) return;
    const timers = active.map((incident) => {
      const elapsed = Date.now() - (incident.createdAt ?? Date.now());
      const delay = Math.max(0, TOAST_DURATION_MS - elapsed);
      return window.setTimeout(() => {
        setAutoDismissed((prev) => new Set([...prev, incident.id]));
      }, delay);
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!active.length) return null;

  return (
    <div className="pointer-events-none flex flex-col gap-2">
      {active.map((incident) => (
        <div
          key={incident.id}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-glass backdrop-blur-2xl"
          style={{
            animation: 'slideInRight 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">
              {incident.summary ?? 'BREAKDOWN: Connection lost'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Latency {incident.latencyMs}&thinsp;ms &middot; Packet loss {incident.packetLoss}%
            </div>
          </div>
          <ToastCountdownRing createdAt={incident.createdAt} />
          <button
            type="button"
            onClick={() => onDismiss(incident.id)}
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert } from 'lucide-react';
import type { IncidentRecord } from '@/types/topology';

interface IncidentToastStackProps {
  incidents: IncidentRecord[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
}

export function IncidentToastStack({ incidents, dismissedIds, onDismiss }: IncidentToastStackProps) {
  const visible = incidents.filter(i => !dismissedIds.has(i.id)).slice(0, 3);

  return (
    <div className="flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {visible.map((incident) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="pointer-events-auto w-80 rounded-2xl border border-red-200 bg-white/90 p-4 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 truncate">{incident.summary}</h4>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  {incident.locationId} · {incident.latencyMs}ms latency
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    Broken
                  </span>
                </div>
              </div>
              <button
                onClick={() => onDismiss(incident.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

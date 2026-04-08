import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { Edge } from '@xyflow/react';
import type { RFNode } from '@/types/topology';

export type TopologySnapshot = {
  nodes: RFNode[];
  edges: Edge[];
  failedIds: string[];
  label: string;
  t: number;
};

export function TimeTravelBar({
  snapshots,
  index,
  onIndexChange,
}: {
  snapshots: TopologySnapshot[];
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const max = Math.max(0, snapshots.length - 1);
  const safe = Math.min(Math.max(0, index), max);

  const label = useMemo(() => {
    if (!snapshots.length) return 'No history yet';
    const s = snapshots[safe];
    return s?.label ?? `T-${safe}`;
  }, [snapshots, safe]);

  return (
    <GlassCard className="flex items-center gap-3 border-slate-500/25 px-4 py-2.5 shadow-glass backdrop-blur-xl">
      <History className="h-4 w-4 shrink-0 text-sky-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Time travel
        </p>
        <p className="truncate text-xs text-slate-300">{label}</p>
        <input
          type="range"
          min={0}
          max={max}
          value={safe}
          disabled={!snapshots.length}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-500 disabled:opacity-40"
        />
      </div>
      <motion.span
        key={safe}
        initial={{ scale: 0.92, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className="shrink-0 font-mono text-[11px] text-sky-400"
      >
        {snapshots.length ? `${safe + 1}/${snapshots.length}` : '—'}
      </motion.span>
    </GlassCard>
  );
}

import { memo, useMemo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { DeviceIcon } from '@/components/icons/NetworkIcons';
import { labelForVlan } from '@/lib/parseTopologyJson';
import { cn } from '@/lib/utils';
import type { NetworkNodeData } from '@/types/topology';

type RFNetworkNode = Node<NetworkNodeData, 'network'>;

const glowFor = (data: NetworkNodeData) => {
  const halo = data.vlanColor ?? '#bfdbfe';
  if (data.failed || data.status === 'offline') {
    return '0 0 0 1px rgba(255,45,85,0.7), 0 16px 30px rgba(255,45,85,0.25), 0 0 36px rgba(255,45,85,0.55)';
  }
  if (data.highlighted) {
    return '0 0 0 1px rgba(14,165,233,0.35), 0 12px 28px rgba(14,165,233,0.18), 0 0 24px rgba(14,165,233,0.24)';
  }
  if (data.status === 'warning') {
    return '0 0 0 1px rgba(253,186,116,0.4), 0 14px 26px rgba(253,186,116,0.22), 0 0 28px rgba(253,186,116,0.3)';
  }
  return `0 0 0 1px ${halo}55, 0 16px 32px rgba(148,163,184,0.15), 0 0 30px ${halo}55`;
};

function NetworkNodeInner({ id, data, selected }: NodeProps<RFNetworkNode>) {
  const failed = Boolean(data.failed || data.status === 'offline');
  
  // Create a stable stagger delay based on the node ID
  const delay = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 15 * 0.04; // 0 to 0.56s delay
  }, [id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1, boxShadow: glowFor(data) }}
      transition={{ type: 'spring', stiffness: 280, damping: 20, delay }}
      className={cn(
        'relative w-[210px] overflow-hidden rounded-[24px] border px-3 py-2 backdrop-blur-2xl',
        'bg-[linear-gradient(160deg,rgba(255,255,255,0.7),rgba(255,255,255,0.32))]',
        'border-white/40 shadow-[0_18px_45px_rgba(148,163,184,0.18)]',
        selected && 'ring-2 ring-sky-300/60',
        failed && 'border-rose-200/80 animate-pulse-failure',
        data.status === 'warning' && !failed && 'border-orange-200/80'
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-1.5 rounded-b-full" style={{ backgroundColor: data.vlanColor ?? '#bfdbfe' }} />
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-none !bg-sky-400" />
      <div className="relative flex items-start gap-2">
        <div className="rounded-2xl border border-white/50 bg-white/65 p-2 shadow-sm">
          <DeviceIcon type={data.deviceType} className="h-10 w-10 shrink-0 text-sky-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {data.deviceType}
          </div>
          <div className="truncate text-sm font-semibold text-slate-800">{data.label}</div>
          <div className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${data.vlanColor ?? '#bfdbfe'}33`, color: '#0f172a' }}>
            {labelForVlan(data.vlanId)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider">
            {failed ? (
              <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-500 ring-1 ring-rose-200/80">
                Down
              </span>
            ) : data.status === 'warning' ? (
              <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 font-bold text-orange-500 ring-1 ring-orange-200/80">
                Warning
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-600 ring-1 ring-emerald-200/80">
                Healthy
              </span>
            )}
            {typeof data.latencyMs === 'number' ? <span className="text-slate-500">{data.latencyMs} ms</span> : null}
          </div>
          {data.campusZone ? (
            <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{data.campusZone}</div>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-none !bg-sky-400" />
    </motion.div>
  );
}

export const NetworkNode = memo(NetworkNodeInner);

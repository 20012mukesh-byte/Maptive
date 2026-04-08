import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { resolveCliTargets } from '@/lib/cliHighlight';
export function CiscoCliOverlay({
  open,
  onClose,
  nodeIds,
  onHighlight,
  onMessage,
}: {
  open: boolean;
  onClose: () => void;
  nodeIds: string[];
  onHighlight: (ids: string[]) => void;
  onMessage: (text: string) => void;
}) {
  const [cmd, setCmd] = useState('');

  const run = (e: FormEvent) => {
    e.preventDefault();
    const line = cmd.trim();
    if (!line) return;
    const { message, ids } = resolveCliTargets(line, nodeIds);
    onHighlight(ids);
    onMessage(`[CLI] ${message}`);
    setCmd('');
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm md:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="w-full max-w-lg"
          >
            <GlassCard className="border-emerald-500/25 shadow-glass backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-600/30 px-4 py-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Terminal className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Cisco CLI (simulated)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={run} className="p-4">
                <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                  Try: <code className="text-slate-400">conf t</code>,{' '}
                  <code className="text-slate-400">int g0/0</code>,{' '}
                  <code className="text-slate-400">show ip int brief</code>, or a node id.
                </p>
                <div className="flex gap-2">
                  <input
                    value={cmd}
                    onChange={(e) => setCmd(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-600/50 bg-slate-950/70 px-3 py-2 font-mono text-sm text-emerald-100 outline-none ring-emerald-500/0 focus:ring-2 focus:ring-emerald-500/35"
                    placeholder="Router(config)# "
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-700/80 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-emerald-600/90"
                  >
                    Enter
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

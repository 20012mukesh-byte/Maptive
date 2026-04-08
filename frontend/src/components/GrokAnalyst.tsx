import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, MessageSquareText } from 'lucide-react';
import { analyzeIncident } from '@/lib/grok';
import { suggestIncidentCause } from '@/lib/incidentLogic';
import type { IncidentRecord, NetworkLogRecord } from '@/types/topology';

export function GrokAnalyst({
  incident,
  history = [],
  onExplanation,
}: {
  incident: IncidentRecord | null;
  history?: NetworkLogRecord[];
  onExplanation?: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!incident) return;
    setBusy(true);
    try {
      const text = await analyzeIncident(incident, history);
      setAnalysis(text);
      onExplanation?.(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="border-white/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700">
          <MessageSquareText className="h-4 w-4 text-sky-500" />
          <h3 className="text-sm font-semibold">Grok Analyst</h3>
        </div>
        <button
          type="button"
          onClick={() => void runAnalysis()}
          disabled={!incident || busy}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white/70 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Consult Grok'}
        </button>
      </div>
      <div className="mt-3 text-sm text-slate-600">
        {analysis ?? suggestIncidentCause(incident)}
      </div>
    </GlassCard>
  );
}

import { useState, type FormEvent } from 'react';
import confetti from 'canvas-confetti';
import { Gauge, Loader2, Send, Sparkles, Wrench } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { generateTopology, hasGrokApiKey, predictBottlenecks, suggestHealthFixes } from '@/lib/grok';
import { cn } from '@/lib/utils';
import type { NetworkMonitorState, TopologyPayload } from '@/types/topology';
import { PdfUploadInline } from '@/components/PdfUploadInline';

type Message = { role: 'user' | 'ai'; text: string };

function celebrateComplex(nodeCount: number) {
  if (nodeCount < 5) return;
  void confetti({ particleCount: Math.min(120, 40 + nodeCount * 8), spread: 72, origin: { y: 0.72 }, colors: ['#0ea5e9', '#7dd3fc', '#a7f3d0', '#fdba74'] });
}

export function ChatInterface({
  disabled,
  applyTopology,
  applySelfHeal,
  highlightBottlenecks,
  getTopology,
  monitorState,
  onFixSuggestions,
  onSavePrompt,
  onPdfProcessed,
}: {
  disabled?: boolean;
  applyTopology: (payload: TopologyPayload) => void;
  applySelfHeal: (payload: TopologyPayload) => void;
  highlightBottlenecks: (payload: TopologyPayload) => void;
  getTopology: () => TopologyPayload | null;
  monitorState?: NetworkMonitorState | null;
  onFixSuggestions?: (suggestions: string[]) => void;
  onSavePrompt?: (prompt: string) => Promise<void>;
  onPdfProcessed?: (file: File, content: string, payload: TopologyPayload) => void;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: hasGrokApiKey()
        ? 'Grok is ready. Ask for a university topology and I will return strict JSON with VLAN IDs.'
        : 'Grok is not configured, so local demo generation is active. VLAN halos and layout still work.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [healing, setHealing] = useState(false);
  const [testingSpeed, setTestingSpeed] = useState(false);
  const [suggestingFix, setSuggestingFix] = useState(false);

  const pushAi = (text: string) => setMessages((current) => [...current, { role: 'ai', text }]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || disabled || busy) return;

    setInput('');
    setMessages((current) => [...current, { role: 'user', text: prompt }]);
    setBusy(true);

    try {
      const payload = await generateTopology(prompt);
      
      if (onSavePrompt) {
        try {
          await onSavePrompt(prompt);
        } catch (saveError) {
          console.error('Error saving prompt:', saveError);
        }
      }
      
      applyTopology(payload);
      celebrateComplex(payload.nodes.length);
      pushAi(`Topology deployed. ${payload.nodes.length} nodes now grouped by VLAN halo and floated into place.`);
    } catch (error) {
      pushAi(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const onSelfHeal = async () => {
    if (disabled || healing) return;
    const topology = getTopology();
    if (!topology) {
      pushAi('Generate a topology first so the AI architect has a network to enhance.');
      return;
    }
    setHealing(true);
    try {
      applySelfHeal({ nodes: [], edges: [{ id: `heal-${Date.now()}`, source: topology.nodes[0]?.id ?? '', target: topology.nodes[1]?.id ?? '', label: 'Redundant uplink', healing: true }] });
      pushAi('A redundant recovery link was added as a soft blue dashed path.');
    } finally {
      setHealing(false);
    }
  };

  const onSpeedTest = async () => {
    const topology = getTopology();
    if (!topology || testingSpeed) return;
    setTestingSpeed(true);
    try {
      const payload = await predictBottlenecks(topology);
      highlightBottlenecks(payload);
      pushAi('Speed test simulation complete. Potential bottlenecks are now highlighted in soft orange.');
    } catch (error) {
      pushAi(error instanceof Error ? error.message : String(error));
    } finally {
      setTestingSpeed(false);
    }
  };

  const onHealthFix = async () => {
    if (!monitorState || !monitorState.breakdownDetected || suggestingFix) return;
    setSuggestingFix(true);
    try {
      const suggestions = await suggestHealthFixes(monitorState);
      onFixSuggestions?.(suggestions);
      pushAi(`Heal with Grok suggestions:\n- ${suggestions.join('\n- ')}`);
    } catch (error) {
      pushAi(error instanceof Error ? error.message : String(error));
    } finally {
      setSuggestingFix(false);
    }
  };

  return (
    <GlassCard className="flex h-full min-h-0 flex-col overflow-hidden border-white/20 bg-white/40 shadow-glass backdrop-blur-xl">
      <div className="border-b border-white/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-500" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-800">AI Architect</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Light glass chat, VLAN-aware JSON, bottleneck prediction, and healing suggestions.</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={cn('max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm', message.role === 'user' ? 'ml-auto bg-sky-500/15 text-slate-800 ring-1 ring-sky-200/70' : 'mr-auto bg-white/70 text-slate-700 ring-1 ring-white/50')}>
            {message.text}
          </div>
        ))}
      </div>
      <div className="border-t border-white/20 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Architect controls</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void onSpeedTest()} disabled={disabled || testingSpeed} className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200/80 bg-orange-50/80 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50">
              {testingSpeed ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
              Speed Test Simulation
            </button>
            <button type="button" onClick={() => void onSelfHeal()} disabled={disabled || healing} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50">
              {healing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              Auto-Heal Link
            </button>
            {monitorState?.breakdownDetected ? (
              <button type="button" onClick={() => void onHealthFix()} disabled={suggestingFix} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                {suggestingFix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Heal with Grok
              </button>
            ) : null}
          </div>
        </div>
        
        <form onSubmit={onSubmit} className="flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} disabled={disabled || busy} placeholder={disabled ? 'Admin only' : 'Create a university lab network for 20 workstations'} className="min-w-0 flex-1 rounded-2xl border border-white/30 bg-white/50 px-4 py-3 text-sm text-slate-800 outline-none ring-sky-500/0 transition focus:ring-2 focus:ring-sky-300/60 disabled:opacity-50" />
          <button type="submit" disabled={disabled || busy} className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">PDF Document Source</p>
          <PdfUploadInline 
            onPdfProcessed={(file, content, payload) => {
              pushAi(`📄 Processing PDF: ${file.name}...`);
              onPdfProcessed?.(file, content, payload);
              pushAi(`✅ Network generated from PDF! ${payload.nodes.length} nodes added.`);
            }}
            className="border-white/10 bg-white/10"
          />
        </div>
      </div>
    </GlassCard>
  );
}

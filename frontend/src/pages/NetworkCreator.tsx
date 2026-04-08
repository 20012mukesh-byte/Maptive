import { AnimatePresence, motion } from 'framer-motion';
import {
  FileDown,
  LayoutDashboard,
  Terminal,
  Upload as UploadIcon,
  UploadCloud,
  Save,
  Sparkles
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useBreakdown } from '@/hooks/useBreakdown';
import { useIncidentManager } from '@/hooks/useIncidentManager';
import { 
  exportCiscoConfig as exportTxt 
} from '@/lib/exportTopology';
import { db, firebaseReady } from '@/lib/firebase';
import type { TopologyPayload, NodeHealthStatus } from '@/types/topology';
import { NetworkCanvas, type NetworkCanvasHandle } from '@/components/NetworkCanvas';
import { ChatInterface } from '@/components/ChatInterface';
import { GlassCard } from '@/components/ui/GlassCard';
import { CiscoCliOverlay } from '@/components/CiscoCliOverlay';
import { GrokAnalyst } from '@/components/GrokAnalyst';
import { IncidentToastStack } from '../components/IncidentToastStack';
import { PdfUploadInline } from '@/components/PdfUploadInline';
import { FileUploader } from '@/components/FileUploader';
import { savePdf, saveLayout } from '@/lib/mockDb';

export default function NetworkCreator() {
  const { user } = useAuthContext();
  const canvasRef = useRef<NetworkCanvasHandle>(null);
  const incidentManager = useIncidentManager(db);
  const { failedNodeIds, records } = useBreakdown(Boolean(firebaseReady && db));
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set());
  const [cliOpen, setCliOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'dashboard'>('dashboard');
  const [pendingTopology, setPendingTopology] = useState<TopologyPayload | null>(null);
  
  const handleApplyTopology = useCallback(
    (payload: TopologyPayload) => {
      if (canvasRef.current) {
        canvasRef.current.applyTopology(payload);
      } else {
        setPendingTopology(payload);
      }
      setStep('dashboard');
    },
    []
  );

  useEffect(() => {
    if (step === 'dashboard' && pendingTopology && canvasRef.current) {
      canvasRef.current.applyTopology(pendingTopology);
      setPendingTopology(null);
    }
  }, [step, pendingTopology]);

  const nodeMetrics = useMemo(
    () =>
      new Map<string, { status: NodeHealthStatus; latencyMs?: number }>(
        records.map((r) => [
          r.nodeId,
          { 
            latencyMs: r.latencyMs, 
            status: r.status === 'DOWN' ? 'offline' : r.status === 'DEGRADED' ? 'warning' : 'online' 
          },
        ])
      ),
    [records]
  );

  const getTopology = useCallback(() => {
    const saved = canvasRef.current?.exportSaved();
    if (!saved) return null;
    return {
      nodes: saved.nodes.map(n => ({
        id: n.id,
        type: n.data.deviceType,
        label: n.data.label,
        vlan_id: n.data.vlanId,
        campus_zone: n.data.campusZone
      })),
      edges: saved.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined
      }))
    } as TopologyPayload;
  }, []);

  const handlePdfUpload = useCallback(async (fileOrName: string | File, content?: string) => {
    const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    const fileContent = content || (typeof fileOrName !== 'string' ? await fileOrName.text() : '');
    await savePdf(fileName, fileContent, true);
  }, []);

  const handlePdfProcessed = useCallback(async (file: File, content: string, payload: TopologyPayload) => {
    try {
      await savePdf(file.name, content, true);
      handleApplyTopology(payload);
    } catch (error) {
      console.error('❌ Error processing PDF:', error);
    }
  }, [handleApplyTopology]);

  const handleSavePrompt = useCallback(async (prompt: string) => {
    console.log('💾 Saving prompt:', prompt);
  }, []);

  if (step === 'input') {
    return (
      <div className="flex h-full items-center justify-center bg-[#f8fafc] p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl space-y-10">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-500">Maptive Intelligence</p>
            <h1 className="mt-4 text-4xl font-extrabold text-slate-800 md:text-5xl">Design Your Network</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">Upload a blueprint or use the AI architect to generate your network twin.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-xl font-bold text-slate-700">PDF Upload Center</h2>
              </div>
              <div className="flex-1 p-4 pb-6 min-h-[340px] flex flex-col justify-center">
                <FileUploader onTopology={handleApplyTopology} onPdfUpload={handlePdfUpload} />
              </div>
            </GlassCard>
            
            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-xl font-bold text-slate-700">Digital Twin Uplink</h2>
              </div>
              <div className="flex-1 p-4 pb-6 min-h-[340px] flex flex-col justify-center">
                <FileUploader onTopology={handleApplyTopology} onPdfUpload={handlePdfUpload} />
              </div>
            </GlassCard>
          </div>

          <div className="border-2 border-indigo-200 bg-indigo-50/50 rounded-[32px] p-8 shadow-sm">
            <div className="text-center mb-6">
              <UploadIcon className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-indigo-800">Advanced PDF Pipeline</h3>
              <p className="text-sm text-indigo-600">Our LLaMA 3.1 AI will extract node relationships from your documentation.</p>
            </div>
            <PdfUploadInline onPdfProcessed={handlePdfProcessed} className="border-white/50 bg-white/40" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* CANVAS AREA (LEFT) */}
      <div className="flex flex-1 flex-col min-w-0 p-[10px] gap-[10px]">
        {/* TOOLBAR (Top of Canvas) */}
        <div className="flex items-center justify-between border border-slate-200 bg-white rounded-2xl px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Architect</h2>
            </div>
            <div className="h-4 w-[1px] bg-slate-200" />
            <button
               onClick={() => canvasRef.current?.fitToView()}
               className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Auto-Arrange
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
               onClick={() => setStep('input')}
               className="flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[11px] font-bold text-white transition hover:bg-slate-800"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> New
            </button>
            <button
               onClick={() => setCliOpen(true)}
               className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <Terminal className="h-3.5 w-3.5" /> CLI
            </button>
            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
            <button
               onClick={() => {
                 const topology = getTopology();
                 if (topology) exportTxt(topology.nodes as any, topology.edges as any);
               }}
               className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <FileDown className="h-3.5 w-3.5" /> Config
            </button>
            {user && !user.isMock && (
               <button
                 onClick={() => void saveLayout()}
                 className="flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[11px] font-bold text-white transition hover:bg-indigo-700"
               >
                 <Save className="h-3.5 w-3.5" /> Save
               </button>
            )}
          </div>
        </div>

        {/* GRAPH CANVAS (Full Space) */}
        <div className="relative flex-1 rounded-[24px] border border-slate-200 bg-[#f5f7fa] overflow-hidden shadow-inner">
          <AnimatePresence>
            {failedNodeIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-10 bg-rose-900/5 backdrop-blur-[2px]"
              />
            )}
          </AnimatePresence>
          <NetworkCanvas ref={canvasRef} failedNodeIds={failedNodeIds} highlightedNodeIds={highlighted} user={user || null} nodeMetrics={nodeMetrics} />
          
          <div className="pointer-events-none absolute right-6 top-6 z-30">
            <IncidentToastStack
              incidents={incidentManager.incidents}
              dismissedIds={incidentManager.dismissedIds}
              onDismiss={incidentManager.dismiss}
            />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL (Sidebar) */}
      <aside className="w-[320px] lg:w-[380px] shrink-0 flex flex-col gap-4 p-[10px] pl-0 overflow-hidden">
        <GlassCard className="border-slate-200 p-4 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-slate-800">
            <UploadCloud className="h-5 w-5 text-indigo-500" />
            <h1 className="text-sm font-bold uppercase tracking-tight">Diagnostics</h1>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
            AI-assisted infrastructure analysis and real-time healing.
          </p>
        </GlassCard>

        <GrokAnalyst incident={incidentManager.activeIncident || null} history={records} />

        <div className="flex-1 min-h-0">
          <ChatInterface
            applyTopology={handleApplyTopology}
            applySelfHeal={handleApplyTopology}
            highlightBottlenecks={handleApplyTopology}
            getTopology={getTopology}
            onPdfProcessed={handlePdfProcessed}
            onSavePrompt={handleSavePrompt}
          />
        </div>
      </aside>

      {/* OVERLAYS */}
      <CiscoCliOverlay
        open={cliOpen}
        onClose={() => setCliOpen(false)}
        nodeIds={(canvasRef.current?.exportSaved().nodes ?? []).map((node) => node.id)}
        onHighlight={(ids) => setHighlighted(new Set(ids))}
        onMessage={() => {}}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FileDown, FileText, Save, Terminal, UploadCloud, Network, LayoutDashboard, Upload, Plus } from 'lucide-react';
import { ChatInterface } from '@/components/ChatInterface';
import { CiscoCliOverlay } from '@/components/CiscoCliOverlay';
import { FileUploader } from '@/components/FileUploader';
import { GrokAnalyst } from '@/components/GrokAnalyst';
import { IncidentToastStack, useIncidentManager } from '@/components/IncidentManager';
import { NetworkCanvas, type NetworkCanvasHandle } from '@/components/NetworkCanvas';
import { GlassCard } from '@/components/ui/GlassCard';
import { PdfUploadInline } from '@/components/PdfUploadInline';
import { useAuthContext } from '@/context/AuthContext';
import { useBreakdown } from '@/hooks/useBreakdown';
import { useVoiceAlerts } from '@/hooks/useVoiceAlerts';
import { buildCiscoConfigText, downloadTextFile, exportTopologyPdf } from '@/lib/exportTopology';
import { db, firebaseReady } from '@/lib/firebase';
import { savePrompt, getUserData, savePdf, type SavedPrompt } from '@/lib/userDataService';
import type { Edge } from '@xyflow/react';
import type { RFNode, TopologyEdgeSpec, TopologyPayload, NodeHealthStatus } from '@/types/topology';

function savedToPayload(nodes: RFNode[], edges: Edge[]): TopologyPayload {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.deviceType,
      label: node.data.label,
      vlan_id: node.data.vlanId,
      campus_zone: node.data.campusZone,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      healing: Boolean((edge.data as { healing?: boolean } | undefined)?.healing),
      bottleneck: Boolean((edge.data as { bottleneck?: boolean } | undefined)?.bottleneck),
      broken: Boolean((edge.data as { broken?: boolean } | undefined)?.broken),
    })),
  };
}

export default function NetworkCreator() {
  const { user } = useAuthContext();
  const canvasRef = useRef<NetworkCanvasHandle>(null);
  const { failedNodeIds, records } = useBreakdown(Boolean(firebaseReady && db));
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set());
  const [cliOpen, setCliOpen] = useState(false);
  const [cliHud, setCliHud] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'dashboard'>('dashboard');
  
  const handleApplyTopology = useCallback(
    (payload: TopologyPayload) => {
      canvasRef.current?.applyTopology(payload);
      setStep('dashboard');
    },
    []
  );

  const nodeMetrics = useMemo(
  () =>
    new Map(
      records.map((record) => [
        record.nodeId,
        {
          // Convert backend status to NodeHealthStatus enum values.
          status: (
            record.status === 'DOWN'
              ? 'offline'
              : record.status === 'DEGRADED'
              ? 'warning'
              : 'online'
          ) as NodeHealthStatus,
          latencyMs: record.latencyMs,
        },
      ])
    ),
  [records]
);

  const currentTopology = useCallback(() => {
    const snapshot = canvasRef.current?.exportSaved();
    if (!snapshot?.nodes?.length) return null;
    return savedToPayload(snapshot.nodes, snapshot.edges);
  }, []);

  const incidentManager = useIncidentManager({
    edges: currentTopology()?.edges ?? [],
    enabled: Boolean(firebaseReady && db),
  });

  useVoiceAlerts(incidentManager.activeIncident);

  useEffect(() => {
    if (!incidentManager.brokenEdgeIds.length) return;
    canvasRef.current?.setBrokenEdges(incidentManager.brokenEdgeIds);
  }, [incidentManager.brokenEdgeIds]);

  useEffect(() => {
    if (!user || user.isMock || !db) return;
    let cancelled = false;
    (async () => {
      const snapshot = await getDoc(doc(db, 'users', user.uid, 'layouts', 'current'));
      if (cancelled || !snapshot.exists()) return;
      const data = snapshot.data() as { nodes?: RFNode[]; edges?: Edge[] };
      if (data.nodes?.length && data.edges) {
        canvasRef.current?.hydrateFromSaved(data.nodes, data.edges, failedNodeIds);
        setStep('dashboard');
      }
      
      // Load saved prompts
      try {
        const userData = await getUserData();
        if (userData && !cancelled) {
          setSavedPrompts(userData.prompts || []);
        }
      } catch (error) {
        console.error('Error loading saved prompts:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [failedNodeIds, user]);

  const handleSavePrompt = useCallback(async (prompt: string) => {
    try {
      await savePrompt(prompt);
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  }, []);

  const handlePdfUpload = useCallback(async (fileName: string, content: string, isValid: boolean) => {
    try {
      await savePdf(fileName, content, isValid);
      console.log('PDF uploaded and saved:', fileName);
    } catch (error) {
      console.error('Error saving PDF:', error);
    }
  }, []);

  const handlePdfProcessed = useCallback(async (file: File, content: string, payload: TopologyPayload) => {
    try {
      // Save PDF to Firebase
      await savePdf(file.name, content, true);
      
      // Apply topology to canvas
      handleApplyTopology(payload);
      
      // Add AI response message to chat (simulate AI processing)
      const aiMessage = `📄 **PDF Network Generated**\n\nSuccessfully processed "${file.name}" and created a network topology with ${payload.nodes?.length || 0} nodes and ${payload.edges?.length || 0} connections.`;
      
      // This will be handled by ChatInterface's message system
      console.log('PDF processed successfully:', aiMessage);
    } catch (error) {
      console.error('Error processing PDF:', error);
    }
  }, [handleApplyTopology]);

  const saveLayout = async () => {
    if (!user || user.isMock || !db) return;
    const snapshot = canvasRef.current?.exportSaved();
    if (!snapshot?.nodes?.length) return;
    await setDoc(doc(db, 'users', user.uid, 'layouts', 'current'), { nodes: snapshot.nodes, edges: snapshot.edges, updatedAt: serverTimestamp() }, { merge: true });
  };

  const applySelfHeal = useCallback((payload: TopologyPayload) => {
    canvasRef.current?.appendRedundantEdges(payload.edges.filter((edge) => edge.healing) as TopologyEdgeSpec[]);
  }, []);

  const highlightBottlenecks = useCallback((payload: TopologyPayload) => {
    canvasRef.current?.highlightBottlenecks(payload.edges.filter((edge) => edge.bottleneck));
  }, []);

  const exportTxt = () => {
    const snapshot = canvasRef.current?.exportSaved();
    if (!snapshot?.nodes?.length) return;
    downloadTextFile('maptive-pro-topology.txt', buildCiscoConfigText(snapshot.nodes, snapshot.edges));
  };

  const exportPdf = () => {
    const snapshot = canvasRef.current?.exportSaved();
    if (!snapshot?.nodes?.length) return;
    exportTopologyPdf('Maptive Pro topology report', snapshot.nodes, snapshot.edges);
  };

  if (step === 'input') {
    return (
      <div className="relative flex h-full min-h-0 flex-col items-center justify-center bg-[#f0f9ff] p-4 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_70%)]" />
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 w-full max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-2xl font-bold text-slate-700">Digital Twin Uplink</h2>
                <p className="mt-1 text-sm text-slate-500">Upload physical Architecture PDF</p>
              </div>
              <div className="flex-1 p-4 pb-6 min-h-[340px] flex flex-col justify-center">
                <FileUploader onTopology={handleApplyTopology} onPdfUpload={handlePdfUpload} />
              </div>
            </GlassCard>
            
            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-2xl font-bold text-slate-700">AI Architect</h2>
                <p className="mt-1 text-sm text-slate-500">Generate complex specs via AI or upload PDF</p>
              </div>
              <div className="flex-1 p-4 h-[380px] space-y-4">
                <ChatInterface
                  applyTopology={handleApplyTopology}
                  applySelfHeal={applySelfHeal}
                  highlightBottlenecks={highlightBottlenecks}
                  getTopology={currentTopology}
                  onSavePrompt={handleSavePrompt}
                />
              </div>
            </GlassCard>
          </div>

          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-white/60 shadow-glass backdrop-blur-3xl ring-1 ring-white/50">
              <Network className="h-12 w-12 text-sky-500" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-800 md:text-6xl">Maptive <span className="text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-sky-600">Pro</span></h1>
            <p className="mt-4 text-lg text-slate-500">Design, orchestrate, and diagnose your enterprise campus network.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* PDF Upload Section (Circled Area) */}
            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-xl font-bold text-slate-700">PDF Upload Center</h2>
                <p className="mt-1 text-sm text-slate-500">Upload network architecture PDFs instantly</p>
              </div>
              <div className="flex-1 p-4 pb-6 min-h-[340px] flex flex-col justify-center">
                <FileUploader onTopology={handleApplyTopology} onPdfUpload={handlePdfUpload} />
              </div>
            </GlassCard>
            
            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-xl font-bold text-slate-700">Digital Twin Uplink</h2>
                <p className="mt-1 text-sm text-slate-500">Upload physical Architecture PDF</p>
              </div>
              <div className="flex-1 p-4 pb-6 min-h-[340px] flex flex-col justify-center">
                <FileUploader onTopology={handleApplyTopology} onPdfUpload={handlePdfUpload} />
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col border-white/60 bg-white/40 p-2 shadow-glass backdrop-blur-3xl transition-all hover:bg-white/50 hover:shadow-xl">
              <div className="p-6 pb-2 text-center">
                <h2 className="text-xl font-bold text-slate-700">Grok Text Constructor</h2>
                <ChatInterface
                  applyTopology={handleApplyTopology}
                  applySelfHeal={applySelfHeal}
                  highlightBottlenecks={highlightBottlenecks}
                  getTopology={currentTopology}
                  onSavePrompt={handleSavePrompt}
                />
              </div>
            </GlassCard>
          </div>
          <div className="border-2 border-blue-300 bg-blue-50/50 rounded-lg p-4">
            <div className="text-center mb-4">
              <Upload className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-blue-800 mb-1">PDF Upload</h3>
              <p className="text-sm text-blue-700">Upload a PDF to generate network topology</p>
            </div>
            <PdfUploadInline 
              onPdfProcessed={handlePdfProcessed}
              className="border-slate-200/50 bg-slate-50/50"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#f0f9ff]">
      <AnimatePresence>
        {failedNodeIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute inset-0 z-10 bg-rose-900/5 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

            
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3">
        <GlassCard className="pointer-events-auto max-w-[min(100%,480px)] border-white/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Maptive Pro</p>
          <p className="mt-1 text-sm text-slate-600">Active Live Diagnostics Dashboard</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={exportPdf}
              className="flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1 text-xs text-white hover:bg-sky-600 transition-colors"
            >
              <FileText className="h-3 w-3" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={exportTxt}
              className="flex items-center gap-1 rounded-lg bg-slate-500 px-3 py-1 text-xs text-white hover:bg-slate-600 transition-colors"
            >
              <FileDown className="h-3 w-3" />
              <span>Export Config</span>
            </button>
          </div>
          <input
            id="dashboard-pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={async (event) => {
              console.log('🎯 PDF upload triggered');
              const file = event.target.files?.[0];
              if (file) {
                console.log('📄 File selected:', file.name, file.type, file.size);
                try {
                  const content = await file.text();
                  console.log('📄 File content length:', content.length);
                  const payload = await parseCampusPdf(file);
                  console.log('🔧 Parsed payload:', payload);
                  handleApplyTopology(payload);
                  if (savePdf) {
                    await savePdf(file.name, content, true);
                  }
                } catch (error) {
                  console.error('❌ PDF upload error:', error);
                }
              } else {
                console.log('⚠️ No file selected');
              }
            }}
          />
          {cliHud ? <p className="mt-1 text-xs text-emerald-600">{cliHud}</p> : null}
        </GlassCard>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => setStep('input')} className="inline-flex items-center gap-1.5 rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur-2xl hover:bg-white/60"><LayoutDashboard className="h-3.5 w-3.5" />New</button>
          <button type="button" onClick={() => setCliOpen(true)} className="inline-flex items-center gap-1.5 rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur-2xl hover:bg-white/60"><Terminal className="h-3.5 w-3.5" />CLI</button>
          <button type="button" onClick={() => canvasRef.current?.fitToView()} className="rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur-2xl hover:bg-white/60">Fit</button>
          <button type="button" onClick={exportTxt} className="inline-flex items-center gap-1 rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur-2xl hover:bg-white/60"><FileText className="h-3.5 w-3.5" />.txt</button>
          <button type="button" onClick={exportPdf} className="inline-flex items-center gap-1 rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur-2xl hover:bg-white/60"><FileDown className="h-3.5 w-3.5" />PDF</button>
          {user && !user.isMock ? <button type="button" onClick={() => void saveLayout()} className="inline-flex items-center gap-1 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-xs font-semibold text-sky-700 backdrop-blur-2xl hover:bg-sky-50"><Save className="h-3.5 w-3.5" />Save</button> : null}
        </div>
      </div>

      <div className="pointer-events-none absolute right-6 top-24 z-30 flex flex-col gap-2">
        <IncidentToastStack
          incidents={incidentManager.incidents}
          dismissedIds={incidentManager.dismissedIds}
          onDismiss={incidentManager.dismiss}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 pt-28 lg:flex-row">
        <div className="relative min-h-[50vh] min-w-0 flex-1 px-3 pb-3 lg:px-6 lg:pb-6">
          <div className="relative h-[calc(100vh-10rem)] min-h-[420px] overflow-hidden rounded-[32px] border border-white/40 bg-white/30 shadow-glass backdrop-blur-2xl">
            <NetworkCanvas ref={canvasRef} failedNodeIds={failedNodeIds} highlightedNodeIds={highlighted} user={user} nodeMetrics={nodeMetrics} />
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 px-3 pb-4 lg:w-[380px] lg:px-0 lg:pr-6">
          <GlassCard className="border-white/40 p-4">
            <div className="flex items-center gap-2 text-slate-700"><UploadCloud className="h-4 w-4 text-sky-500" /><h3 className="text-sm font-semibold">Incident HUD</h3></div>
            <p className="mt-2 text-sm text-slate-600">When a connection fails, the link snaps neon red and a toast appears. Watch for changes below.</p>
          </GlassCard>
          <GrokAnalyst incident={incidentManager.activeIncident} history={records} />
          {user?.role === 'admin' ? (
            <div className="h-[280px]">
              <ChatInterface
                applyTopology={handleApplyTopology}
                applySelfHeal={applySelfHeal}
                highlightBottlenecks={highlightBottlenecks}
                getTopology={currentTopology}
              />
            </div>
          ) : null}
        </aside>
      </div>

      <CiscoCliOverlay
        open={cliOpen}
        onClose={() => setCliOpen(false)}
        nodeIds={(canvasRef.current?.exportSaved().nodes ?? []).map((node) => node.id)}
        onHighlight={(ids) => setHighlighted(new Set(ids))}
        onMessage={(text) => {
          setCliHud(text);
          window.setTimeout(() => setCliHud(null), 6000);
        }}
      />
    </div>
  );
}

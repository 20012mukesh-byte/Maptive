import { useMemo, useRef, useState, useEffect } from 'react';
import { FileText, Sparkles, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { NetworkCanvas, type NetworkCanvasHandle } from '@/components/NetworkCanvas';
import { GlassCard } from '@/components/ui/GlassCard';
import { explainPdfFallback } from '@/lib/pdfParser';
import { savePdf, getUserData, type SavedPdf } from '@/lib/userDataService';
import { validatePdfContent, type ValidationResult } from '@/lib/pdfValidation';
import { useAuthContext } from '@/context/AuthContext';
import type { TopologyPayload } from '@/types/topology';

export default function PdfTwin() {
  const { user } = useAuthContext();
  const canvasRef = useRef<NetworkCanvasHandle>(null);
  const [status, setStatus] = useState('Upload a campus PDF to generate a live digital twin.');
  const [savedPdfs, setSavedPdfs] = useState<SavedPdf[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const onTopology = (payload: TopologyPayload) => {
    canvasRef.current?.applyTopology(payload);
    setStatus('Campus PDF parsed. Nodes are floating into building clusters.');
  };

  const handlePdfUpload = async (fileName: string, content: string) => {
    if (!user || user.isMock) {
      setStatus('Please login to save PDFs.');
      return;
    }

    // Validate PDF content
    const validation = validatePdfContent(content);
    setValidationResult(validation);
    
    if (!validation.isValid) {
      setStatus(`PDF rejected: ${validation.reasons.join(', ')}`);
      return;
    }

    try {
      await savePdf(fileName, content, validation.isValid);
      setStatus('PDF uploaded and validated successfully!');
      
      // Refresh saved PDFs
      const userData = await getUserData();
      setSavedPdfs(userData?.pdfs || []);
      setValidationResult(null);
    } catch (error) {
      console.error('Error saving PDF:', error);
      setStatus('Error saving PDF. Please try again.');
    }
  };

  const note = useMemo(() => explainPdfFallback(), []);

  // Load saved PDFs on component mount
  useEffect(() => {
    if (!user || user.isMock) return;
    
    (async () => {
      try {
        const userData = await getUserData();
        if (userData) {
          setSavedPdfs(userData.pdfs || []);
        }
      } catch (error) {
        console.error('Error loading saved PDFs:', error);
      }
    })();
  }, [user]);

  return (
    <div className="h-full overflow-y-auto bg-[#f0f9ff] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <GlassCard className="border-white/40 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-500">PDF Architecture Parser</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-800">Campus PDFs into Digital Twins</h2>
              <p className="mt-2 text-sm text-slate-600">Upload campus network drawings and watch nodes float into their building clusters.</p>
            </div>
            <FileText className="h-8 w-8 text-sky-500" />
          </div>
          <p className="mt-4 text-xs text-slate-500">{note}</p>
        </GlassCard>

        <FileUploader onTopology={onTopology} onPdfUpload={handlePdfUpload} />

        <GlassCard className="border-white/40 p-4">
          <div className="flex items-center gap-2 text-slate-700"><Sparkles className="h-4 w-4 text-sky-500" /><h3 className="text-sm font-semibold">Digital Twin Canvas</h3></div>
          <p className="mt-2 text-sm text-slate-600">{status}</p>
          <div className="mt-4 h-[520px] overflow-hidden rounded-[28px] border border-white/40 bg-white/30 shadow-glass backdrop-blur-2xl">
            <NetworkCanvas ref={canvasRef} failedNodeIds={new Set()} highlightedNodeIds={new Set()} user={null} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

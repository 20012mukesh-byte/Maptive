import { useMemo, useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { TopologyPayload } from '@/types/topology';
import { parseCampusPdf } from '@/lib/pdfParser';

export function FileUploader({
  onTopology,
  onPdfUpload,
}: {
  onTopology: (payload: TopologyPayload) => void;
  onPdfUpload?: (fileName: string, content: string, isValid: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const accept = useMemo(() => '.pdf,image/*', []);

  const onFile = async (file: File) => {
    setBusy(true);
    setFileName(file.name);
    
    try {
      // Read file content
      const content = await file.text();
      
      // Skip validation - accept all PDFs
      console.log('📄 Processing PDF:', file.name);
      
      // Parse PDF and create topology
      const payload = await parseCampusPdf(file);
      onTopology(payload);
      
      // Save PDF if callback provided
      if (onPdfUpload) {
        await onPdfUpload(file.name, content, true); // Always mark as valid
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="border-white/40 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-500">Upload Campus PDF</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-800">Convert architecture to a live digital twin</h3>
          <p className="mt-2 text-sm text-slate-600">Drop a campus network PDF or schematic image to map routers, switches, and nodes into the canvas.</p>
        </div>
        <FileText className="h-8 w-8 text-sky-500" />
      </div>
      
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => (event.key === 'Enter' ? inputRef.current?.click() : null)}
        className="mt-5 flex cursor-pointer items-center justify-center rounded-[28px] border border-dashed border-white/60 bg-white/40 px-6 py-8 text-center text-sm text-slate-600 hover:bg-white/60"
      >
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-6 w-6 text-sky-500" />
          <div>
            <div className="font-semibold text-slate-700">{busy ? 'Processing...' : 'Drag & drop or click to upload'}</div>
            <div className="text-xs text-slate-500">PDF or image. {fileName ? `Loaded: ${fileName}` : 'No file selected yet.'}</div>
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
    </GlassCard>
  );
}

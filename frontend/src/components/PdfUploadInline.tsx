import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import type { TopologyPayload } from '@/types/topology';

interface PdfUploadInlineProps {
  onPdfProcessed: (file: File, content: string, payload: TopologyPayload) => void;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function PdfUploadInline({ onPdfProcessed, className = '' }: PdfUploadInlineProps) {
  console.log('🎯 PdfUploadInline component rendered');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadState('error');
      setErrorMessage('Please upload a PDF file');
      setTimeout(() => setUploadState('idle'), 3000);
      return;
    }

    setUploadState('uploading');
    setErrorMessage('');
    setSelectedFile(file);

    try {
      // Extract PDF content
      const content = await file.text();
      
      // Generate topology using existing PDF parser
      const { parseCampusPdf } = await import('@/lib/pdfParser');
      const payload = await parseCampusPdf(file);
      
      // Process the PDF
      onPdfProcessed(file, content, payload);
      
      setUploadState('success');
      setTimeout(() => {
        setUploadState('idle');
        setSelectedFile(null);
      }, 2000);
    } catch (error) {
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process PDF');
      setTimeout(() => {
        setUploadState('idle');
        setSelectedFile(null);
      }, 3000);
    }
  }, [onPdfProcessed]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage('');
  }, []);

  return (
    <div className={`border border-slate-200/50 bg-slate-50/50 rounded-lg p-3 ${className} relative`}>
      {/* Upload Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Upload PDF</span>
        </div>
        {selectedFile && (
          <button
            onClick={handleRemoveFile}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div className="space-y-3">
        {uploadState === 'idle' && !selectedFile && (
          <div>
            <label
              htmlFor="pdf-upload-inline"
              className="flex items-center justify-center w-full p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
              style={{ minHeight: '120px' }}
            >
              <div className="text-center">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 mb-1">Generate topology from document</p>
                <p className="text-xs text-slate-500">Upload a PDF to extract network requirements</p>
              </div>
              <input
                id="pdf-upload-inline"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {uploadState === 'uploading' && (
          <div className="text-center p-6">
            <div className="inline-flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Reading PDF and generating topology...</span>
            </div>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">Network generated successfully!</p>
            <p className="text-xs text-green-600">Topology has been applied to the canvas</p>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-red-600 mb-2">
              <Upload className="h-6 w-6 mx-auto" />
            </div>
            <p className="text-sm font-medium text-red-800 mb-1">Upload Failed</p>
            <p className="text-xs text-red-600">{errorMessage}</p>
          </div>
        )}

        {selectedFile && uploadState === 'idle' && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

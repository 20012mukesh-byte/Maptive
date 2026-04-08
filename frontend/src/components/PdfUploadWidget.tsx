import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { parseCampusPdf } from '@/lib/pdfParser';
import type { TopologyPayload } from '@/types/topology';

interface PdfUploadWidgetProps {
  onTopologyGenerated: (payload: TopologyPayload) => void;
  className?: string;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

export function PdfUploadWidget({ onTopologyGenerated, className = '' }: PdfUploadWidgetProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    console.log('🎯 PDF Upload Widget: Starting upload process');
    console.log('📄 File details:', file.name, file.type, file.size);
    
    if (!file.type.includes('pdf')) {
      console.log('❌ Invalid file type:', file.type);
      setUploadState('error');
      setErrorMessage('Please upload a PDF file');
      setTimeout(() => setUploadState('idle'), 3000);
      return;
    }

    setUploadState('uploading');
    setErrorMessage('');
    console.log('⏳ Starting PDF processing...');

    try {
      // Extract PDF content and generate topology
      console.log('📖 Calling parseCampusPdf...');
      const payload = await parseCampusPdf(file);
      console.log('🔧 Generated payload:', payload);
      console.log('📊 Payload nodes:', payload.nodes?.length, 'edges:', payload.edges?.length);
      
      // Simulate API call to /api/upload
      console.log('🌐 Simulating API call...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate topology
      console.log('🚀 Calling onTopologyGenerated...');
      onTopologyGenerated(payload);
      
      setUploadState('success');
      console.log('✅ Upload successful!');
      setTimeout(() => setUploadState('idle'), 3000);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process PDF');
      setTimeout(() => setUploadState('idle'), 3000);
    }
  }, [onTopologyGenerated]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState('idle');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState('dragging');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState('idle');
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <motion.div
      className={`fixed bottom-2 right-2 z-30 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <GlassCard className="w-56 backdrop-blur-md border-white/10 bg-white/30 shadow-md">
        <div
          className={`relative p-4 rounded-lg transition-all duration-300 ${
            uploadState === 'dragging' 
              ? 'border border-blue-300 bg-blue-50/30' 
              : 'border border-transparent'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Upload Content */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              {uploadState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 shadow-lg"
                    >
                      <Upload className="h-6 w-6 text-white" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Upload Network PDF</h3>
                    <p className="text-sm text-slate-600">Auto-generate topology from PDF</p>
                  </div>
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-sky-700 transition-all duration-200 shadow-md"
                    >
                      Choose PDF File
                    </motion.button>
                    <p className="text-xs text-slate-500">or drag and drop your PDF here</p>
                  </div>
                </motion.div>
              )}

              {uploadState === 'dragging' && (
                <motion.div
                  key="dragging"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="p-4 rounded-full bg-blue-100"
                    >
                      <Upload className="h-6 w-6 text-blue-600" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-1">Drop PDF Here</h3>
                    <p className="text-sm text-blue-600">Release to upload and analyze</p>
                  </div>
                </motion.div>
              )}

              {uploadState === 'uploading' && (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="p-4 rounded-full bg-blue-100"
                    >
                      <Loader2 className="h-6 w-6 text-blue-600" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Analyzing Network...</h3>
                    <p className="text-sm text-slate-600">Processing your PDF topology</p>
                  </div>
                </motion.div>
              )}

              {uploadState === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="p-4 rounded-full bg-green-100"
                    >
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 mb-1">Success!</h3>
                    <p className="text-sm text-green-600">Network generated successfully</p>
                  </div>
                </motion.div>
              )}

              {uploadState === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-red-100">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800 mb-1">Upload Failed</h3>
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Glass Card Component
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      className={`relative backdrop-blur-lg bg-white/30 border border-white/20 rounded-xl shadow-lg ${className}`}
      style={{
        background: 'rgba(255,255,255,0.3)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

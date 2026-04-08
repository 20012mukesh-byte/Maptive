import { analyzePdfVision, generateTopology } from '@/lib/grok';
import { mockPdfTopology } from '@/lib/incidentLogic';
import type { TopologyPayload } from '@/types/topology';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

const workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();

function ensureWorker() {
  if ((pdfjsLib as any).GlobalWorkerOptions) {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

async function extractPdfText(file: File) {
  ensureWorker();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = Math.min(doc.numPages, 4);
  let text = '';
  for (let pageNum = 1; pageNum <= pages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str ?? '').join(' ');
    text += '\n';
  }
  return text.trim();
}

async function renderFirstPageToDataUrl(file: File) {
  ensureWorker();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/png');
}

export async function parseCampusPdf(file: File): Promise<TopologyPayload> {
  if (file.type.startsWith('image/')) {
    const dataUrl = await fileToDataUrl(file);
    const prompt = `Convert this campus network diagram into JSON topology with vlan_id and campus_zone.`;
    return analyzePdfVision({ prompt, imageDataUrl: dataUrl });
  }

  if (file.type === 'application/pdf') {
    try {
      console.log('📄 Processing PDF:', file.name);
      const [text, imageDataUrl] = await Promise.all([
        extractPdfText(file),
        renderFirstPageToDataUrl(file),
      ]);
      console.log('📄 Extracted text length:', text.length);
      console.log('📄 Has image data:', !!imageDataUrl);
      
      if (imageDataUrl) {
        const prompt = `Convert this campus PDF into JSON topology with vlan_id and campus_zone. Text: ${text.slice(0, 1200)}`;
        console.log('🤖 Using vision API with prompt:', prompt);
        const result = await analyzePdfVision({ prompt, imageDataUrl });
        console.log('🤖 Vision API result:', result);
        return result;
      }
      if (text.trim().length > 40) {
        const prompt = `Convert this campus PDF text into JSON topology with vlan_id and campus_zone. Content: ${text.slice(0, 1200)}`;
        console.log('📝 Using text API with prompt:', prompt);
        const result = await generateTopology(prompt);
        console.log('📝 Text API result:', result);
        return result;
      }
    } catch (error) {
      console.error('❌ PDF processing error:', error);
    }
    console.log('🎭 Falling back to mock topology');
    return mockPdfTopology(file.name);
  }

  return mockPdfTopology(file.name);
}

export function explainPdfFallback() {
  return 'PDF parsing uses pdf.js for text and a first-page render. For full vision parsing, connect Grok Vision with a valid xAI key.';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

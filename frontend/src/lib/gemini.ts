import { GoogleGenerativeAI } from '@google/generative-ai';
import { mockTopologyFromPrompt } from '@/lib/mockMaptive';

const SYSTEM = `You are the Maptive Network Engine. When the user gives a command, output ONLY a JSON object. No conversational text, no markdown fences.

Shape:
{
  "nodes": [{"id": "string", "type": "router"|"switch"|"pc"|"server"|"cloud", "label": "string"}],
  "edges": [{"id": "string", "source": "node_id", "target": "node_id", "label": "FastEthernet"|"Gigabit"}]
}

Rules:
- Use Cisco-style ids when possible (R1, Switch-A, PC1, SRV1, Cloud-ISP).
- Include every edge endpoint in nodes if that node is new.
- Prefer Gigabit for switch-to-router uplinks and FastEthernet for access links unless the user specifies otherwise.`;

export function hasGeminiApiKey(): boolean {
  return Boolean(String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim());
}

/** Uses Google Gemini when VITE_GEMINI_API_KEY is set; otherwise local mock JSON (no API key needed). */
export async function generateTopologyJson(userPrompt: string): Promise<string> {
  const key = String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();
  if (!key) {
    await new Promise((r) => setTimeout(r, 350));
    return JSON.stringify(mockTopologyFromPrompt(userPrompt));
  }

  const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM,
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

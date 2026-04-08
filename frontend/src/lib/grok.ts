import { parseFixSuggestions, parseTopologyJson } from '@/lib/parseTopologyJson';
import type { IncidentRecord, NetworkMonitorState, TopologyPayload, NetworkLogRecord } from '@/types/topology';

const GROQ_API_URL = (import.meta.env.VITE_GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions').trim();
const GROQ_MODEL = (import.meta.env.VITE_GROQ_MODEL ?? 'llama-3.1-8b-instant').trim();
const GROQ_API_KEY = (import.meta.env.VITE_GROQ_API_KEY ?? '').trim();
const GROQ_API_KEY_CONFIGURED = GROQ_API_KEY && GROQ_API_KEY !== 'your-groq-api-key';

const topologySystemPrompt = [
  'You design production-grade university computer networks.',
  'Return only valid JSON with this exact shape: {"nodes":[...],"edges":[...]}.',
  'Each node requires: id, type, label, vlan_id, campus_zone.',
  'Each edge requires: id, source, target, label. Optional edge keys: bandwidth_mbps, bottleneck.',
  'Allowed node types: router, switch, pc, server, cloud, hub, wifi_edge.',
  'Do not wrap JSON in markdown. Do not add explanations.',
].join(' ');

const bottleneckPrompt = [
  'Analyze the supplied topology and return only valid JSON with this exact shape:',
  '{"nodes":[],"edges":[{"id":"...","source":"...","target":"...","label":"Potential bottleneck","bottleneck":true,"bandwidth_mbps":123}]}.',
  'Only include edges that are likely bottlenecks based on layout and topology scale.',
  'Do not include explanations or markdown.',
].join(' ');

const healPrompt = [
  'You are diagnosing a student laptop connection issue on a college campus.',
  'Return only valid JSON with this exact shape: {"suggestions":["..."]}.',
  'Suggest 2 to 4 concise, practical fixes tailored to the provided telemetry.',
].join(' ');

const incidentPrompt = [
  'You are a network incident analyst. You are provided with the current incident telemetry and a history of network logs (nodes).',
  'Output a concise explanation and suggestion. Compare the current incident against the history to identify recurring issues (e.g., "This is the 4th time the Campus Gateway has failed...").',
  'Differentiate between likely hardware bottlenecks and traffic issues based on latency patterns over time.',
  'Return a plain text response, 2-4 sentences, professional tone.',
].join(' ');

const pdfVisionPrompt = [
  'You are parsing a campus network architecture diagram.',
  'Return only valid JSON with this exact shape: {"nodes":[...],"edges":[...]}.',
  'Each node requires: id, type, label, vlan_id, campus_zone.',
  'Each edge requires: id, source, target, label. Optional: bandwidth_mbps.',
  'Do not wrap JSON in markdown. Do not add explanations.',
].join(' ');

function reconstructJson(content: string): string {
  let reconstructed = content;
  const start = reconstructed.indexOf('{');
  const end = reconstructed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    reconstructed = reconstructed.substring(start, end + 1);
  }
  reconstructed = reconstructed
    .replace(/"([^"]*?)(?=\s*[,\]}])/g, '"$1"')
    .replace(/"([^"]*?)$/g, '"$1"')
    .replace(/}(?!.*})/g, '}')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');
  return reconstructed;
}

async function callGroq(systemPrompt: string, userPrompt: string) {
  if (!GROQ_API_KEY_CONFIGURED) {
    throw new Error('Groq is not configured. Add VITE_GROQ_API_KEY to use Groq AI.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7, // Enable variation
      top_p: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Groq returned an empty response.');
  }
  
  let cleanedContent = content;
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  cleanedContent = cleanedContent.trim()
    .replace(/,\s*]/g, ']')
    .replace(/,\s*}/g, '}')
    .replace(/\n/g, '')
    .replace(/\t/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\[\s*,/g, '[')
    .replace(/\{\s*,/g, '{')
    .replace(/:\s*,/g, ':null,')
    .replace(/:\s*}/g, ':null}')
    .replace(/:\s*]/g, ':null]')
    .replace(/"([^"]*?)(?=\s*[,\]}])/g, '"$1"')
    .replace(/"([^"]*?)$/g, '"$1"')
    .replace(/:\s*"([^"]*?)(?=\s*[,\]}])/g, ':"$1"');
  
  try {
    JSON.parse(cleanedContent);
  } catch (error) {
    try {
      cleanedContent = reconstructJson(cleanedContent);
      JSON.parse(cleanedContent);
    } catch {
      throw new Error(`Invalid JSON after cleaning: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return cleanedContent;
}

async function callGroqVision(prompt: string, imageDataUrl: string) {
  if (!GROQ_API_KEY_CONFIGURED) {
    throw new Error('Groq is not configured.');
  }
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: pdfVisionPrompt },
        { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageDataUrl } }] },
      ],
    }),
  });
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function mockTopologyFromPrompt(prompt: string): TopologyPayload {
  const lower = prompt.toLowerCase();
  
  const workstationMatch = lower.match(/(\d+)\s*(pcs|pc|workstations|students|computers)/);
  const switchMatch = lower.match(/(\d+)\s*(switches|switch)/);
  const routerMatch = lower.match(/(\d+)\s*(routers|router)/);
  const serverMatch = lower.match(/(\d+)\s*(servers|server)/);
  const buildingMatch = lower.match(/(\d+)\s*(buildings|building|floors|floor)/);
  
  const workstationCount = workstationMatch ? Number(workstationMatch[1]) : 12;
  const switchCount = switchMatch ? Number(switchMatch[1]) : Math.max(2, Math.ceil(workstationCount / 12));
  const routerCount = routerMatch ? Number(routerMatch[1]) : 1;
  const serverCount = serverMatch ? Number(serverMatch[1]) : 0;
  const buildingCount = buildingMatch ? Number(buildingMatch[1]) : 1;
  
  const isDataCenter = lower.includes('data center') || lower.includes('datacenter') || lower.includes('ha') || lower.includes('high availability');
  
  const nodes = [];
  const edges = [];
  
  if (isDataCenter) {
    const coreCount = Math.max(2, routerCount);
    const leafCount = Math.max(2, switchCount);
    const hostCount = workstationCount;

    for (let i = 1; i <= coreCount; i++) {
        nodes.push({ id: `CORE-${i}`, type: 'router', label: `Spine Core ${i}`, vlan_id: 1, campus_zone: 'spine-layer' });
    }
    for (let i = 1; i <= leafCount; i++) {
        nodes.push({ id: `LEAF-${i}`, type: 'switch', label: `Leaf switch ${i}`, vlan_id: 10 + i, campus_zone: 'leaf-layer' });
        for (let j = 1; j <= coreCount; j++) {
            edges.push({ id: `E-C${j}-L${i}`, source: `CORE-${j}`, target: `LEAF-${i}`, label: '100G Fabric', bandwidth_mbps: 100000 });
        }
    }
    for (let i = 1; i <= hostCount; i++) {
        const leafId = `LEAF-${(i % leafCount) + 1}`;
        nodes.push({ id: `HOST-${i}`, type: serverCount > 0 ? 'server' : 'pc', label: `Host Node ${i}`, vlan_id: 20 + i, campus_zone: 'compute-layer' });
        edges.push({ id: `E-H${i}`, source: leafId, target: `HOST-${i}`, label: '10G Access', bandwidth_mbps: 10000 });
        if (leafCount >= 2) {
            const altLeafId = `LEAF-${((i + 1) % leafCount) + 1}`;
            edges.push({ id: `E-H${i}-ALT`, source: altLeafId, target: `HOST-${i}`, label: 'HA Secondary', bandwidth_mbps: 10000, healing: true });
        }
    }
  } else {
    for (let i = 1; i <= routerCount; i++) {
        nodes.push({ id: `GW${i}`, type: 'router', label: `Gateway ${i}`, vlan_id: 1, campus_zone: 'gateway' });
    }
    nodes.push({ id: 'CORE1', type: 'switch', label: 'Core Switch', vlan_id: 10, campus_zone: 'admin' });
    for (let i = 1; i <= switchCount; i++) {
        nodes.push({ id: `SW${i}`, type: 'switch', label: `Access Switch ${i}`, vlan_id: 10 + i, campus_zone: `zone_${(i % buildingCount) || 1}` });
    }
    for (let i = 1; i <= serverCount; i++) {
        nodes.push({ id: `SRV${i}`, type: 'server', label: `Server ${i}`, vlan_id: 20, campus_zone: 'server_room' });
    }
    for (let i = 1; i <= workstationCount; i++) {
        nodes.push({ id: `PC${i}`, type: 'pc', label: `Workstation ${i}`, vlan_id: 10 + (i % switchCount), campus_zone: `zone_${(i % buildingCount) || 1}` });
    }
    for (let i = 1; i <= routerCount; i++) {
        edges.push({ id: `E-GW${i}-CORE`, source: `GW${i}`, target: 'CORE1', label: `Uplink`, bandwidth_mbps: 10000 });
    }
    for (let i = 1; i <= switchCount; i++) {
        edges.push({ id: `E-CORE-SW${i}`, source: 'CORE1', target: `SW${i}`, label: 'Distribution', bandwidth_mbps: 1000 });
    }
    for (let i = 1; i <= workstationCount; i++) {
        edges.push({ id: `E-PC${i}`, source: `SW${(i % switchCount) || 1}`, target: `PC${i}`, label: 'Access', bandwidth_mbps: 100 });
    }
    for (let i = 1; i <= serverCount; i++) {
        edges.push({ id: `E-SRV${i}`, source: `SW${(i % switchCount) || 1}`, target: `SRV${i}`, label: 'Server Link', bandwidth_mbps: 1000 });
    }
  }
  return { nodes, edges };
}

export async function generateTopology(prompt: string) {
  if (!GROQ_API_KEY_CONFIGURED) {
    return mockTopologyFromPrompt(prompt);
  }
  try {
    const content = await callGroq(topologySystemPrompt, prompt);
    return parseTopologyJson(content);
  } catch (error) {
    console.error('Groq failed:', error);
    return mockTopologyFromPrompt(prompt);
  }
}

export async function predictBottlenecks(topology: TopologyPayload) {
  if (!GROQ_API_KEY_CONFIGURED) {
    return {
      nodes: [],
      edges: topology.edges.slice(0, 2).map((edge, index) => ({
        ...edge,
        bottleneck: index === 0,
        bandwidth_mbps: edge.bandwidth_mbps ?? 100,
        label: index === 0 ? 'Likely bottleneck' : edge.label,
      })),
    };
  }
  try {
    const content = await callGroq(bottleneckPrompt, JSON.stringify(topology));
    return parseTopologyJson(content);
  } catch {
    return { nodes: [], edges: [] };
  }
}

export async function suggestHealthFixes(monitor: NetworkMonitorState) {
  if (!GROQ_API_KEY_CONFIGURED) {
    return [
      monitor.packetLoss > 5 ? 'Packet loss is elevated. Check connections.' : 'Check DNS settings.',
      'Restart the network adapter.',
    ];
  }
  const content = await callGroq(healPrompt, JSON.stringify(monitor));
  return parseFixSuggestions(content);
}

export async function analyzeIncident(incident: IncidentRecord, history: NetworkLogRecord[] = []) {
  if (!GROQ_API_KEY_CONFIGURED) {
    return `Incident detected at ${incident.locationId}. Latency: ${incident.latencyMs}ms.`;
  }
  return callGroq(incidentPrompt, JSON.stringify({ currentIncident: incident, history }));
}

export async function analyzePdfVision(payload: { prompt: string; imageDataUrl: string }) {
  if (!GROQ_API_KEY_CONFIGURED) {
    return mockTopologyFromPrompt(payload.prompt);
  }
  const content = await callGroqVision(payload.prompt, payload.imageDataUrl);
  return parseTopologyJson(content);
}

export function hasGrokApiKey() {
  return Boolean(GROQ_API_KEY_CONFIGURED);
}

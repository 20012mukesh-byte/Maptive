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
  // Aggressive JSON reconstruction for severely malformed responses
  let reconstructed = content;
  
  // Find the JSON object boundaries
  const start = reconstructed.indexOf('{');
  const end = reconstructed.lastIndexOf('}');
  
  if (start >= 0 && end > start) {
    reconstructed = reconstructed.substring(start, end + 1);
  }
  
  // Fix common string termination issues more carefully
  reconstructed = reconstructed
    // Fix incomplete strings by finding the last quote and closing it
    .replace(/"([^"]*?)(?=\s*[,\]}])/g, '"$1"')
    // Fix strings that end abruptly - more conservative approach
    .replace(/"([^"]*?)$/g, '"$1"')
    // Remove any characters after the final closing brace
    .replace(/}(?!.*})/g, '}')
    // Ensure proper structure
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
      temperature: 0.2,
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
  
  // Clean up the content to ensure valid JSON
  let cleanedContent = content;
  
  // Remove markdown code blocks if present
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Remove any leading/trailing whitespace
  cleanedContent = cleanedContent.trim();
  
  // Additional cleaning for common JSON issues
  cleanedContent = cleanedContent
    .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
    .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
    .replace(/\n/g, '')      // Remove newlines
    .replace(/\t/g, '')      // Remove tabs
    .replace(/\s+/g, ' ')    // Normalize spaces
    .replace(/,\s*,/g, ',')  // Remove double commas
    .replace(/\[\s*,/g, '[') // Fix array starting with comma
    .replace(/\{\s*,/g, '{') // Fix object starting with comma
    .replace(/:\s*,/g, ':null,') // Fix missing values before commas
    .replace(/:\s*}/g, ':null}') // Fix missing values before closing brace
    .replace(/:\s*]/g, ':null]') // Fix missing values before closing bracket
    // Fix unterminated strings
    .replace(/"([^"]*?)(?=\s*[,\]}])/g, '"$1"') // Close strings before commas/braces
    .replace(/"([^"]*?)$/g, '"$1"') // Close strings at end of content
    .replace(/:\s*"([^"]*?)(?=\s*[,\]}])/g, ':"$1"'); // Fix string values
  
  // Validate JSON before returning
  try {
    JSON.parse(cleanedContent);
    console.log('✅ JSON validation passed');
  } catch (error) {
    console.error('❌ JSON validation failed:', error);
    console.error('Full content length:', cleanedContent.length);
    console.error('First 100 chars:', cleanedContent.substring(0, 100));
    console.error('Problematic content:', cleanedContent.substring(Math.max(0, 3900), Math.min(cleanedContent.length, 3950)));
    
    // Try aggressive fallback reconstruction
    console.log('🔧 Attempting JSON reconstruction...');
    try {
      const reconstructed = reconstructJson(cleanedContent);
      console.log('Reconstructed content:', reconstructed.substring(0, 200));
      JSON.parse(reconstructed);
      cleanedContent = reconstructed;
      console.log('✅ JSON reconstruction successful');
    } catch (reconstructionError) {
      console.error('❌ Reconstruction failed:', reconstructionError);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON after cleaning and reconstruction: ${errorMessage}`);
    }
  }
  
  return cleanedContent;
}

async function callGroqVision(prompt: string, imageDataUrl: string) {
  if (!GROQ_API_KEY_CONFIGURED) {
    throw new Error('Groq is not configured. Add VITE_GROQ_API_KEY to use Groq Vision.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: pdfVisionPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq vision request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Groq returned an empty vision response.');
  }
  return content;
}

function mockTopologyFromPrompt(prompt: string): TopologyPayload {
  console.log('https://openai.com/api/images/64x64.png', prompt);
  const lower = prompt.toLowerCase();
  
  // Extract more details from prompt for varied outputs
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
  
  console.log('https://openai.com/api/images/64x64.png', workstationCount, 'workstations,', switchCount, 'switches,', routerCount, 'routers,', serverCount, 'servers,', buildingCount, 'buildings');

  const nodes = [];
  const edges = [];
  
  // Add routers
  for (let i = 1; i <= routerCount; i++) {
    nodes.push({
      id: `GW${i}`,
      type: 'router',
      label: `Gateway ${i}`,
      vlan_id: 1,
      campus_zone: 'gateway'
    });
  }
  
  // Add core switch
  nodes.push({
    id: 'CORE1',
    type: 'switch',
    label: 'Core Switch',
    vlan_id: 10,
    campus_zone: 'admin'
  });
  
  // Add access switches
  for (let i = 1; i <= switchCount; i++) {
    nodes.push({
      id: `SW${i}`,
      type: 'switch',
      label: `Access Switch ${i}`,
      vlan_id: 10 + i,
      campus_zone: `zone_${i % buildingCount || buildingCount}`
    });
  }
  
  // Add servers
  for (let i = 1; i <= serverCount; i++) {
    nodes.push({
      id: `SRV${i}`,
      type: 'server',
      label: `Server ${i}`,
      vlan_id: 20,
      campus_zone: 'server_room'
    });
  }
  
  // Add workstations
  for (let i = 1; i <= workstationCount; i++) {
    nodes.push({
      id: `PC${i}`,
      type: 'pc',
      label: `Workstation ${i}`,
      vlan_id: 10 + (i % switchCount),
      campus_zone: `zone_${(i % buildingCount) || buildingCount}`
    });
  }
  
  // Connect routers to core
  for (let i = 1; i <= routerCount; i++) {
    edges.push({
      id: `E-GW${i}-CORE`,
      source: `GW${i}`,
      target: 'CORE1',
      label: `Gateway ${i} uplink`,
      bandwidth_mbps: 10000
    });
  }
  
  // Connect core to switches
  for (let i = 1; i <= switchCount; i++) {
    edges.push({
      id: `E-CORE-SW${i}`,
      source: 'CORE1',
      target: `SW${i}`,
      label: 'Distribution',
      bandwidth_mbps: 1000
    });
  }
  
  // Connect workstations to switches
  for (let i = 1; i <= workstationCount; i++) {
    edges.push({
      id: `E-PC${i}`,
      source: `SW${(i % switchCount) || switchCount}`,
      target: `PC${i}`,
      label: 'Access',
      bandwidth_mbps: 100
    });
  }
  
  // Connect servers to switches
  for (let i = 1; i <= serverCount; i++) {
    edges.push({
      id: `E-SRV${i}`,
      source: `SW${(i % switchCount) || switchCount}`,
      target: `SRV${i}`,
      label: 'Server connection',
      bandwidth_mbps: 1000
    });
  }

  const result = { nodes, edges };
  console.log('https://openai.com/api/images/64x64.png', result);
  console.log('https://openai.com/api/images/64x64.png', result.nodes.length, 'Edges count:', result.edges.length);
  return result;
}

export async function generateTopology(prompt: string) {
  console.log('🚀 generateTopology called with prompt:', prompt);
  console.log('🔑 GROQ_API_KEY_CONFIGURED:', GROQ_API_KEY_CONFIGURED);
  
  // Always try mock first to ensure basic functionality works
  console.log('📝 Generating mock topology first...');
  const mockResult = mockTopologyFromPrompt(prompt);
  console.log('📊 Mock topology result:', mockResult);
  
  if (!GROQ_API_KEY_CONFIGURED) {
    console.log('🔑 No API key, using mock only');
    return mockResult;
  }
  
  // Try Groq API if configured, but always have mock as fallback
  try {
    console.log('🤖 Calling Groq API...');
    const content = await callGroq(topologySystemPrompt, prompt);
    console.log('📄 Groq response received');
    const apiResult = parseTopologyJson(content);
    console.log('📊 API topology result:', apiResult);
    return apiResult;
  } catch (error) {
    console.error('❌ Groq API failed, using mock fallback:', error);
    return mockResult;
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
    } satisfies TopologyPayload;
  }
  
  try {
    const content = await callGroq(bottleneckPrompt, JSON.stringify(topology));
    return parseTopologyJson(content);
  } catch (error) {
    console.error('❌ predictBottlenecks failed, falling back to mock data:', error);
    return {
      nodes: [],
      edges: topology.edges.slice(0, 2).map((edge, index) => ({
        ...edge,
        bottleneck: index === 0,
        bandwidth_mbps: edge.bandwidth_mbps ?? 100,
        label: index === 0 ? 'Likely bottleneck (fallback)' : edge.label,
      })),
    } satisfies TopologyPayload;
  }
}

export async function suggestHealthFixes(monitor: NetworkMonitorState) {
  if (!GROQ_API_KEY_CONFIGURED) {
    return [
      monitor.packetLoss > 5 ? 'Packet loss is elevated. Reconnect to the strongest campus Wi-Fi AP.' : 'Check DNS settings and renew the DHCP lease.',
      monitor.pingMs > 200 ? 'Latency is high. Move closer to the access point or switch to the Library SSID.' : 'Restart the adapter if the signal remains unstable.',
    ];
  }
  const content = await callGroq(healPrompt, JSON.stringify(monitor));
  return parseFixSuggestions(content);
}

export async function analyzeIncident(incident: IncidentRecord, history: NetworkLogRecord[] = []) {
  if (!GROQ_API_KEY_CONFIGURED) {
    const historyCount = history.filter((log) => log.nodeId === incident.locationId && log.status === 'DOWN').length;
    return `Latency reached ${incident.latencyMs} ms and packet loss hit ${incident.packetLoss}%. This node has failed ${historyCount} times recently. Check the physical cable and switch port health near ${incident.locationId}.`;
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

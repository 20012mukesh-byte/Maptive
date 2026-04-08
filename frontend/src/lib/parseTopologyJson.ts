import { lightTheme, vlanColorFor } from '@/lib/themes';
import type { TopologyPayload, TopologyEdgeSpec, TopologyNodeSpec } from '@/types/topology';

function stripCodeFence(raw: string): string {
  const text = raw.trim();
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return match ? match[1].trim() : text;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

function normalizeDeviceType(t: string): TopologyNodeSpec['type'] {
  const value = (t || 'router').toLowerCase();
  if (['router', 'switch', 'pc', 'server', 'cloud', 'hub', 'wifi_edge'].includes(value)) {
    return value as TopologyNodeSpec['type'];
  }
  if (value.includes('switch')) return 'switch';
  if (value.includes('server')) return 'server';
  if (value.includes('pc') || value.includes('workstation')) return 'pc';
  if (value.includes('cloud')) return 'cloud';
  return 'router';
}

export function parseTopologyJson(text: string): TopologyPayload {
  const cleaned = extractJsonObject(stripCodeFence(text));
  
  // Log the cleaned JSON for debugging
  console.log('🔍 Parsing JSON content:', cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : ''));
  
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(cleaned) as Record<string, unknown>;
  } catch (error) {
    console.error('❌ JSON parse failed in parseTopologyJson:', error);
    console.error('Problematic area around position 3925:', cleaned.substring(Math.max(0, 3900), Math.min(cleaned.length, 3950)));
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse topology JSON: ${errorMessage}`);
  }
  const rawNodes = (obj.nodes ?? []) as unknown[];
  const rawEdges = (obj.edges ?? obj.links ?? []) as unknown[];

  const nodes: TopologyNodeSpec[] = rawNodes
    .map((node) => {
      const record = node as Record<string, unknown>;
      return {
        id: String(record.id ?? ''),
        type: normalizeDeviceType(String(record.type ?? 'router')),
        label: record.label != null ? String(record.label) : String(record.id ?? ''),
        vlan_id:
          typeof record.vlan_id === 'number'
            ? record.vlan_id
            : typeof record.vlanId === 'number'
              ? record.vlanId
              : undefined,
        campus_zone: record.campus_zone != null ? String(record.campus_zone) : undefined,
      };
    })
    .filter((node) => node.id);

  const edges: TopologyEdgeSpec[] = rawEdges
    .map((edge, index) => {
      const record = edge as Record<string, unknown>;
      return {
        id: String(record.id ?? `E${index + 1}`),
        source: String(record.source ?? ''),
        target: String(record.target ?? ''),
        label: record.label != null ? String(record.label) : undefined,
        healing: Boolean(record.healing ?? record.redundant ?? false),
        bottleneck: Boolean(record.bottleneck ?? false),
        broken: Boolean(record.broken ?? false),
        bandwidth_mbps: typeof record.bandwidth_mbps === 'number' ? record.bandwidth_mbps : undefined,
      };
    })
    .filter((edge) => edge.source && edge.target);

  return {
    nodes: nodes.map((node) => ({ ...node, vlan_id: node.vlan_id ?? 10 })),
    edges: edges.map((edge) => ({ ...edge, bandwidth_mbps: edge.bandwidth_mbps ?? 1000 })),
  };
}

export function parseFixSuggestions(text: string): string[] {
  try {
    const cleaned = extractJsonObject(stripCodeFence(text));
    const obj = JSON.parse(cleaned) as { suggestions?: string[] };
    if (Array.isArray(obj.suggestions) && obj.suggestions.length) {
      return obj.suggestions.map(String);
    }
  } catch {
  }

  return text
    .split(/\r?\n|\d+\./)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function labelForVlan(vlanId?: number) {
  if (!vlanId) return 'Unassigned VLAN';
  return `VLAN ${vlanId}`;
}

export const defaultHaloColor = lightTheme.primary;
export { vlanColorFor };

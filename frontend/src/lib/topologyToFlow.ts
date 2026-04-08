import { MarkerType, type Edge } from '@xyflow/react';
import { vlanColorFor } from '@/lib/themes';
import type { DeviceType, NetworkNodeData, RFEdge, RFNode, TopologyPayload } from '@/types/topology';

function asDeviceType(t: string): DeviceType {
  const value = t.toLowerCase();
  if (['router', 'switch', 'pc', 'server', 'cloud', 'hub', 'wifi_edge'].includes(value)) {
    return value as DeviceType;
  }
  return 'router';
}

export function payloadToReactFlow(
  payload: TopologyPayload,
  failedNodeIds: Set<string>
): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = payload.nodes.map((node) => {
    const deviceType = asDeviceType(String(node.type));
    const failed = failedNodeIds.has(node.id);
    const vlanId = node.vlan_id;
    const data: NetworkNodeData = {
      label: node.label || node.id,
      deviceType,
      failed,
      status: failed ? 'offline' : 'online',
      vlanId,
      vlanColor: vlanColorFor(vlanId),
      campusZone: node.campus_zone,
    };

    return {
      id: node.id,
      type: 'network',
      position: { x: Math.random() * 400, y: Math.random() * 300 }, // Random position for initial layout
      data,
    };
  });

  const edges: RFEdge[] = payload.edges.map((edge) => {
    const touchesFailed = failedNodeIds.has(edge.source) || failedNodeIds.has(edge.target);
    const healing = Boolean(edge.healing);
    const bottleneck = Boolean(edge.bottleneck);
    const broken = Boolean(edge.broken);
    const stroke = broken ? '#ff2d55' : healing ? '#38bdf8' : bottleneck ? '#fdba74' : touchesFailed ? '#fca5a5' : '#94a3b8';

    return {
      id: edge.id,
      type: 'dataFlow',
      source: edge.source,
      target: edge.target,
      label: edge.label,
      data: {
        active: !touchesFailed,
        degraded: touchesFailed,
        healing,
        bottleneck,
        broken,
        bandwidthMbps: edge.bandwidth_mbps,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      style: broken ? { strokeDasharray: '2 8' } : healing ? { strokeDasharray: '10 8' } : bottleneck ? { strokeDasharray: '5 5' } : undefined,
      labelStyle: { fill: '#475569', fontSize: 10 },
      labelBgStyle: { fill: 'rgba(255,255,255,0.8)' },
    } satisfies Edge;
  });

  return { nodes, edges };
}

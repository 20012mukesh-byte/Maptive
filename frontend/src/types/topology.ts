import type { Edge, Node } from '@xyflow/react';

export type RFEdge = Edge;

export type DeviceType =
  | 'router'
  | 'switch'
  | 'pc'
  | 'server'
  | 'cloud'
  | 'hub'
  | 'wifi_edge';

export type TopologyNodeSpec = {
  id: string;
  type: DeviceType | string;
  label?: string;
  vlan_id?: number;
  campus_zone?: string;
};

export type TopologyEdgeSpec = {
  id: string;
  source: string;
  target: string;
  label?: string;
  healing?: boolean;
  bottleneck?: boolean;
  broken?: boolean;
  bandwidth_mbps?: number;
};

export type TopologyPayload = {
  nodes: TopologyNodeSpec[];
  edges: TopologyEdgeSpec[];
};

export type NodeHealthStatus = 'online' | 'warning' | 'offline';

export type NetworkNodeData = {
  label: string;
  deviceType: DeviceType;
  failed?: boolean;
  status?: NodeHealthStatus;
  highlighted?: boolean;
  latencyMs?: number;
  vlanId?: number;
  vlanColor?: string;
  campusZone?: string;
};

export type NetworkLogStatus = 'UP' | 'DOWN' | 'DEGRADED';

export type NetworkLogRecord = {
  id: string;
  nodeId: string;
  status: NetworkLogStatus;
  latencyMs?: number;
  packetRate?: number;
  updatedAt?: number;
};

export type BreakdownSnapshot = {
  records: NetworkLogRecord[];
  breakdownCount: number;
  failedNodeIds: Set<string>;
  averageLatency: number;
  uptimePercent: number;
};

export type IncidentRecord = {
  id: string;
  uid?: string;
  email?: string | null;
  latencyMs: number;
  packetLoss: number;
  locationId: string;
  connectionType?: string;
  createdAt?: number;
  resolvedAt?: number;
  summary?: string;
  explanation?: string;
  edgeId?: string;
};

export type NetworkMonitorState = {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  pingMs: number;
  online: boolean;
  packetLoss: number;
  weakSignal: boolean;
  breakdownDetected: boolean;
  sampledAt: string;
  locationId: string;
};

export type RFNode = Node<NetworkNodeData, 'network'>;

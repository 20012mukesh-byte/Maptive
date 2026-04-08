import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Focus, Gauge, Maximize2, Sparkles } from 'lucide-react';
import { CollaborationPeers } from '@/components/CollaborationPeers';
import { DataFlowEdge } from '@/components/edges/DataFlowEdge';
import { NetworkNode } from '@/components/nodes/NetworkNode';
import { useCollaborationWrite } from '@/hooks/useCollaborationWrite';
import { layoutWithDagre } from '@/lib/layoutDagre';
import { payloadToReactFlow } from '@/lib/topologyToFlow';
import { lightTheme } from '@/lib/themes';
import type { AppUser } from '@/context/AuthContext';
import type { NetworkNodeData, NodeHealthStatus, RFNode, TopologyEdgeSpec, TopologyPayload } from '@/types/topology';

const nodeTypes = { network: NetworkNode };
const edgeTypes = { dataFlow: DataFlowEdge };

type NodeMetrics = Map<string, { status: NodeHealthStatus; latencyMs?: number }>;

type CampusCluster = {
  zone: string;
  offsetX: number;
  offsetY: number;
};

function markerColor(edge: Edge, degraded: boolean, healing: boolean, bottleneck: boolean, broken: boolean) {
  if (broken) return '#ff2d55';
  if (healing) return lightTheme.primary;
  if (bottleneck) return lightTheme.warning;
  if (degraded) return lightTheme.error;
  return '#94a3b8';
}

function normalizeEdges(edges: Edge[], failed: Set<string>): Edge[] {
  return edges.map((edge) => {
    const payload = (typeof edge.data === 'object' && edge.data ? edge.data : {}) as {
      healing?: boolean;
      bottleneck?: boolean;
      bandwidthMbps?: number;
      broken?: boolean;
    };
    const healing = Boolean(payload.healing);
    const bottleneck = Boolean(payload.bottleneck);
    // Explicitly snap edge to 'broken' if either side is in the failed set
    const broken = Boolean(payload.broken) || (!healing && (failed.has(edge.source) || failed.has(edge.target)));
    // If it's broken, it's not simply degraded
    const degraded = false;
    
    return {
      ...edge,
      type: edge.type || 'dataFlow',
      data: {
        active: !broken,
        degraded,
        healing,
        bottleneck,
        broken,
        bandwidthMbps: payload.bandwidthMbps,
      },
      style: broken
        ? { ...(edge.style ?? {}), strokeDasharray: '2 10' }
        : healing
          ? { ...(edge.style ?? {}), strokeDasharray: '10 8' }
          : bottleneck
            ? { ...(edge.style ?? {}), strokeDasharray: '6 6' }
            : edge.style,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: markerColor(edge, degraded, healing, bottleneck, broken),
      },
    };
  });
}

function nodeState(node: RFNode, failedNodeIds: Set<string>, highlightedNodeIds: Set<string>, metrics: NodeMetrics): RFNode {
  const metric = metrics.get(node.id);
  const failed = failedNodeIds.has(node.id) || metric?.status === 'offline';
  const status: NodeHealthStatus = failed ? 'offline' : metric?.status ?? (node.data.status === 'warning' ? 'warning' : 'online');

  return {
    ...node,
    data: {
      ...node.data,
      failed,
      highlighted: highlightedNodeIds.has(node.id),
      status,
      latencyMs: metric?.latencyMs ?? node.data.latencyMs,
    },
  };
}

function buildClusters(nodes: RFNode[]): CampusCluster[] {
  const zones = Array.from(new Set(nodes.map((node) => node.data.campusZone).filter(Boolean))) as string[];
  if (!zones.length) return [];
  const columns = Math.ceil(Math.sqrt(zones.length));
  return zones.map((zone, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      zone,
      offsetX: col * 520,
      offsetY: row * 380,
    };
  });
}

function applyClusterOffsets(nodes: RFNode[]) {
  const clusters = buildClusters(nodes);
  if (!clusters.length) return nodes;
  const clusterMap = new Map(clusters.map((cluster) => [cluster.zone, cluster]));

  return nodes.map((node) => {
    const zone = node.data.campusZone;
    if (!zone || !clusterMap.has(zone)) return node;
    const cluster = clusterMap.get(zone)!;
    return {
      ...node,
      position: {
        x: node.position.x + cluster.offsetX,
        y: node.position.y + cluster.offsetY,
      },
    };
  });
}

function AutoFitInner({ token }: { token: number }) {
  const reactFlow = useReactFlow();
  useEffect(() => {
    if (token > 0) requestAnimationFrame(() => reactFlow.fitView({ padding: 0.18, duration: 420 }));
  }, [token, reactFlow]);
  return null;
}

export type NetworkCanvasHandle = {
  applyTopology: (payload: TopologyPayload) => void;
  hydrateFromSaved: (nodes: RFNode[], edges: Edge[], failedOverride?: Set<string>) => void;
  exportSaved: () => { nodes: RFNode[]; edges: Edge[] };
  fitToView: () => void;
  appendRedundantEdges: (edges: TopologyEdgeSpec[]) => void;
  autoArrange: () => void;
  highlightBottlenecks: (edges: TopologyEdgeSpec[]) => void;
  setBrokenEdges: (edgeIds: string[]) => void;
};

type InnerProps = {
  failedNodeIds: Set<string>;
  highlightedNodeIds: Set<string>;
  user: AppUser | null;
  nodeMetrics?: NodeMetrics;
  suppressFailedSync?: boolean;
};

const FlowCanvasInner = forwardRef<NetworkCanvasHandle, InnerProps>(function FlowCanvasInner(
  { failedNodeIds, highlightedNodeIds, user, nodeMetrics, suppressFailedSync },
  ref
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [fitToken, setFitToken] = useState(0);
  const failedRef = useRef(failedNodeIds);
  const metrics = useMemo(() => nodeMetrics ?? new Map<string, { status: NodeHealthStatus; latencyMs?: number }>(), [nodeMetrics]);
  const metricsRef = useRef(metrics);
  failedRef.current = failedNodeIds;
  metricsRef.current = metrics;

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const onCollabMove = useCollaborationWrite(user, () => reactFlowRef.current);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const autoArrange = useCallback(() => {
    setNodes((current) => applyClusterOffsets(layoutWithDagre(current, edgesRef.current)));
    setFitToken((token) => token + 1);
  }, [setNodes]);

  const applyTopology = useCallback(
    (payload: TopologyPayload) => {
      const flow = payloadToReactFlow(payload, failedRef.current);
      const laidOut = applyClusterOffsets(layoutWithDagre(flow.nodes, flow.edges));
      setNodes(laidOut.map((node) => nodeState(node, failedRef.current, highlightedNodeIds, metricsRef.current)));
      setEdges(normalizeEdges(flow.edges, failedRef.current));
      setFitToken((token) => token + 1);
    },
    [highlightedNodeIds, setEdges, setNodes]
  );

  const hydrateFromSaved = useCallback(
    (savedNodes: RFNode[], savedEdges: Edge[], failedOverride?: Set<string>) => {
      const failed = failedOverride ?? failedRef.current;
      setNodes(savedNodes.map((node) => nodeState(node, failed, highlightedNodeIds, metricsRef.current)));
      setEdges(normalizeEdges(savedEdges, failed));
      setFitToken((token) => token + 1);
    },
    [highlightedNodeIds, setEdges, setNodes]
  );

  const exportSaved = useCallback(() => ({ nodes: nodesRef.current, edges: edgesRef.current }), []);
  const fitToView = useCallback(() => reactFlowRef.current?.fitView({ padding: 0.18, duration: 480 }), []);

  const appendRedundantEdges = useCallback((healingEdges: TopologyEdgeSpec[]) => {
    if (!healingEdges.length) return;
    setEdges((current) => {
      const existing = new Set(current.map((edge) => edge.id));
      const additions = healingEdges
        .filter((edge) => edge.source && edge.target && !existing.has(edge.id))
        .map((edge) => ({
          id: edge.id,
          type: 'dataFlow',
          source: edge.source,
          target: edge.target,
          label: edge.label ?? 'Redundant uplink',
          data: { active: true, degraded: false, healing: true, bandwidthMbps: edge.bandwidth_mbps },
          style: { strokeDasharray: '10 8' },
          markerEnd: { type: MarkerType.ArrowClosed, color: lightTheme.primary },
        } satisfies Edge));
      return normalizeEdges([...current, ...additions], failedRef.current);
    });
    setFitToken((token) => token + 1);
  }, [setEdges]);

  const highlightBottlenecks = useCallback((bottleneckEdges: TopologyEdgeSpec[]) => {
    if (!bottleneckEdges.length) return;
    const targetIds = new Set(bottleneckEdges.map((edge) => edge.id));
    setEdges((current) =>
      normalizeEdges(
        current.map((edge) => ({
          ...edge,
          data: {
            ...(edge.data as object),
            bottleneck: targetIds.has(edge.id),
          },
          label: targetIds.has(edge.id) ? edge.label ?? 'Potential bottleneck' : edge.label,
        })),
        failedRef.current
      )
    );
  }, [setEdges]);

  const setBrokenEdges = useCallback((edgeIds: string[]) => {
    const targetIds = new Set(edgeIds);
    setEdges((current) =>
      normalizeEdges(
        current.map((edge) => ({
          ...edge,
          data: {
            ...(edge.data as object),
            broken: targetIds.has(edge.id),
          },
        })),
        failedRef.current
      )
    );
  }, [setEdges]);

  useImperativeHandle(ref, () => ({ applyTopology, hydrateFromSaved, exportSaved, fitToView, appendRedundantEdges, autoArrange, highlightBottlenecks, setBrokenEdges }), [appendRedundantEdges, applyTopology, autoArrange, exportSaved, fitToView, highlightBottlenecks, hydrateFromSaved, setBrokenEdges]);

  useEffect(() => {
    if (suppressFailedSync) return;
    setNodes((current) => current.map((node) => nodeState(node, failedNodeIds, highlightedNodeIds, metrics)));
  }, [failedNodeIds, highlightedNodeIds, metrics, setNodes, suppressFailedSync]);

  useEffect(() => {
    if (suppressFailedSync) return;
    setEdges((current) => normalizeEdges(current, failedNodeIds));
  }, [failedNodeIds, setEdges, suppressFailedSync]);

  return (
    <div className="h-full w-full min-h-[400px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        onPaneMouseMove={onCollabMove}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        defaultEdgeOptions={{ type: 'dataFlow' }}
        proOptions={{ hideAttribution: true }}
      >
        <AutoFitInner token={fitToken} />
        <CollaborationPeers user={user} />
        <Panel position="top-right" className="m-2 flex gap-1 rounded-2xl border border-white/40 bg-white/30 p-1 shadow-glass backdrop-blur-2xl">
          <button type="button" onClick={autoArrange} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-300/40 hover:bg-sky-500/20" title="Auto-arrange nodes with dagre">
            <Sparkles className="h-3.5 w-3.5" />
            Auto-Arrange
          </button>
          <button type="button" onClick={fitToView} className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-700 ring-1 ring-white/40 hover:bg-white/85" title="Center current layout">
            <Maximize2 className="h-3.5 w-3.5" />
            Fit
          </button>
          <button type="button" onClick={fitToView} className="inline-flex items-center justify-center rounded-xl bg-white/70 p-2 text-slate-700 ring-1 ring-white/40 hover:bg-white/85" title="Recenter">
            <Focus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => highlightBottlenecks(edgesRef.current.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, bottleneck: true })))} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-100/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-orange-700 ring-1 ring-orange-200/70 hover:bg-orange-100" title="Preview bottlenecks">
            <Gauge className="h-3.5 w-3.5" />
            Slow Links
          </button>
        </Panel>
        <Background color="#dbeafe" gap={20} size={1} />
        <Controls position="bottom-left" className="!m-3 !border-white/40 !bg-white/70 !shadow-lg [&_button]:!fill-slate-700" />
        <MiniMap
          position="bottom-right"
          className="!m-3 !rounded-2xl !border !border-white/40 !bg-white/65 !shadow-glass backdrop-blur-sm"
          nodeColor={(node) => {
            const data = node.data as NetworkNodeData;
            if (data.failed || data.status === 'offline') return '#ff2d55';
            if (data.status === 'warning') return '#fdba74';
            return data.vlanColor ?? '#7dd3fc';
          }}
          maskColor="rgba(240,249,255,0.7)"
        />
      </ReactFlow>
    </div>
  );
});

export const NetworkCanvas = forwardRef<NetworkCanvasHandle, InnerProps>(function NetworkCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});

import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { NetworkNodeData } from '@/types/topology';

const NODE_W = 200;
const NODE_H = 88;

export function layoutWithDagre(
  nodes: Node<NetworkNodeData, 'network'>[],
  edges: Edge[]
): Node<NetworkNodeData, 'network'>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 72, ranksep: 96, marginx: 24, marginy: 24 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });
}

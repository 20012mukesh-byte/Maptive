import type { TopologyEdgeSpec, TopologyNodeSpec, TopologyPayload } from '@/types/topology';

/**
 * Offline stand-in for Gemini: returns the same JSON shape (nodes + edges).
 * Used when VITE_GEMINI_API_KEY is not set.
 */
export function mockTopologyFromPrompt(prompt: string): TopologyPayload {
  const low = prompt.trim().toLowerCase();
  let n = 0;
  const edge = (
    source: string,
    target: string,
    label: 'FastEthernet' | 'Gigabit' = 'FastEthernet'
  ): TopologyEdgeSpec => ({
    id: `E${++n}`,
    source,
    target,
    label,
  });

  // Office / access LAN
  if (
    low.includes('office') ||
    low.includes('2960') ||
    low.includes('workstation') ||
    (low.includes('switch') && low.includes('pc')) ||
    (low.includes('three') && low.includes('workstation')) ||
    (low.includes('3') && low.includes('workstation'))
  ) {
    const nodes: TopologyNodeSpec[] = [
      { id: 'R1', type: 'router', label: 'Core router' },
      { id: 'SW1', type: 'switch', label: 'Cisco 2960 Access' },
      { id: 'PC1', type: 'pc', label: 'Workstation 1' },
      { id: 'PC2', type: 'pc', label: 'Workstation 2' },
      { id: 'PC3', type: 'pc', label: 'Workstation 3' },
      { id: 'SRV1', type: 'server', label: 'File server' },
    ];
    return {
      nodes,
      edges: [
        edge('R1', 'SW1', 'Gigabit'),
        edge('SW1', 'PC1'),
        edge('SW1', 'PC2'),
        edge('SW1', 'PC3'),
        edge('SW1', 'SRV1'),
      ],
    };
  }

  // WAN / redundant / ISP / cloud
  if (
    low.includes('redundant') ||
    low.includes('isp') ||
    low.includes('internet') ||
    (low.includes('serial') && low.includes('router')) ||
    (low.includes('two') && low.includes('router')) ||
    (low.includes('distribution') && low.includes('switch'))
  ) {
    const nodes: TopologyNodeSpec[] = [
      { id: 'R1', type: 'router', label: 'Core router A' },
      { id: 'R2', type: 'router', label: 'Core router B' },
      { id: 'SW1', type: 'switch', label: 'Distribution A' },
      { id: 'SW2', type: 'switch', label: 'Distribution B' },
      { id: 'Cloud-ISP', type: 'cloud', label: 'ISP / Internet' },
    ];
    return {
      nodes,
      edges: [
        edge('R1', 'R2', 'Gigabit'),
        edge('R1', 'SW1', 'Gigabit'),
        edge('R2', 'SW2', 'Gigabit'),
        edge('R1', 'Cloud-ISP', 'Gigabit'),
      ],
    };
  }

  // Cloud-only mention
  if (low.includes('cloud') || low.includes('saas')) {
    return {
      nodes: [
        { id: 'R1', type: 'router', label: 'Edge router' },
        { id: 'Cloud-ISP', type: 'cloud', label: 'Public cloud' },
      ],
      edges: [edge('R1', 'Cloud-ISP', 'Gigabit')],
    };
  }

  // Server + switch
  if (low.includes('server') && low.includes('switch')) {
    return {
      nodes: [
        { id: 'R1', type: 'router', label: 'Gateway' },
        { id: 'SW1', type: 'switch', label: 'ToR switch' },
        { id: 'SRV1', type: 'server', label: 'App server' },
        { id: 'SRV2', type: 'server', label: 'DB server' },
      ],
      edges: [
        edge('R1', 'SW1', 'Gigabit'),
        edge('SW1', 'SRV1', 'Gigabit'),
        edge('SW1', 'SRV2', 'Gigabit'),
      ],
    };
  }

  // Default demo (any other prompt still builds something useful)
  return {
    nodes: [
      { id: 'R1', type: 'router', label: 'R1' },
      { id: 'SW1', type: 'switch', label: 'SW1' },
      { id: 'PC1', type: 'pc', label: 'PC1' },
      { id: 'PC2', type: 'pc', label: 'PC2' },
    ],
    edges: [
      edge('R1', 'SW1', 'Gigabit'),
      edge('SW1', 'PC1'),
      edge('SW1', 'PC2'),
    ],
  };
}

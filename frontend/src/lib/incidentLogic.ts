import type { IncidentRecord, TopologyPayload } from '@/types/topology';

export function suggestIncidentCause(incident: IncidentRecord | null) {
  if (!incident) return 'Select an incident to ask Grok for analysis.';
  if (incident.packetLoss > 10) return 'High packet loss suggests a cable fault or overloaded wireless segment.';
  if (incident.latencyMs > 250) return 'Latency spikes often indicate congestion or a failing uplink.';
  return 'Check link negotiation and campus switch port status for this segment.';
}

export function mockPdfTopology(fileName: string): TopologyPayload {
  const campus = fileName.toLowerCase().includes('campus') ? 'Campus' : 'University';
  return {
    nodes: [
      { id: 'CORE', type: 'switch', label: `${campus} Core`, vlan_id: 10, campus_zone: 'admin' },
      { id: 'LIB-SW', type: 'switch', label: 'Library Switch', vlan_id: 20, campus_zone: 'library' },
      { id: 'ENG-RT', type: 'router', label: 'Engineering Router', vlan_id: 30, campus_zone: 'lab_a' },
      { id: 'SRV-1', type: 'server', label: 'Main Server', vlan_id: 10, campus_zone: 'admin' },
      { id: 'LAB-1', type: 'pc', label: 'Lab PC Cluster', vlan_id: 30, campus_zone: 'lab_b' },
    ],
    edges: [
      { id: 'E-CORE-LIB', source: 'CORE', target: 'LIB-SW', label: 'Fiber trunk', bandwidth_mbps: 10000 },
      { id: 'E-CORE-ENG', source: 'CORE', target: 'ENG-RT', label: 'Backbone', bandwidth_mbps: 10000 },
      { id: 'E-CORE-SRV', source: 'CORE', target: 'SRV-1', label: 'Server uplink', bandwidth_mbps: 10000 },
      { id: 'E-ENG-LAB', source: 'ENG-RT', target: 'LAB-1', label: 'Lab distribution', bandwidth_mbps: 1000 },
    ],
  };
}

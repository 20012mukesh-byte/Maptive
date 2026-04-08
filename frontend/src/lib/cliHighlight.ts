/**
 * Map Cisco-style CLI snippets to node ids on the canvas (fuzzy match).
 */
export function resolveCliTargets(
  command: string,
  nodeIds: string[]
): { message: string; ids: string[] } {
  const raw = command.trim();
  const low = raw.toLowerCase();
  const ids: string[] = [];

  if (!raw) {
    return { message: 'Empty command.', ids: [] };
  }

  if (low === 'conf t' || low === 'configure terminal' || low === 'conf terminal') {
    return {
      message: 'Configuration mode (simulated). Select an interface below or type e.g. int g0/0.',
      ids: nodeIds.filter((id) => /r\d|router/i.test(id)),
    };
  }

  const intMatch = low.match(/^(?:interface|int)\s+(\S+)/i);
  if (intMatch) {
    const iface = intMatch[1].replace(/\//g, '').toLowerCase();
    for (const id of nodeIds) {
      const compact = id.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (compact.includes(iface) || iface.includes(compact.slice(0, 4))) {
        ids.push(id);
      }
    }
    if (ids.length === 0) {
      const g = iface.match(/g(?:igabit)?[e]?\s*(\d+)/);
      const num = g ? g[1] : null;
      if (num) {
        const hit = nodeIds.find((id) => id.includes(num));
        if (hit) ids.push(hit);
      }
    }
    return {
      message: ids.length
        ? `Highlighted ${ids.join(', ')} for ${intMatch[0]}.`
        : `No node matched interface ${intMatch[1]}. Try a device id (e.g. R1, SW1).`,
      ids,
    };
  }

  if (low.startsWith('show') || low.includes('brief')) {
    const routers = nodeIds.filter((id) => /^r\d|^router/i.test(id));
    return {
      message: 'Simulated show — highlighting routers / core nodes.',
      ids: routers.length ? routers : nodeIds.slice(0, 3),
    };
  }

  const frag = raw.replace(/^#/, '').trim();
  for (const id of nodeIds) {
    if (id.toLowerCase().includes(frag.toLowerCase()) || frag.toLowerCase() === id.toLowerCase()) {
      ids.push(id);
    }
  }
  return {
    message: ids.length
      ? `Matched: ${ids.join(', ')}`
      : 'No match. Try: conf t, int g0/0, show ip int brief, or a node id.',
    ids,
  };
}

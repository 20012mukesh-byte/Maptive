export function matchNodeId(hint: string, nodeIds: string[]): string {
  const h = hint.trim().toLowerCase().replace(/\s+/g, '');
  const exact = nodeIds.find((id) => id.toLowerCase().replace(/\s+/g, '') === h);
  if (exact) return exact;
  const loose = nodeIds.find(
    (id) =>
      id.toLowerCase().includes(h) ||
      h.includes(id.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
  return loose ?? hint.trim();
}

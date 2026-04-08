/**
 * Parse natural-language heal / fix commands for restore events.
 */
export function parseHealTarget(prompt: string): string | null {
  const low = prompt.toLowerCase();
  if (!/\b(fix|heal|resolve|repair|clear\s+breakdown|restore)\b/i.test(low)) {
    return null;
  }

  const quoted = prompt.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1].trim();

  const afterOn = low.match(/\b(?:on|for|at)\s+([a-z0-9][\w.-]*)/i);
  if (afterOn) return afterOn[1].trim();

  const router = low.match(/router[_\s-]*(\w+)/i);
  if (router) {
    const n = router[1];
    return /^[a-z]+$/i.test(n) && n.length <= 2 ? `R${n.toUpperCase()}` : n;
  }

  const tokens = prompt.match(
    /\b(R\d+|SW\d+|PC\d+|SRV\d+|Switch-[A-Z]|Cloud-ISP|Router-[\w]+)\b/i
  );
  if (tokens) {
    const t = tokens[1];
    const m = /^Router-0*(\d+)$/i.exec(t);
    if (m) return `R${m[1]}`;
    return t.replace(/^router-/i, '');
  }

  if (/\bbreakdown\b|\bfailure\b|\blink\b/i.test(low)) {
    return 'R1';
  }

  return null;
}

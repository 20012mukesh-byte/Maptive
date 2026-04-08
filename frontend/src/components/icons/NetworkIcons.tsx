import type { DeviceType } from '@/types/topology';

export function DeviceIcon({
  type,
  className,
}: {
  type: DeviceType | string;
  className?: string;
}) {
  const t = String(type).toLowerCase();
  const sw = 1.6;
  const stroke = 'currentColor';

  if (t === 'switch') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <rect x="6" y="14" width="36" height="20" rx="4" strokeWidth={sw} stroke={stroke} fill="rgba(14,165,233,0.08)" />
        <path d="M12 22h6M22 22h6M32 22h4M12 28h24" strokeWidth={sw} stroke={stroke} fill="none" />
        <circle cx="14" cy="22" r="1.4" fill={stroke} />
        <circle cx="24" cy="22" r="1.4" fill={stroke} />
        <circle cx="34" cy="22" r="1.4" fill={stroke} />
      </svg>
    );
  }
  if (t === 'pc') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <rect x="10" y="10" width="28" height="20" rx="3" strokeWidth={sw} stroke={stroke} fill="rgba(125,211,252,0.1)" />
        <path d="M14 34h20M18 38h12" strokeWidth={sw} stroke={stroke} fill="none" />
        <path d="M16 16h16M16 21h12" strokeWidth={1.4} stroke={stroke} opacity={0.5} fill="none" />
      </svg>
    );
  }
  if (t === 'server') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <rect x="9" y="9" width="30" height="30" rx="4" strokeWidth={sw} stroke={stroke} fill="rgba(110,231,183,0.12)" />
        <path d="M14 17h20M14 25h20M14 33h12" strokeWidth={1.4} stroke={stroke} fill="none" />
        <circle cx="34" cy="17" r="1.5" fill="#10b981" />
        <circle cx="34" cy="25" r="1.5" fill="#0ea5e9" />
        <circle cx="34" cy="33" r="1.5" fill="#f59e0b" />
      </svg>
    );
  }
  if (t === 'cloud') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <path
          d="M14 30c-4 0-7-3-7-7 0-3.5 2.5-6.4 6-6.9 1-4 4.7-7 9-7 3.4 0 6.4 1.8 8 4.5 1-.4 2-.6 3-.6 4.4 0 8 3.6 8 8 0 .5 0 1-.1 1.5 2.8.7 4.8 3.2 4.8 6.1 0 3.5-2.8 6.4-6.3 6.4H14z"
          strokeWidth={sw}
          stroke={stroke}
          fill="rgba(14,165,233,0.12)"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="8" y="14" width="32" height="20" rx="4" strokeWidth={sw} stroke={stroke} fill="rgba(191,219,254,0.14)" />
      <circle cx="17" cy="24" r="2.2" fill={stroke} opacity={0.85} />
      <circle cx="24" cy="24" r="2.2" fill={stroke} opacity={0.55} />
      <circle cx="31" cy="24" r="2.2" fill={stroke} opacity={0.35} />
      <path d="M6 24h4M38 24h4" strokeWidth={sw} stroke={stroke} />
    </svg>
  );
}

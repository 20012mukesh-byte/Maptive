export const lightTheme = {
  background: '#f8fafc',
  panel: 'rgba(255,255,255,0.4)',
  panelStrong: 'rgba(255,255,255,0.64)',
  border: 'rgba(255,255,255,0.2)',
  primary: '#0ea5e9',
  success: '#6ee7b7',
  error: '#fca5a5',
  warning: '#fdba74',
  text: '#0f172a',
  muted: '#64748b',
} as const;

const vlanPalette = ['#7dd3fc', '#a7f3d0', '#fbcfe8', '#fde68a', '#c4b5fd', '#fdba74'];

export function vlanColorFor(vlanId?: number) {
  if (!vlanId || vlanId <= 0) return '#bfdbfe';
  return vlanPalette[(vlanId - 1) % vlanPalette.length];
}

export const campusMapLocations: Record<string, { x: string; y: string; label: string }> = {
  library: { x: '22%', y: '28%', label: 'Library' },
  lab_a: { x: '48%', y: '36%', label: 'Lab A' },
  lab_b: { x: '60%', y: '52%', label: 'Lab B' },
  hostel: { x: '76%', y: '34%', label: 'Hostel' },
  admin: { x: '34%', y: '62%', label: 'Admin Block' },
  gateway: { x: '52%', y: '18%', label: 'Gateway' },
};

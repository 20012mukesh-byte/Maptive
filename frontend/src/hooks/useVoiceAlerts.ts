import { useEffect } from 'react';
import type { IncidentRecord } from '@/types/topology';

export function useVoiceAlerts(incident: IncidentRecord | null) {
  useEffect(() => {
    if (!incident) return;
    if (!('speechSynthesis' in window)) return;
    const msg = incident.summary ?? `Warning: incident detected at ${incident.locationId}.`;
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [incident]);
}

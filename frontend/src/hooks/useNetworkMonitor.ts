import { useEffect, useMemo, useRef, useState } from 'react';
import type { NetworkMonitorState } from '@/types/topology';

type NetworkInformationLike = {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (event: string, listener: EventListener) => void;
  removeEventListener?: (event: string, listener: EventListener) => void;
};

declare global {
  interface Navigator {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  }
}

function readConnection(): NetworkInformationLike | undefined {
  return navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
}

function computeWeakSignal(state: Pick<NetworkMonitorState, 'online' | 'effectiveType' | 'downlink' | 'rtt' | 'pingMs' | 'packetLoss'>) {
  if (!state.online) return true;
  if (state.packetLoss > 5) return true;
  if (state.pingMs > 200) return true;
  if (state.rtt > 180) return true;
  if (state.downlink > 0 && state.downlink < 3) return true;
  if (state.effectiveType.includes('2g')) return true;
  return false;
}

export function useNetworkMonitor(initialLocationId = 'lab_a') {
  const pingUrl = import.meta.env.VITE_COLLEGE_PING_URL ?? window.location.origin;
  const workerRef = useRef<Worker | null>(null);
  const [locationId, setLocationId] = useState(() => localStorage.getItem('campus_location_id') || initialLocationId);
  const [monitor, setMonitor] = useState<NetworkMonitorState>({
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    pingMs: -1,
    online: navigator.onLine,
    packetLoss: navigator.onLine ? 0 : 100,
    weakSignal: !navigator.onLine,
    breakdownDetected: !navigator.onLine,
    sampledAt: new Date().toLocaleTimeString(),
    locationId,
  });

  useEffect(() => {
    localStorage.setItem('campus_location_id', locationId);
    setMonitor((current) => ({ ...current, locationId }));
  }, [locationId]);

  useEffect(() => {
    const connection = readConnection();
    const syncConnection = () => {
      const latest = readConnection();
      setMonitor((current) => {
        const next = {
          ...current,
          connectionType: latest?.type ?? 'unknown',
          effectiveType: latest?.effectiveType ?? 'unknown',
          downlink: latest?.downlink ?? 0,
          rtt: latest?.rtt ?? 0,
          online: navigator.onLine,
          sampledAt: new Date().toLocaleTimeString(),
        };
        const weakSignal = computeWeakSignal(next);
        return {
          ...next,
          weakSignal,
          breakdownDetected: !next.online || next.packetLoss > 5 || next.pingMs > 200,
        };
      });
    };

    syncConnection();

    const worker = new Worker(new URL('../workers/pingWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.postMessage({ url: pingUrl });
    worker.onmessage = (event: MessageEvent<{ pingMs: number; packetLoss: number; online: boolean; sampledAt: number }>) => {
      setMonitor((current) => {
        const next = {
          ...current,
          pingMs: event.data.pingMs,
          packetLoss: event.data.packetLoss,
          online: event.data.online,
          sampledAt: new Date(event.data.sampledAt).toLocaleTimeString(),
        };
        const weakSignal = computeWeakSignal(next);
        return {
          ...next,
          weakSignal,
          breakdownDetected: !next.online || next.packetLoss > 5 || next.pingMs > 200,
        };
      });
    };

    window.addEventListener('online', syncConnection);
    window.addEventListener('offline', syncConnection);
    connection?.addEventListener?.('change', syncConnection);

    return () => {
      window.removeEventListener('online', syncConnection);
      window.removeEventListener('offline', syncConnection);
      connection?.removeEventListener?.('change', syncConnection);
      worker.terminate();
    };
  }, [pingUrl]);

  return useMemo(() => ({ monitor, locationId, setLocationId }), [locationId, monitor]);
}

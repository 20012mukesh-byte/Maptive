import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db, firebaseReady } from '@/lib/firebase';
import type { BreakdownSnapshot, NetworkLogRecord, NetworkLogStatus } from '@/types/topology';

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value && 'toMillis' in value) {
    return (value as Timestamp).toMillis();
  }
  return undefined;
}

function normalizeStatus(value: unknown): NetworkLogStatus {
  const status = String(value ?? 'UP').toUpperCase();
  if (status === 'DOWN' || status === 'DEGRADED') return status;
  return 'UP';
}

export function useBreakdown(enabled: boolean): BreakdownSnapshot {
  const [records, setRecords] = useState<NetworkLogRecord[]>([]);

  useEffect(() => {
    if (!enabled || !firebaseReady || !db) {
      setRecords([]);
      return;
    }

    const ref = collection(db, 'network_logs');
    const unsub = onSnapshot(ref, (snap) => {
      const next = snap.docs
        .map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const nodeId = String(data.nodeId ?? data.node_id ?? docSnap.id).trim();
          if (!nodeId) return null;

          return {
            id: docSnap.id,
            nodeId,
            status: normalizeStatus(data.status),
            latencyMs:
              typeof data.latencyMs === 'number'
                ? data.latencyMs
                : typeof data.latency === 'number'
                  ? data.latency
                  : undefined,
            packetRate:
              typeof data.packetRate === 'number' ? data.packetRate : undefined,
            updatedAt: toMillis(data.updatedAt ?? data.timestamp ?? data.createdAt),
          } satisfies NetworkLogRecord;
        })
        .filter((item): item is NetworkLogRecord => Boolean(item));

      setRecords(next);
    });

    return () => unsub();
  }, [enabled]);

  return useMemo(() => {
    const failedNodeIds = new Set(
      records.filter((record) => record.status === 'DOWN').map((record) => record.nodeId)
    );
    const latencyValues = records
      .map((record) => record.latencyMs)
      .filter((value): value is number => typeof value === 'number');
    const averageLatency = latencyValues.length
      ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
      : 0;
    const healthyCount = records.filter((record) => record.status !== 'DOWN').length;
    const uptimePercent = records.length
      ? Math.round((healthyCount / records.length) * 1000) / 10
      : 100;

    return {
      records,
      breakdownCount: failedNodeIds.size,
      failedNodeIds,
      averageLatency,
      uptimePercent,
    };
  }, [records]);
}

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, type Firestore } from 'firebase/firestore';
import type { IncidentRecord } from '@/types/topology';

export function useIncidentManager(db: Firestore | null) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!db) return;

    // Listen for current active incidents (broken: true)
    const q = query(
      collection(db, 'incident_reports'),
      where('broken', '==', true),
      orderBy('opened_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          summary: data.summary,
          locationId: data.location || 'Campus',
          latencyMs: data.latency_ms || 0,
          packetLoss: data.packet_loss_percent || 0,
          createdAt: data.opened_at?.toMillis?.() || Date.now(),
          resolvedAt: data.resolved_at?.toMillis?.() || null,
        } as IncidentRecord;
      });
      setIncidents(docs);
    });

    return () => unsubscribe();
  }, [db]);

  const dismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const activeIncident = useMemo(() => {
    // Return the most recent incident that hasn't been dismissed
    return incidents.find(i => !dismissedIds.has(i.id)) || null;
  }, [incidents, dismissedIds]);

  return {
    incidents,
    dismissedIds,
    dismiss,
    activeIncident
  };
}

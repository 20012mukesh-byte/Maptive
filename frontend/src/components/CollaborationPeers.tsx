import { useEffect, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { AppUser } from '@/context/AuthContext';
import { db, firebaseReady } from '@/lib/firebase';

const ROOM = 'default';

type Peer = { uid: string; x: number; y: number; name: string };

export function CollaborationPeers({ user }: { user: AppUser | null }) {
  const { flowToScreenPosition } = useReactFlow();
  useStore((s) => s.transform);
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    if (!firebaseReady || !db || !user || user.isMock) {
      setPeers([]);
      return;
    }
    const ref = collection(db, 'collaboration', ROOM, 'cursors');
    const unsub = onSnapshot(ref, (snap) => {
      const now = Date.now() / 1000;
      const list: Peer[] = [];
      snap.forEach((d) => {
        if (d.id === user.uid) return;
        const data = d.data() as {
          x?: number;
          y?: number;
          name?: string;
          updatedAt?: { seconds: number };
        };
        const ts = data.updatedAt?.seconds ?? 0;
        if (now - ts > 10) return;
        if (data.x == null || data.y == null) return;
        list.push({
          uid: d.id,
          x: data.x,
          y: data.y,
          name: data.name || 'Peer',
        });
      });
      setPeers(list);
    });
    return () => unsub();
  }, [user?.uid, user?.isMock]);

  if (!user || user.isMock || !firebaseReady) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {peers.map((c) => {
        const screen = flowToScreenPosition({ x: c.x, y: c.y });
        return (
          <div
            key={c.uid}
            className="absolute flex flex-col items-center"
            style={{
              left: screen.x,
              top: screen.y,
              transform: 'translate(-4px, -4px)',
            }}
          >
            <div className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)] ring-2 ring-violet-200/50" />
            <span className="mt-1 max-w-[120px] truncate rounded bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-medium text-violet-100 ring-1 ring-violet-500/40">
              {c.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

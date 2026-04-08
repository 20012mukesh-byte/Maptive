import { useCallback, useRef } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppUser } from '@/context/AuthContext';
import { db, firebaseReady } from '@/lib/firebase';

const ROOM = 'default';

export function useCollaborationWrite(
  user: AppUser | null,
  getRf: () => Pick<ReactFlowInstance, 'screenToFlowPosition'> | null
) {
  const last = useRef(0);
  const throttleMs = 120;

  return useCallback(
    (e: React.MouseEvent) => {
      if (!firebaseReady || !db || !user || user.isMock) return;
      const rf = getRf();
      if (!rf) return;
      const now = Date.now();
      if (now - last.current < throttleMs) return;
      last.current = now;
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      void setDoc(
        doc(db, 'collaboration', ROOM, 'cursors', user.uid),
        {
          x: p.x,
          y: p.y,
          name: user.displayName || user.email || 'User',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [getRf, user]
  );
}

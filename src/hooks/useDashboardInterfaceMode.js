import { useCallback, useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'nemoc-dashboard-interface-mode';
const VALID_MODES = new Set(['classic', 'command']);

function normalizeMode(value) {
  return VALID_MODES.has(value) ? value : null;
}

function readStoredMode() {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeMode(window.localStorage.getItem(STORAGE_KEY));
  } catch (_err) {
    return null;
  }
}

export default function useDashboardInterfaceMode(user) {
  const [localMode, setLocalMode] = useState(readStoredMode);
  const userUid = user?.uid;
  const profileMode = normalizeMode(user?.dashboardInterfaceMode);
  const interfaceMode = localMode || profileMode || 'classic';

  const setInterfaceMode = useCallback(async (nextMode) => {
    const normalizedMode = normalizeMode(nextMode) || 'classic';
    setLocalMode(normalizedMode);

    try {
      window.localStorage.setItem(STORAGE_KEY, normalizedMode);
    } catch (_err) {
      // Local persistence is a convenience only; Firestore remains the source for signed-in users.
    }

    if (!userUid) return;

    try {
      await setDoc(doc(db, 'users', userUid), {
        dashboardInterfaceMode: normalizedMode,
        dashboardInterfaceModeUpdatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Could not save dashboard interface preference:', err.message);
    }
  }, [userUid]);

  return useMemo(() => ({
    interfaceMode,
    setInterfaceMode,
  }), [interfaceMode, setInterfaceMode]);
}

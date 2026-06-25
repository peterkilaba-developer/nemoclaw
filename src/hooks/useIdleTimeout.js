import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keypress', 'keydown', 'scroll', 'touchstart', 'click'];

/**
 * Detects user idle state and fires callbacks.
 *
 * @param {object} options
 * @param {() => void} options.onIdle      - Called when user is idle for `timeoutMs`
 * @param {() => void} options.onWarn      - Called `warnBeforeMs` before timeout (show warning UI)
 * @param {() => void} [options.onActive]  - Called when user activity resumes after idle warning
 * @param {number} [options.timeoutMs]     - Total idle time before logout (default: 30 min)
 * @param {number} [options.warnBeforeMs]  - Warn this many ms before timeout (default: 5 min)
 * @param {boolean} [options.enabled]      - Set false to disable (e.g. on public pages)
 */
export function useIdleTimeout({
  onIdle,
  onWarn,
  onActive,
  timeoutMs = 30 * 60 * 1000,
  warnBeforeMs = 5 * 60 * 1000,
  enabled = true,
}) {
  const idleTimerRef = useRef(null);
  const warnTimerRef = useRef(null);
  const isWarningRef = useRef(false);

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    if (isWarningRef.current) {
      isWarningRef.current = false;
      onActive?.();
    }
    warnTimerRef.current = setTimeout(() => {
      isWarningRef.current = true;
      onWarn();
    }, timeoutMs - warnBeforeMs);
    idleTimerRef.current = setTimeout(() => {
      onIdle();
    }, timeoutMs);
  }, [clearTimers, onActive, onIdle, onWarn, timeoutMs, warnBeforeMs]);

  useEffect(() => {
    if (!enabled) return;
    IDLE_EVENTS.forEach(ev => window.addEventListener(ev, resetTimers, { passive: true }));
    resetTimers();
    return () => {
      IDLE_EVENTS.forEach(ev => window.removeEventListener(ev, resetTimers));
      clearTimers();
    };
  }, [enabled, resetTimers, clearTimers]);
}

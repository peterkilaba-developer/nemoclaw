import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'nemoc-theme-preference';
const VALID_THEMES = new Set(['light', 'dark', 'system']);

function normalizeTheme(value) {
  return VALID_THEMES.has(value) ? value : null;
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function readStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch (_err) {
    return null;
  }
}

function resolveTheme(theme) {
  return theme === 'system' ? getSystemTheme() : (normalizeTheme(theme) || 'dark');
}

function applyDocumentTheme(theme) {
  if (typeof document === 'undefined') return;
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = normalizeTheme(theme) || 'system';
  document.documentElement.style.colorScheme = resolvedTheme;
}

applyDocumentTheme(readStoredTheme() || 'system');

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [localTheme, setLocalTheme] = useState(readStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const userUid = user?.uid;
  const profileTheme = normalizeTheme(user?.themePreference || user?.dashboardTheme);
  const theme = localTheme || profileTheme || 'system';
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme, systemTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => setSystemTheme(getSystemTheme());
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const setTheme = useCallback(async (nextTheme) => {
    const normalizedTheme = normalizeTheme(nextTheme) || 'system';
    setLocalTheme(normalizedTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, normalizedTheme);
    } catch (_err) {
      // Local persistence is best effort; signed-in users also get profile persistence.
    }

    if (!userUid) return;

    try {
      await setDoc(doc(db, 'users', userUid), {
        themePreference: normalizedTheme,
        dashboardTheme: normalizedTheme,
        themePreferenceUpdatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Could not save theme preference:', err.message);
    }
  }, [userUid]);

  const cycleTheme = useCallback(() => {
    const order = ['system', 'light', 'dark'];
    const currentIndex = order.indexOf(theme);
    setTheme(order[(currentIndex + 1) % order.length]);
  }, [setTheme, theme]);

  const value = useMemo(() => ({
    cycleTheme,
    resolvedTheme,
    setTheme,
    systemTheme,
    theme,
  }), [cycleTheme, resolvedTheme, setTheme, systemTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

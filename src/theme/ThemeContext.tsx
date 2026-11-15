import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  getStoredThemeMode,
  setStoredThemeMode,
} from '../services/storage/securePrefs';
import { ThemeMode } from '../types/scanner';
import { AppPalette, darkPalette, lightPalette } from './colors';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedScheme: 'light' | 'dark';
  colors: AppPalette;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getStoredThemeMode().then((saved) => {
      if (saved) setModeState(saved);
    });
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    setStoredThemeMode(nextMode);
  };

  const resolvedScheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = resolvedScheme === 'dark' ? darkPalette : lightPalette;
    const toggleTheme = () => {
      setMode(resolvedScheme === 'dark' ? 'light' : 'dark');
    };
    return {
      mode,
      resolvedScheme,
      colors,
      setMode,
      toggleTheme,
    };
  }, [mode, resolvedScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { colorScheme as nwColorScheme } from 'nativewind';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, ThemeColors, ColorSchemeName, spacing, radius, typography } from './tokens';

type ThemePref = 'light' | 'dark' | 'system';

interface ThemeStore {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

// Persisted user preference (light / dark / follow-system).
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      pref: 'light', // Light is the primary experience; dark remains available.
      setPref: (pref) => set({ pref }),
    }),
    { name: 'ims-theme', storage: createJSONStorage(() => AsyncStorage) }
  )
);

interface ThemeContextValue {
  scheme: ColorSchemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useRNColorScheme();
  const { pref, setPref } = useThemeStore();

  const scheme: ColorSchemeName = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;

  // Keep NativeWind's className-driven dark: variants in sync with our resolved scheme.
  useEffect(() => {
    nwColorScheme.set(pref);
  }, [pref]);

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, colors: getColors(scheme), spacing, radius, typography, pref, setPref }),
    [scheme, pref, setPref]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

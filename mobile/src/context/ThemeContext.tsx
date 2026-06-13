import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export const DARK_COLORS = {
  bg: '#0B0F12',
  panel: '#141A20',
  panelHi: '#1B232B',
  line: '#26313B',
  ink: '#E8EEF2',
  inkDim: '#8A99A6',
  inkFaint: '#54626D',
  verify: '#3DDC97',
  verifyDim: '#1F7A57',
  caution: '#F2B441',
  hardstop: '#FF5C5C',
  scan: '#5BAEF0',
} as const;

export const LIGHT_COLORS = {
  bg: '#F0F3F5',
  panel: '#FFFFFF',
  panelHi: '#E8EDF0',
  line: '#D0D8DF',
  ink: '#0D1A24',
  inkDim: '#485863',
  inkFaint: '#8A99A6',
  verify: '#3DDC97',
  verifyDim: '#1F7A57',
  caution: '#F2B441',
  hardstop: '#FF5C5C',
  scan: '#5BAEF0',
} as const;

export type ColorPalette = { [K in keyof typeof DARK_COLORS]: string };

const THEME_STORAGE_KEY = 'facilityops:theme';

interface ThemeContextValue {
  colors: ColorPalette;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(val => { if (val === 'light') setIsDark(false); })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ colors: (isDark ? DARK_COLORS : LIGHT_COLORS) as ColorPalette, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

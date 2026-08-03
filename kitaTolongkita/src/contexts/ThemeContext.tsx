import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from '../theme/tokens';
import { darkColors } from '../theme/darkTokens';

const THEME_KEY = '@kita_theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  colors: Record<string, string>;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'dark') setIsDark(true);
      } catch { /* ignore */ }
    })();
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    } catch { /* ignore */ }
  };

  const setTheme = async (mode: ThemeMode) => {
    setIsDark(mode === 'dark');
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch { /* ignore */ }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors: isDark ? darkColors : lightColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

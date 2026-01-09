'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DashboardAppearanceSettings } from '@/api/generated/interfaces';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: 'light' | 'dark';
  appearance: DashboardAppearanceSettings | null;
  setAppearance: (appearance: DashboardAppearanceSettings | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_APPEARANCE: DashboardAppearanceSettings = {
  primary_color: '240 5.9% 10%',
  primary_color_dark: '0 0% 98%',
  secondary_color: '239 49% 32%',
  accent_color: '240 4.8% 95.9%',
  sidebar_background: '0 0% 100%',
  sidebar_primary: '240 5.9% 10%',
  border_radius: '0.5rem',
  sidebar_order: [],
  updated_at: new Date().toISOString(),
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');
  const [appearance, setAppearanceState] = useState<DashboardAppearanceSettings | null>(null);

  // Initialize mode from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('theme-mode') as ThemeMode;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setModeState(stored);
    }
  }, []);

  // Resolve system preference
  useEffect(() => {
    const updateResolvedMode = () => {
      if (mode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedMode(prefersDark ? 'dark' : 'light');
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolvedMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateResolvedMode);

    return () => mediaQuery.removeEventListener('change', updateResolvedMode);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
  }, []);

  const setAppearance = useCallback((newAppearance: DashboardAppearanceSettings | null) => {
    setAppearanceState(newAppearance);
  }, []);

  // Get tenant theme or use defaults
  const currentAppearance = appearance || DEFAULT_APPEARANCE;

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedMode === 'dark';

    // Toggle dark class for Tailwind
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply CSS variables with defaults for optional fields
    const primaryColor = currentAppearance.primary_color || '240 5.9% 10%';
    const primaryColorDark = currentAppearance.primary_color_dark || '0 0% 98%';
    const secondaryColor = currentAppearance.secondary_color || '239 49% 32%';
    const accentColor = currentAppearance.accent_color || '240 4.8% 95.9%';
    const sidebarBackground = currentAppearance.sidebar_background || '0 0% 100%';
    const sidebarPrimary = currentAppearance.sidebar_primary || '240 5.9% 10%';
    const borderRadius = currentAppearance.border_radius || '0.5rem';

    // Primary
    root.style.setProperty('--primary', isDark ? primaryColorDark : primaryColor);
    root.style.setProperty('--primary-foreground', isDark ? primaryColor : primaryColorDark);

    // Secondary
    root.style.setProperty('--secondary', secondaryColor);
    root.style.setProperty('--secondary-foreground', '0 0% 98%');

    // Accent
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-foreground', isDark ? '0 0% 98%' : '240 5.9% 10%');

    // Radius
    root.style.setProperty('--radius', borderRadius);

    // Sidebar
    root.style.setProperty('--sidebar-background', isDark ? '240 10% 3.9%' : sidebarBackground);
    root.style.setProperty('--sidebar-foreground', isDark ? '0 0% 98%' : '240 10% 3.9%');
    root.style.setProperty('--sidebar-primary', isDark ? primaryColorDark : sidebarPrimary);
    root.style.setProperty('--sidebar-accent', isDark ? '240 5% 26%' : accentColor);

  }, [currentAppearance, resolvedMode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedMode, appearance, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

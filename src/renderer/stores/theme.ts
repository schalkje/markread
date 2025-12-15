/**
 * Zustand Store: Theme
 * Task: T118
 * Manages theme application and system theme detection
 */

import { create } from 'zustand';
import type { Theme } from '@shared/types/entities';
import { ThemeType } from '@shared/types/entities';

interface ThemeState {
  // Available themes
  themes: Map<string, Theme>;

  // Currently active theme
  activeThemeId: string;
  currentTheme: Theme | null;

  // System theme preference (light/dark)
  systemTheme: ThemeType;

  // Whether to follow system theme
  followSystemTheme: boolean;

  // Actions
  initializeTheme: () => void;
  applyTheme: (themeType: ThemeType) => void;
  detectSystemTheme: () => void;
  setActiveTheme: (themeId: string) => void;
  getActiveTheme: () => Theme | undefined;
  registerTheme: (theme: Theme) => void;
  setFollowSystemTheme: (follow: boolean) => void;
  getAllThemes: () => Theme[];
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themes: new Map(),
  activeThemeId: 'system-light',
  currentTheme: null,
  systemTheme: ThemeType.Light,
  followSystemTheme: true,

  detectSystemTheme: () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    set({ systemTheme: isDark ? ThemeType.Dark : ThemeType.Light });
  },

  initializeTheme: () => {
    const { detectSystemTheme, applyTheme } = get();
    detectSystemTheme();

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      set({ systemTheme: e.matches ? ThemeType.Dark : ThemeType.Light });
    });

    applyTheme(ThemeType.Light); // Default theme
  },

  applyTheme: (themeType) => {
    // Theme application - will apply CSS custom properties
    console.log('Applying theme:', themeType);
  },

  setActiveTheme: (themeId) => {
    const { themes } = get();
    const theme = themes.get(themeId);
    if (theme) {
      set({ activeThemeId: themeId, currentTheme: theme });
    }
  },

  getActiveTheme: () => {
    const { themes, activeThemeId, followSystemTheme, systemTheme } = get();

    // If following system theme, use system-light or system-dark
    if (followSystemTheme) {
      const systemThemeId = systemTheme === ThemeType.Dark ? 'system-dark' : 'system-light';
      return themes.get(systemThemeId);
    }

    return themes.get(activeThemeId);
  },

  registerTheme: (theme) => {
    set((state) => {
      const newThemes = new Map(state.themes);
      newThemes.set(theme.id, theme);
      return { themes: newThemes };
    });
  },

  setFollowSystemTheme: (follow) => {
    set({ followSystemTheme: follow });
  },

  getAllThemes: () => {
    const { themes } = get();
    return Array.from(themes.values());
  },
}));

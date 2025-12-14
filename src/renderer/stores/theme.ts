/**
 * Pinia Store: Theme
 * Manages theme application and system theme detection
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Theme, ThemeType, ColorMappings } from '@shared/types/entities';
import { useSettingsStore } from './settings';

export const useThemeStore = defineStore('theme', () => {
  const settingsStore = useSettingsStore();

  // State
  const currentTheme = ref<Theme | null>(null);
  const systemTheme = ref<ThemeType>('light');
  const availableThemes = ref<Theme[]>([]);

  // Getters
  const activeThemeType = computed((): ThemeType => {
    const themeSetting = settingsStore.settings.appearance.theme;

    if (themeSetting === 'system') {
      return systemTheme.value;
    } else if (themeSetting === 'dark' || themeSetting === 'light') {
      return themeSetting;
    } else if (themeSetting === 'high-contrast') {
      return 'high-contrast';
    }

    return 'light';
  });

  const effectiveTheme = computed(() => {
    if (currentTheme.value) {
      return currentTheme.value;
    }

    // Return a default theme based on active theme type
    return getDefaultTheme(activeThemeType.value);
  });

  // Actions
  const detectSystemTheme = () => {
    // Detect system theme using media query
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    systemTheme.value = isDark ? 'dark' : 'light';
  };

  const initializeTheme = () => {
    detectSystemTheme();

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      systemTheme.value = e.matches ? 'dark' : 'light';
    });

    // Load initial theme
    applyTheme(activeThemeType.value);
  };

  const applyTheme = (themeType: ThemeType) => {
    const theme = getDefaultTheme(themeType);
    currentTheme.value = theme;

    // Apply CSS custom properties to :root
    applyColorMappings(theme.colorMappings);

    // Update syntax highlight theme
    applySyntaxHighlightTheme(theme.syntaxHighlightTheme);

    // Update Mermaid theme
    applyMermaidTheme(theme.mermaidTheme);
  };

  const applyColorMappings = (colorMappings: ColorMappings) => {
    const root = document.documentElement;

    // Apply all color mappings as CSS variables
    root.style.setProperty('--color-background', colorMappings.background);
    root.style.setProperty('--color-foreground', colorMappings.foreground);
    root.style.setProperty('--color-accent', colorMappings.accent);

    root.style.setProperty('--color-sidebar-bg', colorMappings.sidebarBackground);
    root.style.setProperty('--color-sidebar-fg', colorMappings.sidebarForeground);
    root.style.setProperty('--color-sidebar-border', colorMappings.sidebarBorder);

    root.style.setProperty('--color-tab-bg', colorMappings.tabBackground);
    root.style.setProperty('--color-tab-active-bg', colorMappings.tabActiveBackground);
    root.style.setProperty('--color-tab-fg', colorMappings.tabForeground);
    root.style.setProperty('--color-tab-border', colorMappings.tabBorder);

    root.style.setProperty('--color-content-bg', colorMappings.contentBackground);
    root.style.setProperty('--color-content-fg', colorMappings.contentForeground);

    root.style.setProperty('--color-markdown-heading', colorMappings.markdownHeading);
    root.style.setProperty('--color-markdown-link', colorMappings.markdownLink);
    root.style.setProperty('--color-markdown-code-bg', colorMappings.markdownCodeBackground);
    root.style.setProperty('--color-markdown-blockquote-bg', colorMappings.markdownBlockquoteBackground);
  };

  const applySyntaxHighlightTheme = (themeName: string) => {
    // Load Highlight.js theme dynamically
    // This will be implemented in Phase 3 (User Story 1)
    console.log('Apply syntax highlight theme:', themeName);
  };

  const applyMermaidTheme = (themeName: string) => {
    // Configure Mermaid theme
    // This will be implemented in Phase 3 (User Story 1)
    console.log('Apply Mermaid theme:', themeName);
  };

  const getDefaultTheme = (themeType: ThemeType): Theme => {
    // Built-in theme definitions
    const lightTheme: Theme = {
      id: 'system-light',
      name: 'Light',
      type: 'light',
      colorMappings: {
        background: '#ffffff',
        foreground: '#000000',
        accent: '#0066cc',
        sidebarBackground: '#f5f5f5',
        sidebarForeground: '#000000',
        sidebarBorder: '#dddddd',
        tabBackground: '#e0e0e0',
        tabActiveBackground: '#ffffff',
        tabForeground: '#000000',
        tabBorder: '#dddddd',
        contentBackground: '#ffffff',
        contentForeground: '#000000',
        markdownHeading: '#1a1a1a',
        markdownLink: '#0066cc',
        markdownCodeBackground: '#f5f5f5',
        markdownBlockquoteBackground: '#f9f9f9',
      },
      syntaxHighlightTheme: 'github',
      mermaidTheme: 'default',
    };

    const darkTheme: Theme = {
      id: 'system-dark',
      name: 'Dark',
      type: 'dark',
      colorMappings: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        accent: '#0078d4',
        sidebarBackground: '#252526',
        sidebarForeground: '#cccccc',
        sidebarBorder: '#3e3e42',
        tabBackground: '#2d2d30',
        tabActiveBackground: '#1e1e1e',
        tabForeground: '#ffffff',
        tabBorder: '#3e3e42',
        contentBackground: '#1e1e1e',
        contentForeground: '#d4d4d4',
        markdownHeading: '#ffffff',
        markdownLink: '#4fc3f7',
        markdownCodeBackground: '#2d2d30',
        markdownBlockquoteBackground: '#252526',
      },
      syntaxHighlightTheme: 'github-dark',
      mermaidTheme: 'dark',
    };

    const highContrastTheme: Theme = {
      id: 'high-contrast-light',
      name: 'High Contrast',
      type: 'high-contrast',
      colorMappings: {
        background: '#ffffff',
        foreground: '#000000',
        accent: '#0000ff',
        sidebarBackground: '#ffffff',
        sidebarForeground: '#000000',
        sidebarBorder: '#000000',
        tabBackground: '#ffffff',
        tabActiveBackground: '#ffffff',
        tabForeground: '#000000',
        tabBorder: '#000000',
        contentBackground: '#ffffff',
        contentForeground: '#000000',
        markdownHeading: '#000000',
        markdownLink: '#0000ff',
        markdownCodeBackground: '#f0f0f0',
        markdownBlockquoteBackground: '#f0f0f0',
      },
      syntaxHighlightTheme: 'a11y-light',
      mermaidTheme: 'default',
    };

    switch (themeType) {
      case 'dark':
        return darkTheme;
      case 'high-contrast':
        return highContrastTheme;
      case 'light':
      default:
        return lightTheme;
    }
  };

  // Watch for theme setting changes
  watch(
    () => settingsStore.settings.appearance.theme,
    () => {
      applyTheme(activeThemeType.value);
    }
  );

  // Watch for system theme changes (if following system theme)
  watch(systemTheme, () => {
    if (settingsStore.settings.appearance.followSystemTheme) {
      applyTheme(activeThemeType.value);
    }
  });

  return {
    // State
    currentTheme,
    systemTheme,
    availableThemes,

    // Getters
    activeThemeType,
    effectiveTheme,

    // Actions
    initializeTheme,
    applyTheme,
    detectSystemTheme,
  };
});

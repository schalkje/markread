/**
 * Theme Manager Service
 * Tasks: T119, T120, T123, T124
 *
 * Manages theme loading and application with:
 * - Theme loading from JSON files
 * - CSS custom property application (<200ms target)
 * - System theme detection
 * - Mermaid theme synchronization
 */

import type { Theme } from '@shared/types/entities.d.ts';
import { useThemeStore } from '../stores/theme';
import { loadSyntaxTheme } from './syntax-theme-loader';

// Import theme JSON files (in a real implementation, these would be dynamic imports)
import systemLightTheme from '../../assets/themes/system-light.json';
import systemDarkTheme from '../../assets/themes/system-dark.json';
import highContrastLightTheme from '../../assets/themes/high-contrast-light.json';
import highContrastDarkTheme from '../../assets/themes/high-contrast-dark.json';

class ThemeManager {
  private appliedThemeId: string | null = null;

  /**
   * T119: Load all built-in themes
   */
  async loadThemes(): Promise<void> {
    const themes = [
      systemLightTheme as Theme,
      systemDarkTheme as Theme,
      highContrastLightTheme as Theme,
      highContrastDarkTheme as Theme,
    ];

    const themeStore = useThemeStore.getState();

    themes.forEach(theme => {
      themeStore.registerTheme(theme);
    });

    console.log(`Loaded ${themes.length} themes`);
  }

  /**
   * T120: Apply theme to UI via CSS custom properties
   * Target: <200ms application time (FR-032)
   */
  applyTheme(theme: Theme): void {
    const startTime = performance.now();

    // Apply color mappings as CSS custom properties
    const root = document.documentElement;
    const { colorMappings } = theme;

    // Set CSS variables - standard naming
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

    root.style.setProperty('--color-md-heading', colorMappings.markdownHeading);
    root.style.setProperty('--color-md-link', colorMappings.markdownLink);
    root.style.setProperty('--color-md-code-bg', colorMappings.markdownCodeBackground);
    root.style.setProperty('--color-md-blockquote-bg', colorMappings.markdownBlockquoteBackground);

    // Additional variables for MarkdownViewer and other components
    root.style.setProperty('--color-bg-primary', colorMappings.contentBackground);
    root.style.setProperty('--color-text-primary', colorMappings.contentForeground);
    root.style.setProperty('--color-bg-secondary', colorMappings.tabBackground);
    root.style.setProperty('--color-text-secondary', colorMappings.tabForeground);
    root.style.setProperty('--color-border-default', colorMappings.sidebarBorder);
    root.style.setProperty('--color-link', colorMappings.markdownLink);
    root.style.setProperty('--color-code-bg', colorMappings.markdownCodeBackground);
    root.style.setProperty('--color-table-header-bg', colorMappings.tabBackground);
    root.style.setProperty('--color-table-row-bg', colorMappings.tabBackground);

    // Scrollbar colors (lighter for light theme, darker for dark theme)
    const isDark = theme.type === 'dark';
    root.style.setProperty('--color-scrollbar', isDark ? '#484f58' : '#d0d7de');
    root.style.setProperty('--color-scrollbar-hover', isDark ? '#6e7681' : '#afb8c1');

    // Overlay colors (inverted from main theme)
    root.style.setProperty('--color-bg-overlay', isDark ? 'rgba(240, 246, 252, 0.95)' : 'rgba(36, 41, 47, 0.95)');
    root.style.setProperty('--color-text-on-overlay', isDark ? '#24292f' : '#ffffff');

    // Component-specific variables to override media queries

    // Title bar
    root.style.setProperty('--titlebar-background', colorMappings.tabBackground);
    root.style.setProperty('--titlebar-foreground', colorMappings.tabForeground);
    root.style.setProperty('--titlebar-border', colorMappings.sidebarBorder);
    root.style.setProperty('--titlebar-button-hover', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)');
    root.style.setProperty('--titlebar-button-active', isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--menu-background', colorMappings.tabBackground);
    root.style.setProperty('--menu-border', colorMappings.sidebarBorder);
    root.style.setProperty('--menu-item-hover', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)');
    root.style.setProperty('--menu-separator', colorMappings.sidebarBorder);

    // Tab bar
    root.style.setProperty('--tab-bar-bg', colorMappings.tabBackground);
    root.style.setProperty('--tab-bg', isDark ? '#2d2d2d' : '#e6e6e6');
    root.style.setProperty('--tab-hover-bg', isDark ? '#3d3d3d' : '#ddd');
    root.style.setProperty('--tab-active-bg', colorMappings.tabActiveBackground);
    root.style.setProperty('--button-hover-bg', isDark ? '#4d4d4d' : '#ccc');
    root.style.setProperty('--shortcut-bg', colorMappings.tabBackground);
    root.style.setProperty('--warning-color', isDark ? '#d29922' : '#9a6700');
    root.style.setProperty('--warning-bg', isDark ? '#4d3800' : '#fff8c5');
    root.style.setProperty('--folder-color', '#999');

    // File tree
    root.style.setProperty('--tree-bg', colorMappings.sidebarBackground);
    root.style.setProperty('--item-hover-bg', isDark ? '#161b22' : '#f6f8fa');
    root.style.setProperty('--item-selected-bg', isDark ? '#1f6feb' : '#ddf4ff');
    root.style.setProperty('--notice-bg', colorMappings.tabBackground);
    root.style.setProperty('--overlay-bg', isDark ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)');
    root.style.setProperty('--files-list-bg', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)');
    root.style.setProperty('--file-item-bg', isDark ? '#161b22' : '#ffffff');
    root.style.setProperty('--file-item-hover-bg', isDark ? '#21262d' : '#f6f8fa');
    root.style.setProperty('--file-item-active-bg', isDark ? '#1f6feb' : '#ddf4ff');
    root.style.setProperty('--accent-color-hover', isDark ? '#388bfd' : '#0860ca');
    root.style.setProperty('--accent-color-active', isDark ? '#1a69db' : '#0757ba');

    // Folder switcher
    root.style.setProperty('--switcher-bg', colorMappings.tabBackground);
    root.style.setProperty('--switcher-hover-bg', isDark ? '#21262d' : '#e6e6e6');
    root.style.setProperty('--switcher-active-bg', isDark ? '#1f6feb' : '#ddf4ff');
    root.style.setProperty('--dropdown-bg', isDark ? '#161b22' : '#ffffff');
    root.style.setProperty('--border-color', colorMappings.sidebarBorder);
    root.style.setProperty('--border-light', isDark ? '#21262d' : '#eaeef2');
    root.style.setProperty('--border-hover-color', isDark ? '#484f58' : '#afb8c1');
    root.style.setProperty('--close-hover-bg', isDark ? '#5a1e1e' : '#ffebe9');
    root.style.setProperty('--danger-color', isDark ? '#ff7b72' : '#d1242f');
    root.style.setProperty('--scrollbar-thumb', isDark ? '#484f58' : '#d0d7de');
    root.style.setProperty('--scrollbar-thumb-hover', isDark ? '#6e7681' : '#afb8c1');

    // Common text colors
    root.style.setProperty('--text-primary', colorMappings.contentForeground);
    root.style.setProperty('--text-secondary', isDark ? '#7d8590' : '#57606a');
    root.style.setProperty('--text-tertiary', isDark ? '#484f58' : '#8c959f');
    root.style.setProperty('--accent-color', colorMappings.accent);

    // Set data attribute for theme type (for CSS selectors)
    root.setAttribute('data-theme', theme.type);
    root.setAttribute('data-theme-id', theme.id);

    // Update Mermaid theme if diagram exists
    this.updateMermaidTheme(theme.mermaidTheme);

    // Update syntax highlighting theme
    this.updateSyntaxHighlightTheme(theme.syntaxHighlightTheme);

    this.appliedThemeId = theme.id;

    const endTime = performance.now();
    const applyTime = endTime - startTime;

    console.log(`Theme "${theme.name}" applied in ${applyTime.toFixed(2)}ms`);

    // Log warning if exceeds 200ms target
    if (applyTime > 200) {
      console.warn(`Theme application took ${applyTime.toFixed(2)}ms, exceeds 200ms target (FR-032)`);
    }
  }

  /**
   * T124: Update Mermaid theme when app theme changes
   */
  private updateMermaidTheme(mermaidTheme: string): void {
    // Set global mermaid configuration
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      try {
        (window as any).mermaid.initialize({
          theme: mermaidTheme,
          startOnLoad: false,
        });
      } catch (error) {
        console.warn('Failed to update Mermaid theme:', error);
      }
    }
  }

  /**
   * T125-T126: Update syntax highlighting theme
   * Dynamically loads bundled theme CSS (CSP-compliant)
   */
  private updateSyntaxHighlightTheme(highlightTheme: string): void {
    // Load the theme CSS from bundled assets
    loadSyntaxTheme(highlightTheme);
  }

  /**
   * T123: Detect and apply system theme automatically
   */
  detectSystemTheme(): void {
    const themeStore = useThemeStore.getState();
    themeStore.detectSystemTheme();

    // Apply the appropriate system theme
    const activeTheme = themeStore.getActiveTheme();
    if (activeTheme) {
      this.applyTheme(activeTheme);
    }
  }

  /**
   * Initialize theme manager
   */
  async initialize(): Promise<void> {
    // Load themes
    await this.loadThemes();

    // Detect system theme
    this.detectSystemTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      this.detectSystemTheme();
    });
  }

  /**
   * Switch to a specific theme by ID
   */
  switchTheme(themeId: string): void {
    const themeStore = useThemeStore.getState();
    const theme = themeStore.themes.get(themeId);

    if (theme) {
      themeStore.setActiveTheme(themeId);
      this.applyTheme(theme);
    } else {
      console.error(`Theme not found: ${themeId}`);
    }
  }

  /**
   * Get currently applied theme ID
   */
  getAppliedThemeId(): string | null {
    return this.appliedThemeId;
  }
}

// Singleton instance
export const themeManager = new ThemeManager();

export default themeManager;

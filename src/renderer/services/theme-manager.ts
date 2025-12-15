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

import type { Theme } from '@shared/types/entities';
import { useThemeStore } from '../stores/theme';

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

    // Set CSS variables
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
   */
  private updateSyntaxHighlightTheme(highlightTheme: string): void {
    // Remove existing highlight.js theme link
    const existingLink = document.getElementById('highlightjs-theme');
    if (existingLink) {
      existingLink.remove();
    }

    // Add new theme link
    const link = document.createElement('link');
    link.id = 'highlightjs-theme';
    link.rel = 'stylesheet';
    link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/${highlightTheme}.min.css`;
    document.head.appendChild(link);
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

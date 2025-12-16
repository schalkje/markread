import React, { useEffect } from 'react';
import { Router } from './router';
import { useThemeStore } from './stores/theme';
import { ThemeType } from '@shared/types/entities.d.ts';

// T013: React root component with Router
// T159: Initialize themes on app startup
const App: React.FC = () => {
  const { registerTheme, initializeTheme } = useThemeStore();

  useEffect(() => {
    // Register default themes
    registerTheme({
      id: 'system-light',
      name: 'Light',
      type: ThemeType.Light,
      colorMappings: {
        background: '#ffffff',
        foreground: '#24292e',
        accent: '#0366d6',
        sidebarBackground: '#f6f8fa',
        sidebarForeground: '#24292e',
        sidebarBorder: '#e1e4e8',
        tabBackground: '#f6f8fa',
        tabActiveBackground: '#ffffff',
        tabForeground: '#24292e',
        tabBorder: '#e1e4e8',
        contentBackground: '#ffffff',
        contentForeground: '#24292e',
        markdownHeading: '#24292e',
        markdownLink: '#0366d6',
        markdownCodeBackground: '#f6f8fa',
        markdownBlockquoteBackground: '#f6f8fa',
      },
      syntaxHighlightTheme: 'github',
      mermaidTheme: 'default',
    });

    registerTheme({
      id: 'system-dark',
      name: 'Dark',
      type: ThemeType.Dark,
      colorMappings: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        accent: '#58a6ff',
        sidebarBackground: '#161b22',
        sidebarForeground: '#c9d1d9',
        sidebarBorder: '#30363d',
        tabBackground: '#161b22',
        tabActiveBackground: '#0d1117',
        tabForeground: '#c9d1d9',
        tabBorder: '#30363d',
        contentBackground: '#0d1117',
        contentForeground: '#c9d1d9',
        markdownHeading: '#c9d1d9',
        markdownLink: '#58a6ff',
        markdownCodeBackground: '#161b22',
        markdownBlockquoteBackground: '#161b22',
      },
      syntaxHighlightTheme: 'github-dark',
      mermaidTheme: 'dark',
    });

    // Initialize theme system
    initializeTheme();
  }, [registerTheme, initializeTheme]);

  return <Router />;
};

export default App;

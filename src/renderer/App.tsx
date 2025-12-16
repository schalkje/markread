import React, { useEffect } from 'react';
import { Router } from './router';
import { useThemeStore } from './stores/theme';
import type { ThemeType } from '@shared/types/entities.d.ts';

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
      colorMappings: {},
      syntaxHighlightTheme: 'github',
      mermaidTheme: 'default',
    });

    registerTheme({
      id: 'system-dark',
      name: 'Dark',
      type: ThemeType.Dark,
      colorMappings: {},
      syntaxHighlightTheme: 'github-dark',
      mermaidTheme: 'dark',
    });

    // Initialize theme system
    initializeTheme();
  }, [registerTheme, initializeTheme]);

  return <Router />;
};

export default App;

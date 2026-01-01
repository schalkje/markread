import React, { useEffect } from 'react';
import { Router } from './router';
import { themeManager } from './services/theme-manager';

// T013: React root component with Router
// T159: Initialize themes on app startup
const App: React.FC = () => {
  useEffect(() => {
    // Initialize theme system (loads themes, detects system theme, and applies it)
    themeManager.initialize();
  }, []);

  return <Router />;
};

export default App;

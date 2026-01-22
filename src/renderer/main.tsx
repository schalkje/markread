import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';
import './styles/hljs/github.css'; // Default syntax highlighting theme
import 'highlightjs-copy/dist/highlightjs-copy.min.css';
import { useTabsStore } from './stores/tabs';

// T019: Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Expose tabs store for e2e testing
if (typeof window !== 'undefined') {
  (window as any).__TEST_TABS_STORE__ = useTabsStore;
}

// Render React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

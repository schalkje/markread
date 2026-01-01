/**
 * Syntax Theme Loader
 * Handles dynamic loading of syntax highlighting themes
 */

// Import both themes - Vite will bundle these
import githubLightCSS from '../styles/hljs/github.css?inline';
import githubDarkCSS from '../styles/hljs/github-dark.css?inline';

const themes: Record<string, string> = {
  'github': githubLightCSS,
  'github-dark': githubDarkCSS,
  'default': githubLightCSS,
};

let currentStyleElement: HTMLStyleElement | null = null;

/**
 * Load and apply a syntax highlighting theme
 */
export function loadSyntaxTheme(themeName: string): void {
  const themeCSS = themes[themeName] || themes['default'];

  // Remove previous theme
  if (currentStyleElement) {
    currentStyleElement.remove();
  }

  // Create and inject new theme
  currentStyleElement = document.createElement('style');
  currentStyleElement.id = 'syntax-highlight-theme';
  currentStyleElement.textContent = themeCSS;
  document.head.appendChild(currentStyleElement);
}

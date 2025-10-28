/**
 * Theme Bridge for WebView2 Integration
 * Enables seamless theme switching between WPF application and WebView2 content
 * without requiring page reload
 */

(function() {
    'use strict';

    /**
     * Theme Bridge Manager
     * Handles communication between WPF host and WebView2 content for theme changes
     */
    class ThemeBridge {
        constructor() {
            this.currentTheme = 'light';
            this.isInitialized = false;
            this.transitionDuration = 200;
            
            this.init();
        }

        /**
         * Initialize the theme bridge
         */
        init() {
            if (this.isInitialized) return;

            // Detect initial theme from system or document
            this.detectInitialTheme();
            
            // Set up message handling from WPF host
            this.setupMessageHandling();
            
            // Apply initial theme
            this.applyTheme(this.currentTheme, false);
            
            this.isInitialized = true;
            this.notifyReady();
        }

        /**
         * Detect initial theme from various sources
         */
        detectInitialTheme() {
            // Check for data attribute set by WPF host
            const documentTheme = document.documentElement.getAttribute('data-theme');
            if (documentTheme) {
                this.currentTheme = documentTheme;
                return;
            }

            // Check for system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.currentTheme = 'dark';
                return;
            }

            // Default to light theme
            this.currentTheme = 'light';
        }

        /**
         * Set up message handling for communication with WPF host
         */
        setupMessageHandling() {
            // Handle messages from WPF through chrome.webview
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.addEventListener('message', (event) => {
                    this.handleHostMessage(event.data);
                });
            }

            // Fallback: Handle messages through window.external (legacy)
            if (window.external && window.external.notify) {
                window.addEventListener('message', (event) => {
                    this.handleHostMessage(event.data);
                });
            }

            // Listen for system theme changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (this.currentTheme === 'system') {
                        this.applyTheme(e.matches ? 'dark' : 'light', true);
                    }
                });
            }
        }

        /**
         * Handle messages from WPF host
         * @param {Object} data - Message data from host
         */
        handleHostMessage(data) {
            if (!data || typeof data !== 'object') return;

            switch (data.type) {
                case 'theme-change':
                    this.applyTheme(data.theme, true);
                    break;
                case 'theme-config':
                    this.updateThemeConfig(data.config);
                    break;
                case 'animation-settings':
                    this.updateAnimationSettings(data.settings);
                    break;
                case 'query-theme':
                    this.sendThemeInfo();
                    break;
            }
        }

        /**
         * Apply theme to the document
         * @param {string} theme - Theme name ('light', 'dark', 'system')
         * @param {boolean} animate - Whether to animate the transition
         */
        applyTheme(theme, animate = false) {
            const effectiveTheme = this.resolveEffectiveTheme(theme);
            const previousTheme = this.currentTheme;

            if (animate && previousTheme !== effectiveTheme) {
                this.animateThemeTransition(effectiveTheme);
            } else {
                this.setThemeImmediate(effectiveTheme);
            }

            this.currentTheme = theme;
            this.notifyThemeChanged(previousTheme, effectiveTheme);
        }

        /**
         * Resolve effective theme (handle 'system' theme)
         * @param {string} theme - Requested theme
         * @returns {string} Effective theme ('light' or 'dark')
         */
        resolveEffectiveTheme(theme) {
            if (theme === 'system') {
                return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return theme;
        }

        /**
         * Set theme immediately without animation
         * @param {string} theme - Theme to apply
         */
        setThemeImmediate(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` theme-${theme}`;
        }

        /**
         * Animate theme transition
         * @param {string} newTheme - New theme to transition to
         */
        animateThemeTransition(newTheme) {
            const duration = this.transitionDuration;
            
            // Create transition overlay for smooth animation
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: var(--theme-background);
                opacity: 0;
                z-index: 9999;
                pointer-events: none;
                transition: opacity ${duration / 2}ms ease-in-out;
            `;
            document.body.appendChild(overlay);

            // Fade in overlay
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });

            // Change theme at midpoint
            setTimeout(() => {
                this.setThemeImmediate(newTheme);
                
                // Fade out overlay
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, duration / 2);
                }, 10);
            }, duration / 2);
        }

        /**
         * Update theme configuration
         * @param {Object} config - Theme configuration object
         */
        updateThemeConfig(config) {
            if (!config || typeof config !== 'object') return;

            // Update CSS custom properties with new color values
            const root = document.documentElement;
            const style = root.style;

            if (config.lightColors) {
                this.updateCSSProperties(style, config.lightColors, '');
            }

            if (config.darkColors) {
                this.updateCSSProperties(style, config.darkColors, '[data-theme="dark"]');
            }
        }

        /**
         * Update CSS custom properties
         * @param {CSSStyleDeclaration} style - Style object to update
         * @param {Object} colors - Color configuration
         * @param {string} selector - CSS selector prefix
         */
        updateCSSProperties(style, colors, selector) {
            for (const [key, value] of Object.entries(colors)) {
                const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                style.setProperty(cssVar, value);
            }
        }

        /**
         * Update animation settings
         * @param {Object} settings - Animation settings object
         */
        updateAnimationSettings(settings) {
            if (!settings || typeof settings !== 'object') return;

            this.transitionDuration = settings.themeSwitchDuration || 200;

            const root = document.documentElement;
            const style = root.style;

            if (settings.animationsEnabled === false || settings.reducedMotion === true) {
                style.setProperty('--theme-transition-fast', '0ms');
                style.setProperty('--theme-transition-normal', '0ms');
                style.setProperty('--theme-transition-slow', '0ms');
            } else {
                style.setProperty('--theme-transition-fast', `${settings.tabAnimationDuration || 150}ms ease-in-out`);
                style.setProperty('--theme-transition-normal', `${settings.themeSwitchDuration || 200}ms ease-in-out`);
                style.setProperty('--theme-transition-slow', `${settings.sidebarAnimationDuration || 250}ms ease-in-out`);
            }
        }

        /**
         * Send theme information to host
         */
        sendThemeInfo() {
            const themeInfo = {
                type: 'theme-info',
                currentTheme: this.currentTheme,
                effectiveTheme: this.resolveEffectiveTheme(this.currentTheme),
                systemThemeSupported: !!(window.matchMedia),
                isReady: this.isInitialized
            };

            this.sendToHost(themeInfo);
        }

        /**
         * Notify host that theme bridge is ready
         */
        notifyReady() {
            this.sendToHost({
                type: 'theme-bridge-ready',
                currentTheme: this.currentTheme,
                effectiveTheme: this.resolveEffectiveTheme(this.currentTheme)
            });
        }

        /**
         * Notify host of theme change
         * @param {string} oldTheme - Previous theme
         * @param {string} newTheme - New theme
         */
        notifyThemeChanged(oldTheme, newTheme) {
            this.sendToHost({
                type: 'theme-changed',
                oldTheme: oldTheme,
                newTheme: newTheme,
                effectiveTheme: this.resolveEffectiveTheme(newTheme)
            });
        }

        /**
         * Send message to WPF host
         * @param {Object} message - Message to send
         */
        sendToHost(message) {
            try {
                if (window.chrome && window.chrome.webview) {
                    window.chrome.webview.postMessage(message);
                } else if (window.external && window.external.notify) {
                    window.external.notify(JSON.stringify(message));
                }
            } catch (error) {
                console.warn('Failed to send message to host:', error);
            }
        }

        /**
         * Get current theme information
         * @returns {Object} Current theme info
         */
        getThemeInfo() {
            return {
                currentTheme: this.currentTheme,
                effectiveTheme: this.resolveEffectiveTheme(this.currentTheme),
                isInitialized: this.isInitialized
            };
        }
    }

    // Global API for external access
    window.MarkReadTheme = {
        bridge: null,

        /**
         * Initialize theme bridge
         */
        init() {
            if (!this.bridge) {
                this.bridge = new ThemeBridge();
            }
            return this.bridge;
        },

        /**
         * Apply theme programmatically
         * @param {string} theme - Theme to apply
         * @param {boolean} animate - Whether to animate
         */
        applyTheme(theme, animate = true) {
            if (this.bridge) {
                this.bridge.applyTheme(theme, animate);
            }
        },

        /**
         * Get current theme info
         */
        getThemeInfo() {
            return this.bridge ? this.bridge.getThemeInfo() : null;
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.MarkReadTheme.init();
        });
    } else {
        window.MarkReadTheme.init();
    }

})();
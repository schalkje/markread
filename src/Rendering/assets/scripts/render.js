(function () {
    const bridge = window.chrome && window.chrome.webview ? window.chrome.webview : null;
    const state = window.__MARKREAD_INITIAL_STATE || {};

    function postMessage(name, payload) {
        if (!bridge || typeof bridge.postMessage !== "function") {
            return;
        }

        try {
            bridge.postMessage({ name, payload });
        } catch (error) {
            console.error("Failed to post bridge message", error);
        }
    }

    let preferredTheme = "system";
    let mediaQuery;

    function resolveSystemTheme() {
        if (!mediaQuery) {
            mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        }

        return mediaQuery.matches ? "dark" : "light";
    }

    function handleSystemThemeChange(event) {
        if (preferredTheme === "system") {
            document.body.setAttribute("data-theme", event.matches ? "dark" : "light");
        }
    }

    function applyTheme(theme) {
        preferredTheme = typeof theme === "string" && theme.length > 0 ? theme.toLowerCase() : "system";

        if (!mediaQuery) {
            mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            if (typeof mediaQuery.addEventListener === "function") {
                mediaQuery.addEventListener("change", handleSystemThemeChange);
            } else if (typeof mediaQuery.addListener === "function") {
                mediaQuery.addListener(handleSystemThemeChange);
            }
        }

        const resolvedTheme = preferredTheme === "system" ? resolveSystemTheme() : preferredTheme;
        document.body.setAttribute("data-theme", resolvedTheme);
    }

    function safeDecodeAnchor(anchor) {
        if (!anchor || typeof anchor !== "string") {
            return null;
        }

        try {
            return decodeURIComponent(anchor);
        } catch (error) {
            return anchor;
        }
    }

    function scrollToAnchor(anchor, { highlight = true } = {}) {
        const decoded = safeDecodeAnchor(anchor);
        if (!decoded) {
            return;
        }

        const target = document.getElementById(decoded) || document.querySelector(`[name='${decoded}']`);
        if (!target) {
            return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (highlight) {
            target.classList.remove("anchor-highlight");
            void target.offsetWidth; // restart animation
            target.classList.add("anchor-highlight");
        }
    }

    function ensureSafeLinks() {
        document.querySelectorAll("a[href]").forEach(link => {
            const href = link.getAttribute("href");
            if (!href) {
                return;
            }

            if (href.startsWith("http://") || href.startsWith("https://")) {
                link.setAttribute("rel", "noopener noreferrer");
            }

            if (href.startsWith("#")) {
                link.dataset.anchorTarget = href.substring(1);
            }
        });
    }

    function convertMermaidBlocks() {
        const nodes = [];
        console.log('convertMermaidBlocks: Looking for div.mermaid elements');
        
        // Markdig already converts mermaid blocks to <div class="mermaid">
        const mermaidDivs = document.querySelectorAll("div.mermaid");
        console.log('convertMermaidBlocks: Found div.mermaid:', mermaidDivs.length);
        
        mermaidDivs.forEach(div => {
            // Store original source for re-rendering on theme change
            const source = div.textContent;
            div.setAttribute('data-mermaid-source', source);
            nodes.push(div);
        });
        
        console.log('convertMermaidBlocks: Prepared', nodes.length, 'mermaid blocks');
        return nodes;
    }

    function getMermaidTheme() {
        // Check data-theme attribute (should be 'light' or 'dark')
        const theme = document.body.getAttribute('data-theme');
        console.log('getMermaidTheme: data-theme attribute is:', theme);
        
        // Match against 'dark' or theme names containing 'dark'
        if (theme && (theme === 'dark' || theme.toLowerCase().includes('dark'))) {
            console.log('Using Mermaid dark theme');
            return 'dark';
        }
        
        console.log('Using Mermaid default (light) theme');
        return 'default';
    }

    function renderMermaidGraphs() {
        if (!window.mermaid) {
            console.log('renderMermaidGraphs: window.mermaid not available');
            return Promise.resolve();
        }

        const nodes = convertMermaidBlocks();
        if (nodes.length === 0) {
            console.log('renderMermaidGraphs: no mermaid blocks found');
            return Promise.resolve();
        }

        // Use built-in themes that match our color scheme
        const theme = getMermaidTheme();
        console.log('renderMermaidGraphs: initializing Mermaid with theme:', theme);
        
        // Configure Mermaid with theme-specific settings
        const config = { 
            startOnLoad: false, 
            securityLevel: "strict",
            theme: theme === 'dark' ? 'dark' : 'default'
        };
        
        console.log('renderMermaidGraphs: config =', JSON.stringify(config));
        window.mermaid.initialize(config);
        try {
            console.log('renderMermaidGraphs: running Mermaid on', nodes.length, 'nodes');
            return window.mermaid.run({ nodes });
        } catch (error) {
            console.warn("Mermaid failed to render", error);
            return Promise.resolve();
        }
    }

    function reRenderMermaidGraphs() {
        if (!window.mermaid) {
            return Promise.resolve();
        }

        // Find all existing mermaid diagrams
        const mermaidElements = document.querySelectorAll('.mermaid[data-mermaid-source]');
        if (mermaidElements.length === 0) {
            return Promise.resolve();
        }

        // Get the new theme
        const theme = getMermaidTheme();
        
        // Re-initialize with new theme
        const config = { 
            startOnLoad: false, 
            securityLevel: "strict",
            theme: theme === 'dark' ? 'dark' : 'default'
        };
        
        window.mermaid.initialize(config);

        // Restore original source and clear SVG
        const nodes = [];
        mermaidElements.forEach(element => {
            const source = element.getAttribute('data-mermaid-source');
            if (source) {
                // Clear the rendered SVG
                element.innerHTML = '';
                element.textContent = source;
                element.removeAttribute('data-processed');
                nodes.push(element);
            }
        });

        if (nodes.length === 0) {
            return Promise.resolve();
        }

        // Re-render with new theme
        try {
            return window.mermaid.run({ nodes });
        } catch (error) {
            console.warn("Mermaid failed to re-render", error);
            return Promise.resolve();
        }
    }

    function highlightCodeBlocks() {
        if (!window.Prism) {
            return;
        }

        // Add line-numbers class to all pre elements
        document.querySelectorAll("pre[class*='language-']").forEach(pre => {
            pre.classList.add("line-numbers");
        });

        // Highlight all code blocks
        window.Prism.highlightAll();
    }

    function handleLinkClicks() {
        document.addEventListener("click", event => {
            if (event.defaultPrevented) {
                return;
            }

            const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
            if (!anchor) {
                return;
            }

            let href = anchor.getAttribute("href");
            if (!href) {
                return;
            }

            const isCtrl = event.ctrlKey || event.metaKey;
            const isOtherModifier = event.shiftKey || event.altKey;

            // Don't handle shift/alt modifiers, let browser handle them
            if (isOtherModifier) {
                return;
            }

            event.preventDefault();

            if (href.startsWith("#")) {
                const anchorId = href.substring(1);
                scrollToAnchor(anchorId);
                postMessage("anchor-click", { anchor: anchorId });
                return;
            }

            // Send different message for Ctrl+Click
            if (isCtrl) {
                postMessage("link-ctrl-click", { href });
            } else {
                postMessage("link-click", { href });
            }
        }, true);
    }

    function listenForBridgeMessages() {
        if (!bridge || typeof bridge.addEventListener !== "function") {
            return;
        }

        bridge.addEventListener("message", event => {
            const message = event && event.data ? event.data : {};
            if (!message || typeof message.name !== "string") {
                return;
            }

            switch (message.name) {
                case "scroll-to": {
                    const anchor = message.payload && message.payload.anchor;
                    scrollToAnchor(anchor, { highlight: true });
                    break;
                }
                case "apply-theme": {
                    const theme = message.payload && message.payload.theme;
                    applyTheme(theme);
                    break;
                }
                default:
                    break;
            }
        });
    }

    function listenForThemeChanges() {
        // Listen for theme changes dispatched by WebViewHost.InjectThemeAsync
        document.addEventListener('themeChanged', (event) => {
            console.log('Theme changed, re-rendering Mermaid diagrams');
            reRenderMermaidGraphs().catch(error => {
                console.warn('Failed to re-render Mermaid diagrams:', error);
            });
        });
    }

    function initialise() {
    console.log('Initialise: state.theme =', state.theme);
    console.log('Initialise: initial data-theme =', document.body.getAttribute('data-theme'));
    applyTheme(state.theme);
    console.log('Initialise: after applyTheme, data-theme =', document.body.getAttribute('data-theme'));
    ensureSafeLinks();
    handleLinkClicks();
    listenForBridgeMessages();
    listenForThemeChanges();

    const mermaidPromise = renderMermaidGraphs();
    highlightCodeBlocks();

        if (state.anchor) {
            scrollToAnchor(state.anchor, { highlight: true });
        }

        Promise.resolve(mermaidPromise)
            .catch(error => console.warn("Mermaid promise rejected", error))
            .finally(() => postMessage("ready"));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise, { once: true });
    } else {
        initialise();
    }
})();

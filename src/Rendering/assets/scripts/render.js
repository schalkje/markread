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
        const blocks = document.querySelectorAll("pre code.language-mermaid");
        blocks.forEach(block => {
            const wrapper = document.createElement("div");
            wrapper.className = "mermaid";
            wrapper.textContent = block.textContent;

            const pre = block.parentElement;
            if (pre && pre.parentElement) {
                pre.parentElement.replaceChild(wrapper, pre);
                nodes.push(wrapper);
            }
        });
        return nodes;
    }

    function renderMermaidGraphs() {
        if (!window.mermaid) {
            return Promise.resolve();
        }

        const nodes = convertMermaidBlocks();
        if (nodes.length === 0) {
            return Promise.resolve();
        }

        window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        try {
            return window.mermaid.run({ nodes });
        } catch (error) {
            console.warn("Mermaid failed to render", error);
            return Promise.resolve();
        }
    }

    function highlightCodeBlocks() {
        if (!window.hljs) {
            return;
        }

        document.querySelectorAll("pre code").forEach(block => {
            window.hljs.highlightElement(block);
        });
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

    function initialise() {
    applyTheme(state.theme);
    ensureSafeLinks();
    handleLinkClicks();
    listenForBridgeMessages();

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

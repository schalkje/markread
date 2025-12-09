(function () {
    const bridge = window.chrome && window.chrome.webview ? window.chrome.webview : null;

    let currentQuery = "";
    let matches = [];
    let currentMatchIndex = -1;
    const HIGHLIGHT_CLASS = "search-highlight";
    const ACTIVE_HIGHLIGHT_CLASS = "search-highlight-active";

    function postMessage(name, payload) {
        if (!bridge || typeof bridge.postMessage !== "function") {
            return;
        }

        try {
            bridge.postMessage({ name, payload });
        } catch (error) {
            console.error("Failed to post find bridge message", error);
        }
    }

    function clearHighlights() {
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(element => {
            const parent = element.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(element.textContent), element);
                parent.normalize();
            }
        });
        matches = [];
        currentMatchIndex = -1;
    }

    function highlightMatches(query) {
        clearHighlights();

        if (!query || query.length === 0) {
            postMessage("find-result", { matchCount: 0, currentIndex: -1 });
            return;
        }

        currentQuery = query;
        const bodyText = document.body;
        const treeWalker = document.createTreeWalker(
            bodyText,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    // Skip script, style, and already highlighted nodes
                    if (node.parentElement) {
                        const tagName = node.parentElement.tagName.toLowerCase();
                        if (tagName === "script" || tagName === "style") {
                            return NodeFilter.FILTER_REJECT;
                        }
                        if (node.parentElement.classList.contains(HIGHLIGHT_CLASS)) {
                            return NodeFilter.FILTER_REJECT;
                        }
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToProcess = [];
        let node;
        while ((node = treeWalker.nextNode())) {
            nodesToProcess.push(node);
        }

        const searchRegex = new RegExp(escapeRegExp(query), "gi");

        nodesToProcess.forEach(textNode => {
            const text = textNode.textContent;
            if (!text) return;

            const fragmentMatches = [];
            let match;
            while ((match = searchRegex.exec(text)) !== null) {
                fragmentMatches.push({ index: match.index, length: query.length });
            }

            if (fragmentMatches.length === 0) return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            fragmentMatches.forEach(m => {
                if (m.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, m.index)));
                }

                const mark = document.createElement("mark");
                mark.className = HIGHLIGHT_CLASS;
                mark.textContent = text.substring(m.index, m.index + m.length);
                fragment.appendChild(mark);
                matches.push(mark);

                lastIndex = m.index + m.length;
            });

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            if (textNode.parentNode) {
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });

        if (matches.length > 0) {
            currentMatchIndex = 0;
            setActiveMatch(0);
        }

        postMessage("find-result", { matchCount: matches.length, currentIndex: currentMatchIndex });
    }

    function setActiveMatch(index) {
        if (index < 0 || index >= matches.length) {
            return;
        }

        // Remove active class from previous match
        matches.forEach(m => m.classList.remove(ACTIVE_HIGHLIGHT_CLASS));

        // Add active class to current match
        currentMatchIndex = index;
        const activeMatch = matches[currentMatchIndex];
        activeMatch.classList.add(ACTIVE_HIGHLIGHT_CLASS);

        // Scroll into view
        activeMatch.scrollIntoView({ behavior: "smooth", block: "center" });

        postMessage("find-result", { matchCount: matches.length, currentIndex: currentMatchIndex });
    }

    function nextMatch() {
        if (matches.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % matches.length;
        setActiveMatch(nextIndex);
    }

    function previousMatch() {
        if (matches.length === 0) return;
        const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        setActiveMatch(prevIndex);
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Listen for bridge messages
    if (bridge && typeof bridge.addEventListener === "function") {
        bridge.addEventListener("message", event => {
            const message = event && event.data ? event.data : {};
            if (!message || typeof message.name !== "string") {
                return;
            }

            switch (message.name) {
                case "find-start": {
                    const query = message.payload && message.payload.query;
                    highlightMatches(query || "");
                    break;
                }
                case "find-next": {
                    nextMatch();
                    break;
                }
                case "find-previous": {
                    previousMatch();
                    break;
                }
                case "find-clear": {
                    clearHighlights();
                    postMessage("find-result", { matchCount: 0, currentIndex: -1 });
                    break;
                }
                default:
                    break;
            }
        });
    }

    // Export for testing/debugging
    window.__MARKREAD_FIND = {
        highlightMatches,
        clearHighlights,
        nextMatch,
        previousMatch,
        getMatchCount: () => matches.length,
        getCurrentIndex: () => currentMatchIndex
    };
})();

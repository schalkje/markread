/**
 * Zoom and Pan Controller for MarkRead
 * Handles zoom/pan transforms via CSS matrix, coordinates with WPF host
 */

class ZoomPanController {
    constructor() {
        this.zoomPercent = 100.0;
        this.panX = 0.0;
        this.panY = 0.0;
        this.contentElement = null;
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the controller and set up message listener
     */
    initialize() {
        this.contentElement = document.getElementById('content');
        if (!this.contentElement) {
            console.error('ZoomPanController: content element not found');
            return;
        }

        // Listen for commands from WPF
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.addEventListener('message', (event) => this.handleMessage(event));
            console.log('ZoomPanController: Initialized and listening for messages');
        } else {
            console.warn('ZoomPanController: WebView2 bridge not available');
        }

        // Add wheel event listener for CTRL+scroll zoom
        document.addEventListener('wheel', (event) => this.handleWheelEvent(event), { passive: false });
        console.log('ZoomPanController: Wheel event listener attached');
    }

    /**
     * Handle wheel events for zoom control (CTRL + scroll)
     * @param {WheelEvent} event - Wheel event
     */
    handleWheelEvent(event) {
        // Only handle if CTRL key is pressed
        if (!event.ctrlKey) {
            return;
        }

        console.log('ZoomPanController: CTRL+Wheel detected', event.deltaY);

        // Prevent default zoom behavior
        event.preventDefault();

        // Calculate zoom delta based on wheel direction
        // deltaY > 0 means scroll down (zoom out), deltaY < 0 means scroll up (zoom in)
        const delta = event.deltaY > 0 ? -10 : 10;

        // Get cursor position relative to viewport
        const cursorX = event.clientX;
        const cursorY = event.clientY;

        console.log('ZoomPanController: Processing zoom', { delta, cursorX, cursorY });

        // Perform zoom operation
        this.zoom(delta, cursorX, cursorY);
    }

    /**
     * Handle incoming messages from WPF host
     * @param {MessageEvent} event - Message event from WebView2
     */
    handleMessage(event) {
        console.log('ZoomPanController: Raw message received:', event);
        
        const command = event.data;
        console.log('ZoomPanController: Parsed command:', command);
        
        if (!command || !command.action) {
            console.warn('ZoomPanController: Invalid command format:', command);
            return;
        }

        console.log('ZoomPanController: Processing command:', command.action);

        switch (command.action) {
            case 'zoom':
                this.zoom(command.delta, command.cursorX, command.cursorY);
                break;
            case 'reset':
                this.reset();
                break;
            case 'restore':
                this.restore(command.zoom, command.panX, command.panY);
                break;
            case 'pan':
                this.pan(command.deltaX, command.deltaY);
                break;
            default:
                console.warn('ZoomPanController: Unknown command:', command.action);
        }
    }

    /**
     * Zoom in or out by delta, keeping cursor position fixed
     * @param {number} delta - Zoom change in percentage points (+10 or -10)
     * @param {number} cursorX - Cursor X position in viewport coordinates
     * @param {number} cursorY - Cursor Y position in viewport coordinates
     */
    zoom(delta, cursorX, cursorY) {
        const oldZoom = this.zoomPercent;
        const newZoom = Math.max(10, Math.min(1000, oldZoom + delta));
        
        if (Math.abs(oldZoom - newZoom) < 0.01) {
            console.log('ZoomPanController: Zoom limit reached');
            return; // At boundary, no change
        }

        // Calculate zoom center point (cursor-centered or viewport-centered)
        const centerX = cursorX || window.innerWidth / 2;
        const centerY = cursorY || window.innerHeight / 2;

        // Calculate new pan offset to keep point under cursor fixed
        // Formula: newPan = oldPan - (centerPoint * (newScale - oldScale))
        const oldScale = oldZoom / 100.0;
        const newScale = newZoom / 100.0;
        const scaleDiff = newScale - oldScale;
        
        this.zoomPercent = newZoom;
        this.panX = this.panX - (centerX * scaleDiff);
        this.panY = this.panY - (centerY * scaleDiff);

        // Clamp pan to boundaries
        this.clampPanBoundaries();

        // Apply transform and notify WPF
        this.applyTransform();
        this.sendStateUpdate();

        console.log(`ZoomPanController: Zoomed from ${oldZoom}% to ${newZoom}%`);
    }

    /**
     * Pan the viewport by delta amounts
     * @param {number} deltaX - Horizontal delta in pixels
     * @param {number} deltaY - Vertical delta in pixels
     */
    pan(deltaX, deltaY) {
        this.panX += deltaX || 0;
        this.panY += deltaY || 0;

        // Clamp to boundaries
        this.clampPanBoundaries();

        // Apply transform and notify WPF
        this.applyTransform();
        this.sendStateUpdate();

        console.log(`ZoomPanController: Panned by (${deltaX}, ${deltaY})`);
    }

    /**
     * Reset zoom to 100% and pan to (0, 0)
     */
    reset() {
        this.zoomPercent = 100.0;
        this.panX = 0.0;
        this.panY = 0.0;

        this.applyTransform();
        this.sendStateUpdate();

        console.log('ZoomPanController: Reset to 100% zoom');
    }

    /**
     * Restore zoom/pan state (e.g., when switching tabs)
     * @param {number} zoom - Zoom percentage to restore
     * @param {number} panX - Pan X offset to restore
     * @param {number} panY - Pan Y offset to restore
     */
    restore(zoom, panX, panY) {
        this.zoomPercent = Math.max(10, Math.min(1000, zoom || 100));
        this.panX = panX || 0;
        this.panY = panY || 0;

        this.clampPanBoundaries();
        this.applyTransform();

        console.log(`ZoomPanController: Restored zoom=${this.zoomPercent}%, pan=(${this.panX}, ${this.panY})`);
    }

    /**
     * Apply current zoom/pan state as CSS transform
     */
    applyTransform() {
        if (!this.contentElement) {
            return;
        }

        const scale = this.zoomPercent / 100.0;
        
        // Apply CSS matrix transform: matrix(scaleX, 0, 0, scaleY, translateX, translateY)
        // Note: CSS transforms use transform-origin (default center), but we manage pan manually
        this.contentElement.style.transformOrigin = '0 0'; // Top-left origin for consistent pan behavior
        this.contentElement.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${this.panX}, ${this.panY})`;

        // Performance hint for browser
        this.contentElement.style.willChange = 'transform';
    }

    /**
     * Clamp pan offsets to keep content visible within viewport boundaries
     */
    clampPanBoundaries() {
        if (!this.contentElement) {
            return;
        }

        const scale = this.zoomPercent / 100.0;
        
        // Get content dimensions (at 100% zoom)
        const contentRect = this.contentElement.getBoundingClientRect();
        const contentWidth = contentRect.width / scale; // Actual content width before scaling
        const contentHeight = contentRect.height / scale;

        // Calculate scaled dimensions
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;

        // Viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate maximum pan offsets
        // maxPan = max(0, scaledSize - viewportSize)
        // Pan is negative when content is larger than viewport
        const maxPanX = Math.max(0, scaledWidth - viewportWidth);
        const maxPanY = Math.max(0, scaledHeight - viewportHeight);

        // Clamp pan offsets
        // Pan should be in range [-maxPan, 0] to keep content visible
        this.panX = Math.max(-maxPanX, Math.min(0, this.panX));
        this.panY = Math.max(-maxPanY, Math.min(0, this.panY));

        // Reset pan to 0 if content fits within viewport (no need to pan)
        if (scaledWidth <= viewportWidth) {
            this.panX = 0;
        }
        if (scaledHeight <= viewportHeight) {
            this.panY = 0;
        }
    }

    /**
     * Send current zoom/pan state back to WPF host
     */
    sendStateUpdate() {
        if (window.chrome && window.chrome.webview) {
            const state = {
                name: 'zoomPanState',
                payload: {
                    zoom: this.zoomPercent,
                    panX: this.panX,
                    panY: this.panY
                }
            };
            window.chrome.webview.postMessage(state);
            console.log('ZoomPanController: Sent state update:', state);
        }
    }
}

// Initialize controller when script loads
if (typeof window !== 'undefined') {
    window.zoomPanController = new ZoomPanController();
}

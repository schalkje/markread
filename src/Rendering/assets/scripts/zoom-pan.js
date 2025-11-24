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
        this.originalContentWidth = 0;
        this.originalContentHeight = 0;
        this.positionIndicator = null;
        this.positionIndicatorHorizontal = null;
        this.positionThumb = null;
        this.positionThumbHorizontal = null;
        this.zoomIndicator = null;
        this.indicatorTimeout = null;
        
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

        // Cache original content dimensions after a short delay to ensure full render
        setTimeout(() => {
            this.originalContentWidth = this.contentElement.scrollWidth;
            this.originalContentHeight = this.contentElement.scrollHeight;
        }, 100);

        // Create position and zoom indicators
        this.createIndicators();

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

        // Add keyboard event listener for CTRL+/-, CTRL+0
        document.addEventListener('keydown', (event) => this.handleKeyboardEvent(event), { passive: false });
        console.log('ZoomPanController: Keyboard event listener attached');
    }

    /**
     * Create position and zoom indicators
     */
    createIndicators() {
        // Vertical position indicator (scrollbar replacement)
        this.positionIndicator = document.createElement('div');
        this.positionIndicator.className = 'position-indicator';
        this.positionThumb = document.createElement('div');
        this.positionThumb.className = 'position-indicator-thumb';
        this.positionIndicator.appendChild(this.positionThumb);
        document.body.appendChild(this.positionIndicator);

        // Horizontal position indicator
        this.positionIndicatorHorizontal = document.createElement('div');
        this.positionIndicatorHorizontal.className = 'position-indicator-horizontal';
        this.positionThumbHorizontal = document.createElement('div');
        this.positionThumbHorizontal.className = 'position-indicator-thumb';
        this.positionIndicatorHorizontal.appendChild(this.positionThumbHorizontal);
        document.body.appendChild(this.positionIndicatorHorizontal);

        // Zoom level indicator
        this.zoomIndicator = document.createElement('div');
        this.zoomIndicator.className = 'zoom-indicator';
        this.zoomIndicator.textContent = '100%';
        document.body.appendChild(this.zoomIndicator);
    }

    /**
     * Update position indicator based on current pan offset
     */
    updatePositionIndicator() {
        if (!this.contentElement) {
            return;
        }

        const scale = this.zoomPercent / 100.0;
        const contentWidth = this.originalContentWidth;
        const contentHeight = this.originalContentHeight;
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Update vertical indicator
        if (this.positionIndicator && this.positionThumb) {
            const visibleRatioY = Math.min(1, viewportHeight / scaledHeight);
            const scrollableHeight = Math.max(0, scaledHeight - viewportHeight);
            const positionRatioY = scrollableHeight > 0 ? Math.abs(this.panY) / scrollableHeight : 0;

            const indicatorHeight = this.positionIndicator.clientHeight;
            const thumbHeight = Math.max(20, indicatorHeight * visibleRatioY);
            const thumbTop = positionRatioY * (indicatorHeight - thumbHeight);

            this.positionThumb.style.height = `${thumbHeight}px`;
            this.positionThumb.style.transform = `translateY(${thumbTop}px)`;
        }

        // Update horizontal indicator
        if (this.positionIndicatorHorizontal && this.positionThumbHorizontal) {
            const visibleRatioX = Math.min(1, viewportWidth / scaledWidth);
            const scrollableWidth = Math.max(0, scaledWidth - viewportWidth);
            const positionRatioX = scrollableWidth > 0 ? Math.abs(this.panX) / scrollableWidth : 0;

            const indicatorWidth = this.positionIndicatorHorizontal.clientWidth;
            const thumbWidth = Math.max(20, indicatorWidth * visibleRatioX);
            const thumbLeft = positionRatioX * (indicatorWidth - thumbWidth);

            this.positionThumbHorizontal.style.width = `${thumbWidth}px`;
            this.positionThumbHorizontal.style.transform = `translateX(${thumbLeft}px)`;
        }

        // Show indicators temporarily
        this.showIndicators();
    }

    /**
     * Update zoom indicator with current zoom level
     */
    updateZoomIndicator() {
        if (!this.zoomIndicator) {
            return;
        }

        this.zoomIndicator.textContent = `${Math.round(this.zoomPercent)}%`;
        this.showIndicators();
    }

    /**
     * Show indicators temporarily (fade out after 1.5s)
     */
    showIndicators() {
        if (this.positionIndicator) {
            this.positionIndicator.classList.add('visible');
        }
        if (this.positionIndicatorHorizontal) {
            this.positionIndicatorHorizontal.classList.add('visible');
        }
        if (this.zoomIndicator) {
            this.zoomIndicator.classList.add('visible');
        }

        // Clear existing timeout
        if (this.indicatorTimeout) {
            clearTimeout(this.indicatorTimeout);
        }

        // Hide after 1.5 seconds
        this.indicatorTimeout = setTimeout(() => {
            if (this.positionIndicator) {
                this.positionIndicator.classList.remove('visible');
            }
            if (this.positionIndicatorHorizontal) {
                this.positionIndicatorHorizontal.classList.remove('visible');
            }
            if (this.zoomIndicator) {
                this.zoomIndicator.classList.remove('visible');
            }
        }, 1500);
    }

    /**
     * Handle keyboard events for zoom control (CTRL+/-, CTRL+0) and navigation (arrows, PageUp/Down)
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardEvent(event) {
        // CTRL + key = zoom controls
        if (event.ctrlKey) {
            let handled = false;
            let delta = 0;

            // CTRL + Plus/Equals (zoom in)
            if (event.key === '+' || event.key === '=' || event.code === 'Equal' || event.code === 'NumpadAdd') {
                delta = 10;
                handled = true;
            }
            // CTRL + Minus (zoom out)
            else if (event.key === '-' || event.code === 'Minus' || event.code === 'NumpadSubtract') {
                delta = -10;
                handled = true;
            }
            // CTRL + 0 (reset zoom) - handled separately in reset section
            else if (event.key === '0' || event.code === 'Digit0' || event.code === 'Numpad0') {
                event.preventDefault();
                console.log('ZoomPanController: CTRL+0 detected, resetting zoom');
                this.reset();
                return;
            }

            if (handled) {
                event.preventDefault();
                console.log('ZoomPanController: Keyboard zoom', { key: event.key, delta });

                // Use viewport center for keyboard zoom
                const cursorX = window.innerWidth / 2;
                const cursorY = window.innerHeight / 2;

                this.zoom(delta, cursorX, cursorY);
            }
            return;
        }

        // Navigation keys (without CTRL)
        let handled = false;
        let deltaX = 0;
        let deltaY = 0;

        switch (event.key) {
            case 'ArrowUp':
                deltaY = 40; // Pan up (positive = move content down)
                handled = true;
                break;
            case 'ArrowDown':
                deltaY = -40; // Pan down (negative = move content up)
                handled = true;
                break;
            case 'ArrowLeft':
                deltaX = 40; // Pan left (positive = move content right)
                handled = true;
                break;
            case 'ArrowRight':
                deltaX = -40; // Pan right (negative = move content left)
                handled = true;
                break;
            case 'PageUp':
                deltaY = window.innerHeight * 0.8; // Pan up by ~80% of viewport
                handled = true;
                break;
            case 'PageDown':
                deltaY = -window.innerHeight * 0.8; // Pan down by ~80% of viewport
                handled = true;
                break;
            case 'Home':
                // Jump to top
                this.panY = 0;
                this.clampPanBoundaries();
                this.applyTransform();
                this.sendStateUpdate();
                this.updatePositionIndicator();
                event.preventDefault();
                return;
            case 'End':
                // Jump to bottom
                const scale = this.zoomPercent / 100.0;
                const contentHeight = this.originalContentHeight || this.contentElement.scrollHeight;
                const scaledHeight = contentHeight * scale;
                const maxPanY = Math.max(0, scaledHeight - window.innerHeight);
                this.panY = -maxPanY;
                this.clampPanBoundaries();
                this.applyTransform();
                this.sendStateUpdate();
                this.updatePositionIndicator();
                event.preventDefault();
                return;
        }

        if (handled) {
            event.preventDefault();
            this.pan(deltaX, deltaY);
        }
    }

    /**
     * Handle wheel events for zoom control (CTRL + scroll) or pan (normal/shift scroll)
     * @param {WheelEvent} event - Wheel event
     */
    handleWheelEvent(event) {
        // CTRL + wheel = zoom
        if (event.ctrlKey) {
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
        // SHIFT + wheel = horizontal pan
        else if (event.shiftKey) {
            event.preventDefault();
            
            // Pan horizontally based on wheel direction
            const panDeltaX = -event.deltaY; // Use deltaY for horizontal pan
            
            this.pan(panDeltaX, 0);
        }
        // Normal wheel = vertical pan (since we disabled native scrolling)
        else {
            event.preventDefault();
            
            // Pan in the direction of the wheel
            // deltaY > 0 = scroll down = pan content up (negative Y)
            // deltaY < 0 = scroll up = pan content down (positive Y)
            const panDeltaY = -event.deltaY;
            const panDeltaX = -event.deltaX; // Support horizontal scroll (trackpad)
            
            this.pan(panDeltaX, panDeltaY);
        }
    }

    /**
     * Handle incoming messages from WPF host
     * @param {MessageEvent} event - Message event from WebView2
     */
    handleMessage(event) {
        console.log('ZoomPanController: Raw message received:', event);
        
        const message = event.data;
        console.log('ZoomPanController: Parsed message:', message);
        
        // Check if this is a BridgeMessage with name/payload structure
        if (message && message.name === 'zoom-pan' && message.payload) {
            const command = message.payload;
            console.log('ZoomPanController: Extracted command from BridgeMessage:', command);
            
            if (!command.action) {
                console.warn('ZoomPanController: Invalid command format (missing action):', command);
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
        this.updatePositionIndicator();
        this.updateZoomIndicator();

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
        this.updatePositionIndicator();
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
        this.updatePositionIndicator();
        this.updateZoomIndicator();

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
        this.updatePositionIndicator();
        this.updateZoomIndicator();

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
        
        // Use cached original dimensions, or fall back to live measurement
        const contentWidth = this.originalContentWidth || this.contentElement.scrollWidth;
        const contentHeight = this.originalContentHeight || this.contentElement.scrollHeight;

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

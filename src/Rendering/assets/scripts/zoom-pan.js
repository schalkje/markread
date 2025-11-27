/**
 * Zoom and Pan Controller for MarkRead
 * Handles zoom/pan transforms via CSS matrix, coordinates with WPF host
 * Version: 2025-11-27-08:22 - Cache clear test
 */

// DIAGNOSTIC: Log immediately when file loads (before class definition)
console.log('=== ZOOM-PAN.JS FILE LOADED - VERSION 2025-11-27-08:22 ===');

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
        
        // Middle mouse button panning state
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        // Thumb dragging state
        this.isThumbDragging = false;
        this.thumbDragAxis = null; // 'vertical' or 'horizontal'
        this.thumbDragStartY = 0;
        this.thumbDragStartX = 0;
        this.thumbDragStartPanY = 0;
        this.thumbDragStartPanX = 0;
        
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
            console.log('=== ZoomPanController v2025-11-26-20:00 INITIALIZED ===');
        } else {
            console.warn('ZoomPanController: WebView2 bridge not available');
        }

        // Add wheel event listener for CTRL+scroll zoom
        document.addEventListener('wheel', (event) => this.handleWheelEvent(event), { passive: false });
        console.log('ZoomPanController: Wheel event listener attached');

        // Add keyboard event listener for CTRL+/-, CTRL+0
        document.addEventListener('keydown', (event) => this.handleKeyboardEvent(event), { passive: false });
        console.log('ZoomPanController: Keyboard event listener attached');

        // Add mouse event listeners for middle button drag panning
        document.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        document.addEventListener('mouseup', (event) => this.handleMouseUp(event));
        console.log('ZoomPanController: Mouse event listeners attached for middle button panning');
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

        // Add event listeners for interactive thumbs
        this.setupThumbInteraction();
    }

    /**
     * Set up interactive thumb dragging and track clicking
     */
    setupThumbInteraction() {
        // Vertical thumb dragging
        if (this.positionThumb) {
            this.positionThumb.addEventListener('mousedown', (event) => this.handleThumbMouseDown(event, 'vertical'));
        }

        // Horizontal thumb dragging
        if (this.positionThumbHorizontal) {
            this.positionThumbHorizontal.addEventListener('mousedown', (event) => this.handleThumbMouseDown(event, 'horizontal'));
        }

        // Track clicking - vertical
        if (this.positionIndicator) {
            this.positionIndicator.addEventListener('mousedown', (event) => this.handleTrackClick(event, 'vertical'));
        }

        // Track clicking - horizontal
        if (this.positionIndicatorHorizontal) {
            this.positionIndicatorHorizontal.addEventListener('mousedown', (event) => this.handleTrackClick(event, 'horizontal'));
        }

        // Global mouse move and up for thumb dragging
        document.addEventListener('mousemove', (event) => this.handleThumbMouseMove(event));
        document.addEventListener('mouseup', (event) => this.handleThumbMouseUp(event));
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
     * Handle thumb mousedown - start dragging
     * @param {MouseEvent} event - Mouse event
     * @param {string} axis - 'vertical' or 'horizontal'
     */
    handleThumbMouseDown(event, axis) {
        // Only handle left button
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation(); // Prevent track click from firing

        this.isThumbDragging = true;
        this.thumbDragAxis = axis;

        if (axis === 'vertical') {
            this.thumbDragStartY = event.clientY;
            this.thumbDragStartPanY = this.panY;
        } else {
            this.thumbDragStartX = event.clientX;
            this.thumbDragStartPanX = this.panX;
        }

        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';

        console.log(`ZoomPanController: Thumb drag started (${axis})`);
    }

    /**
     * Handle thumb mousemove - drag thumb to pan
     * @param {MouseEvent} event - Mouse event
     */
    handleThumbMouseMove(event) {
        if (!this.isThumbDragging) {
            return;
        }

        event.preventDefault();

        if (this.thumbDragAxis === 'vertical') {
            // Calculate how far the mouse has moved relative to indicator height
            const indicatorHeight = this.positionIndicator.clientHeight;
            const mouseDelta = event.clientY - this.thumbDragStartY;
            
            // Calculate scrollable height
            const scale = this.zoomPercent / 100.0;
            const contentHeight = this.originalContentHeight || this.contentElement.scrollHeight;
            const scaledHeight = contentHeight * scale;
            const viewportHeight = window.innerHeight;
            const scrollableHeight = Math.max(0, scaledHeight - viewportHeight);

            if (scrollableHeight === 0) {
                return; // No scrolling needed
            }

            // Calculate thumb height and max thumb position
            const visibleRatio = Math.min(1, viewportHeight / scaledHeight);
            const thumbHeight = Math.max(20, indicatorHeight * visibleRatio);
            const maxThumbPosition = indicatorHeight - thumbHeight;

            // Convert mouse delta to pan delta
            // mouseDelta / maxThumbPosition = panDelta / scrollableHeight
            const panDeltaRatio = maxThumbPosition > 0 ? mouseDelta / maxThumbPosition : 0;
            const panDelta = panDeltaRatio * scrollableHeight;

            // Update pan position
            this.panY = this.thumbDragStartPanY - panDelta;

        } else if (this.thumbDragAxis === 'horizontal') {
            // Calculate how far the mouse has moved relative to indicator width
            const indicatorWidth = this.positionIndicatorHorizontal.clientWidth;
            const mouseDelta = event.clientX - this.thumbDragStartX;
            
            // Calculate scrollable width
            const scale = this.zoomPercent / 100.0;
            const contentWidth = this.originalContentWidth || this.contentElement.scrollWidth;
            const scaledWidth = contentWidth * scale;
            const viewportWidth = window.innerWidth;
            const scrollableWidth = Math.max(0, scaledWidth - viewportWidth);

            if (scrollableWidth === 0) {
                return; // No scrolling needed
            }

            // Calculate thumb width and max thumb position
            const visibleRatio = Math.min(1, viewportWidth / scaledWidth);
            const thumbWidth = Math.max(20, indicatorWidth * visibleRatio);
            const maxThumbPosition = indicatorWidth - thumbWidth;

            // Convert mouse delta to pan delta
            const panDeltaRatio = maxThumbPosition > 0 ? mouseDelta / maxThumbPosition : 0;
            const panDelta = panDeltaRatio * scrollableWidth;

            // Update pan position
            this.panX = this.thumbDragStartPanX - panDelta;
        }

        // Apply the pan with clamping
        this.clampPanBoundaries();
        this.applyTransform();
        this.sendStateUpdate();
        this.updatePositionIndicator();
    }

    /**
     * Handle thumb mouseup - stop dragging
     * @param {MouseEvent} event - Mouse event
     */
    handleThumbMouseUp(event) {
        if (this.isThumbDragging) {
            event.preventDefault();
            
            this.isThumbDragging = false;
            this.thumbDragAxis = null;

            // Restore normal cursor and text selection
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            console.log('ZoomPanController: Thumb drag stopped');
        }
    }

    /**
     * Handle track click - jump to clicked position
     * @param {MouseEvent} event - Mouse event
     * @param {string} axis - 'vertical' or 'horizontal'
     */
    handleTrackClick(event, axis) {
        // Only handle left button
        if (event.button !== 0) {
            return;
        }

        // Don't handle if clicking on thumb (handled by thumb mousedown)
        if (event.target.classList.contains('position-indicator-thumb')) {
            return;
        }

        event.preventDefault();

        if (axis === 'vertical') {
            const indicator = this.positionIndicator;
            const indicatorRect = indicator.getBoundingClientRect();
            const clickY = event.clientY - indicatorRect.top;
            const indicatorHeight = indicator.clientHeight;

            // Calculate scrollable height
            const scale = this.zoomPercent / 100.0;
            const contentHeight = this.originalContentHeight || this.contentElement.scrollHeight;
            const scaledHeight = contentHeight * scale;
            const viewportHeight = window.innerHeight;
            const scrollableHeight = Math.max(0, scaledHeight - viewportHeight);

            if (scrollableHeight === 0) {
                return; // No scrolling needed
            }

            // Calculate thumb height
            const visibleRatio = Math.min(1, viewportHeight / scaledHeight);
            const thumbHeight = Math.max(20, indicatorHeight * visibleRatio);

            // Calculate desired thumb center position
            const desiredThumbCenter = clickY;
            const desiredThumbTop = Math.max(0, Math.min(indicatorHeight - thumbHeight, desiredThumbCenter - thumbHeight / 2));

            // Convert to pan position
            const maxThumbPosition = indicatorHeight - thumbHeight;
            const positionRatio = maxThumbPosition > 0 ? desiredThumbTop / maxThumbPosition : 0;
            this.panY = -positionRatio * scrollableHeight;

        } else if (axis === 'horizontal') {
            const indicator = this.positionIndicatorHorizontal;
            const indicatorRect = indicator.getBoundingClientRect();
            const clickX = event.clientX - indicatorRect.left;
            const indicatorWidth = indicator.clientWidth;

            // Calculate scrollable width
            const scale = this.zoomPercent / 100.0;
            const contentWidth = this.originalContentWidth || this.contentElement.scrollWidth;
            const scaledWidth = contentWidth * scale;
            const viewportWidth = window.innerWidth;
            const scrollableWidth = Math.max(0, scaledWidth - viewportWidth);

            if (scrollableWidth === 0) {
                return; // No scrolling needed
            }

            // Calculate thumb width
            const visibleRatio = Math.min(1, viewportWidth / scaledWidth);
            const thumbWidth = Math.max(20, indicatorWidth * visibleRatio);

            // Calculate desired thumb center position
            const desiredThumbCenter = clickX;
            const desiredThumbLeft = Math.max(0, Math.min(indicatorWidth - thumbWidth, desiredThumbCenter - thumbWidth / 2));

            // Convert to pan position
            const maxThumbPosition = indicatorWidth - thumbWidth;
            const positionRatio = maxThumbPosition > 0 ? desiredThumbLeft / maxThumbPosition : 0;
            this.panX = -positionRatio * scrollableWidth;
        }

        // Apply the pan with clamping
        this.clampPanBoundaries();
        this.applyTransform();
        this.sendStateUpdate();
        this.updatePositionIndicator();

        console.log(`ZoomPanController: Track clicked (${axis})`);
    }

    /**
     * Handle mouse down events for middle button drag
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        // Check for middle button (button = 1)
        if (event.button === 1) {
            event.preventDefault();
            this.isPanning = true;
            this.panStartX = event.clientX;
            this.panStartY = event.clientY;
            document.body.style.cursor = 'grabbing';
            console.log('ZoomPanController: Middle button pan started at', this.panStartX, this.panStartY);
        }
    }

    /**
     * Handle mouse move events for middle button drag
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        if (!this.isPanning) {
            return;
        }

        event.preventDefault();

        // Calculate delta from start position
        const deltaX = event.clientX - this.panStartX;
        const deltaY = event.clientY - this.panStartY;

        // Update start position for continuous dragging
        this.panStartX = event.clientX;
        this.panStartY = event.clientY;

        // Pan the content
        this.pan(deltaX, deltaY);
    }

    /**
     * Handle mouse up events for middle button drag
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        // Check for middle button release (button = 1)
        if (event.button === 1 && this.isPanning) {
            event.preventDefault();
            this.isPanning = false;
            document.body.style.cursor = 'default';
            console.log('ZoomPanController: Middle button pan stopped');
        }
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
        console.log(`WHEEL EVENT: ctrlKey=${event.ctrlKey}, shiftKey=${event.shiftKey}, deltaY=${event.deltaY}, deltaX=${event.deltaX}`);
        
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
            console.log(`SHIFT+WHEEL: Calling pan(${-event.deltaY}, 0)`);
            event.preventDefault();
            
            // Pan horizontally based on wheel direction
            const panDeltaX = -event.deltaY; // Use deltaY for horizontal pan
            
            this.pan(panDeltaX, 0);
        }
        // Normal wheel = vertical pan (since we disabled native scrolling)
        else {
            console.log(`NORMAL WHEEL: Calling pan(${-event.deltaX}, ${-event.deltaY})`);
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
                case 'fitToWidth':
                    this.fitToWidth();
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
        }5

        // Calculate zoom center point in viewport coordinates
        const centerX = cursorX || window.innerWidth / 2;
        const centerY = cursorY || window.innerHeight / 2;
        
        const oldScale = oldZoom / 100.0;
        const newScale = newZoom / 100.0;
        const scaleRatio = newScale / oldScale;
        
        // With center-origin transform, content scales from its center
        // Flexbox centering places content center at viewport center when pan=0
        // 
        // Point under cursor, offset from viewport center:
        const centerOffsetX = centerX - window.innerWidth / 2;
        const centerOffsetY = centerY - window.innerHeight / 2;
        
        // To keep cursor point fixed as we scale:
        // The point's position relative to content center scales, but we adjust pan
        this.panX = centerOffsetX - (centerOffsetX - this.panX) * scaleRatio;
        this.panY = centerOffsetY - (centerOffsetY - this.panY) * scaleRatio;
        
        this.zoomPercent = newZoom;

        // Clamp pan to boundaries
        this.clampPanBoundaries();

        // Apply transform and notify WPF
        this.applyTransform();
        this.sendStateUpdate();
        this.updatePositionIndicator();
        this.updateZoomIndicator();

        console.log(`Zoom state updated (2): ${this.zoomPercent}%, pan=(${this.panX}, ${this.panY})`);
    }


    /**
     * Pan the viewport by delta amounts
     * @param {number} deltaX - Horizontal delta in pixels
     * @param {number} deltaY - Vertical delta in pixels
     */
    pan(deltaX, deltaY) {
        console.log(`pan called: deltaX=${deltaX}, deltaY=${deltaY}`);
        this.panX += deltaX || 0;
        this.panY += deltaY || 0;
        console.log(`After pan: panX=${this.panX}, panY=${this.panY}`);

        // Clamp to boundaries
        console.log('About to call clampPanBoundaries');
        this.clampPanBoundaries();
        console.log('After clampPanBoundaries');

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
     * Fit content to viewport width
     */
    fitToWidth() {
        if (!this.contentElement) {
            return;
        }

        // Get the content's actual rendered width
        const contentWidth = this.contentElement.offsetWidth;
        const viewportWidth = window.innerWidth;

        // Calculate zoom percentage to fit width
        const newZoom = (viewportWidth / contentWidth) * 100.0;
        
        // Clamp to valid zoom range
        this.zoomPercent = Math.max(10, Math.min(1000, newZoom));
        
        // Reset pan to origin
        this.panX = 0.0;
        this.panY = 0.0;

        this.applyTransform();
        this.sendStateUpdate();
        this.updatePositionIndicator();
        this.updateZoomIndicator();

        console.log(`ZoomPanController: Fit to width - zoom=${this.zoomPercent}%`);
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

        // If restoring to default position (0,0), keep it at (0,0) since flex-start aligns to top
        // No adjustment needed - flex-start already positions content at top

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
        
        // Use center origin so scaling happens from content center
        // This works naturally with flexbox centering
        this.contentElement.style.transformOrigin = 'center center';
        this.contentElement.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${scale})`;

        // Performance hint for browser
        this.contentElement.style.willChange = 'transform';
    }

    /**
     * Clamp pan offsets to keep content visible within viewport boundaries
     */
    clampPanBoundaries() {
        console.log('clampPanBoundaries called');
        
        if (!this.contentElement) {
            console.log('No contentElement, returning');
            return;
        }

        const scale = this.zoomPercent / 100.0;
        
        // Use cached original dimensions
        const contentWidth = this.originalContentWidth || this.contentElement.scrollWidth;
        const contentHeight = this.originalContentHeight || this.contentElement.scrollHeight;

        console.log(`originalContentWidth=${this.originalContentWidth}, originalContentHeight=${this.originalContentHeight}`);
        console.log(`Using: contentWidth=${contentWidth}, contentHeight=${contentHeight}`);

        // Calculate scaled dimensions
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;

        // Viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        console.log(`Clamp: contentH=${contentHeight}, scaledH=${scaledHeight}, viewportH=${viewportHeight}, beforeClamp panY=${this.panY}`);

        // With center-origin transform, content center is at viewport center when pan=0
        // Content edges are at ±(scaledWidth/2) from center
        
        // Horizontal clamping (content is horizontally centered by align-items: center)
        if (scaledWidth <= viewportWidth) {
            // Content fits - keep it centered (panX=0)
            this.panX = 0;
        } else {
            // Content wider than viewport
            // With align-items: center, content center aligns with viewport center
            // Show left edge: panX = (scaledWidth - viewportWidth) / 2
            // Show right edge: panX = -(scaledWidth - viewportWidth) / 2
            const maxPanRight = (scaledWidth - viewportWidth) / 2;
            const maxPanLeft = -(scaledWidth - viewportWidth) / 2;
            
            this.panX = Math.max(maxPanLeft, Math.min(maxPanRight, this.panX));
        }
        
        // Vertical clamping (with flex-start alignment)
        if (scaledHeight <= viewportHeight) {
            // Content fits vertically - keep it at top (panY=0)
            console.log(`Content fits vertically - setting panY to 0`);
            this.panY = 0;
        } else {
            // Content taller than viewport
            // With flex-start: top of content starts at y=0 when panY=0
            // Showing top: panY = 0 (content top at viewport top)
            // Showing bottom: panY = -(scaledHeight - viewportHeight) (content bottom at viewport bottom)
            const maxPanUp = 0; // Top limit
            const maxPanDown = -(scaledHeight - viewportHeight); // Bottom limit
            
            console.log(`Content taller - maxUp=${maxPanUp}, maxDown=${maxPanDown}`);
            
            this.panY = Math.max(maxPanDown, Math.min(maxPanUp, this.panY));
            
            console.log(`After clamp: panY=${this.panY}`);
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
            console.log(`Zoom state updated (3): ${this.zoomPercent}%, pan=(${this.panX}, ${this.panY})`);
        }
    }
}

// Initialize controller when script loads
if (typeof window !== 'undefined') {
    window.zoomPanController = new ZoomPanController();
}

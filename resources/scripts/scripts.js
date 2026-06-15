document.addEventListener('DOMContentLoaded', function() {
    Components.init();

    Desktop.init();

    Widgets.init();

    Taskbar.init();

    WindowManager.init();

    StartMenu.init();
    ShutdownNotice.init();
});

const Desktop = {
    container: null,
    icons: [],
    storageKey: 'desktopIconPositions',
    iconSpacingX: 120,
    iconSpacingY: 110,
    init() {
        this.container = document.querySelector('.desktop');

        if (!this.container) {
            return;
        }

        this.icons = Array.from(this.container.querySelectorAll('.icon'));
        this.loadPositions();
        this.layoutIcons();
        window.addEventListener('resize', () => this.ensureIconsWithinBounds());
    },
    loadPositions() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.positions = stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load icon positions', error);
            this.positions = {};
        }
    },
    savePositions() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.positions));
        } catch (error) {
            console.warn('Failed to save icon positions', error);
        }
    },
    layoutIcons() {
        const containerHeight = this.container.clientHeight;
        const paddingTop = parseFloat(getComputedStyle(this.container).paddingTop) || 0;
        const paddingLeft = parseFloat(getComputedStyle(this.container).paddingLeft) || 0;
        const usableHeight = containerHeight - (parseFloat(getComputedStyle(this.container).paddingBottom) || 0) - paddingTop;
        const iconsPerColumn = Math.max(1, Math.floor(usableHeight / this.iconSpacingY));

        this.icons.forEach((icon, index) => {
            const id = icon.dataset.iconId || `icon-${index}`;
            icon.dataset.iconId = id;

            const storedPosition = this.positions[id];

            if (storedPosition) {
                this.applyPosition(icon, storedPosition.left, storedPosition.top);
            } else {
                const column = Math.floor(index / iconsPerColumn);
                const row = index % iconsPerColumn;
                const left = paddingLeft + column * this.iconSpacingX;
                const top = paddingTop + row * this.iconSpacingY;
                this.applyPosition(icon, left, top);
            }

            this.makeDraggable(icon);
        });
    },
    applyPosition(icon, left, top) {
        const clamped = this.getClampedPosition(icon, left, top);
        icon.style.left = `${clamped.left}px`;
        icon.style.top = `${clamped.top}px`;
    },
    getClampedPosition(icon, left, top) {
        const maxLeft = Math.max(0, this.container.clientWidth - icon.offsetWidth);
        const maxTop = Math.max(0, this.container.clientHeight - icon.offsetHeight);
        const clampedLeft = Math.min(Math.max(0, left), maxLeft);
        const clampedTop = Math.min(Math.max(0, top), maxTop);

        return { left: clampedLeft, top: clampedTop };
    },
    makeDraggable(icon) {
        if (icon.dataset.draggableBound) {
            return;
        }

        icon.dataset.draggableBound = 'true';

        const onPointerMove = event => {
            if (event.pointerId !== this.pointerId || !this.draggingIcon) {
                return;
            }

            const deltaX = event.clientX - this.dragStartX;
            const deltaY = event.clientY - this.dragStartY;

            if (!this.iconIsDragging) {
                if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) {
                    return;
                }

                this.iconIsDragging = true;
                this.draggingIcon.classList.add('is-dragging');
            }

            const targetLeft = this.iconStartLeft + deltaX;
            const targetTop = this.iconStartTop + deltaY;
            this.applyPosition(this.draggingIcon, targetLeft, targetTop);
        };

        const stopDragging = () => {
            if (!this.draggingIcon) {
                return;
            }

            if (this.iconIsDragging) {
                const id = this.draggingIcon.dataset.iconId;
                const left = parseFloat(this.draggingIcon.style.left) || 0;
                const top = parseFloat(this.draggingIcon.style.top) || 0;
                this.positions[id] = { left, top };
                this.savePositions();

                this.draggingIcon.dataset.wasDragged = 'true';
                setTimeout(() => {
                    delete this.draggingIcon.dataset.wasDragged;
                }, 100);
            }

            this.draggingIcon.classList.remove('is-dragging');
            this.draggingIcon = null;
            this.iconIsDragging = false;
            this.pointerId = null;

            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', stopDragging);
            document.removeEventListener('pointercancel', stopDragging);
        };

        icon.addEventListener('pointerdown', event => {
            if (event.button !== 0) {
                return;
            }

            event.preventDefault();

            const rect = icon.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();

            this.pointerId = event.pointerId;
            this.dragStartX = event.clientX;
            this.dragStartY = event.clientY;
            this.iconStartLeft = rect.left - containerRect.left;
            this.iconStartTop = rect.top - containerRect.top;
            this.draggingIcon = icon;
            this.iconIsDragging = false;

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', stopDragging);
            document.addEventListener('pointercancel', stopDragging);
        });

        icon.addEventListener('click', event => {
            if (icon.dataset.wasDragged === 'true') {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
    },
    ensureIconsWithinBounds() {
        this.icons.forEach(icon => {
            const left = parseFloat(icon.style.left) || 0;
            const top = parseFloat(icon.style.top) || 0;
            const clamped = this.getClampedPosition(icon, left, top);
            icon.style.left = `${clamped.left}px`;
            icon.style.top = `${clamped.top}px`;
            const id = icon.dataset.iconId;
            this.positions[id] = clamped;
        });

        this.savePositions();
    }
};

const WindowManager = {
    zIndex: 100,
    cascadeIndex: 0,
    windowCounter: 0,
    init() {
        document.querySelectorAll('.window').forEach(win => this.registerWindow(win));

        document.addEventListener('mousedown', event => {
            const win = event.target.closest('.window');

            if (win) {
                this.bringToFront(win);
            }
        });

        window.addEventListener('resize', () => {
            this.keepAllWindowsInBounds();
        });
    },
    registerWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        if (!windowEl.dataset.windowId) {
            this.windowCounter += 1;
            windowEl.dataset.windowId = `window-${this.windowCounter}`;
        }

        const titleEl = windowEl.querySelector('.window-header-title');
        const titleText = windowEl.dataset.appTitle || (titleEl ? titleEl.textContent.trim() : 'Window');
        windowEl.dataset.appTitle = titleText;
        windowEl.dataset.appIcon = windowEl.dataset.appIcon || '';

        windowEl.dataset.minimized = 'false';
        windowEl.classList.remove('is-minimized');

        if (!windowEl.dataset.positioned) {
            const offset = (this.cascadeIndex++ % 5) * 24;
            this.positionWindow(windowEl, 120 + offset, 80 + offset);
            windowEl.dataset.positioned = 'true';
        }

        this.ensureWindowDimensions(windowEl);
        this.makeDraggable(windowEl);
        this.makeResizable(windowEl);
        Taskbar.registerWindow(windowEl);
        this.bringToFront(windowEl);
    },
    unregisterWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        Taskbar.removeWindow(windowEl);
    },
    bringToFront(windowEl) {
        this.zIndex += 1;
        windowEl.style.zIndex = this.zIndex;

        document.querySelectorAll('.window').forEach(win => {
            const shouldBeActive = win === windowEl && win.dataset.minimized !== 'true';
            win.classList.toggle('is-active', shouldBeActive);
            Taskbar.updateWindow(win);
        });
    },
    makeDraggable(windowEl) {
        const header = windowEl.querySelector('.window-header');

        if (!header || header.dataset.draggableBound) {
            return;
        }

        header.dataset.draggableBound = 'true';

        let pointerId = null;

        const onPointerMove = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            const dragStartX = parseFloat(header.dataset.dragStartX || '0');
            const dragStartY = parseFloat(header.dataset.dragStartY || '0');
            const windowStartLeft = parseFloat(header.dataset.windowStartLeft || '0');
            const windowStartTop = parseFloat(header.dataset.windowStartTop || '0');

            const deltaX = event.clientX - dragStartX;
            const deltaY = event.clientY - dragStartY;
            const targetLeft = windowStartLeft + deltaX;
            const targetTop = windowStartTop + deltaY;

            this.positionWindow(windowEl, targetLeft, targetTop);
        };

        const onPointerUp = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            pointerId = null;
            windowEl.classList.remove('is-dragging');
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };

        header.addEventListener('pointerdown', event => {
            if (event.button !== 0) {
                return;
            }

            if (event.target.closest('.window-controls')) {
                return;
            }

            event.preventDefault();
            this.bringToFront(windowEl);

            if (windowEl.dataset.maximized === 'true') {
                this.setMaximized(windowEl, false);
            }

            const rect = windowEl.getBoundingClientRect();
            header.dataset.dragStartX = event.clientX;
            header.dataset.dragStartY = event.clientY;
            header.dataset.windowStartLeft = rect.left;
            header.dataset.windowStartTop = rect.top;

            pointerId = event.pointerId;

            windowEl.classList.add('is-dragging');

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        });
    },
    makeResizable(windowEl) {
        if (windowEl.dataset.resizableBound) {
            return;
        }

        windowEl.dataset.resizableBound = 'true';

        const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        const handles = directions.map(direction => {
            const handle = document.createElement('div');
            handle.className = `window-resize-handle window-resize-handle--${direction}`;
            handle.dataset.direction = direction;
            windowEl.appendChild(handle);
            return handle;
        });

        let pointerId = null;
        let activeDirection = null;
        let startX = 0;
        let startY = 0;
        let startRect = null;

        const stopResizing = () => {
            pointerId = null;
            activeDirection = null;
            startRect = null;
            windowEl.classList.remove('is-resizing');
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };

        const onPointerMove = event => {
            if (event.pointerId !== pointerId || !startRect || !activeDirection) {
                return;
            }

            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;

            this.resizeWindowFromRect(windowEl, activeDirection, startRect, deltaX, deltaY);
        };

        const onPointerUp = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            stopResizing();
        };

        handles.forEach(handle => {
            handle.addEventListener('pointerdown', event => {
                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();
                this.bringToFront(windowEl);

                if (windowEl.dataset.maximized === 'true') {
                    this.setMaximized(windowEl, false);
                }

                pointerId = event.pointerId;
                activeDirection = handle.dataset.direction || '';
                startX = event.clientX;
                startY = event.clientY;

                const rect = windowEl.getBoundingClientRect();
                startRect = {
                    width: rect.width,
                    height: rect.height,
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom
                };

                windowEl.classList.add('is-resizing');

                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
                document.addEventListener('pointercancel', onPointerUp);
            });
        });
    },
    toggleMinimizeWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        if (windowEl.dataset.minimized === 'true') {
            this.showWindow(windowEl);
        } else {
            this.minimizeWindow(windowEl);
        }
    },
    minimizeWindow(windowEl) {
        if (!windowEl || windowEl.dataset.minimized === 'true') {
            return;
        }

        windowEl.dataset.minimized = 'true';
        windowEl.classList.add('is-minimized');
        windowEl.classList.remove('is-active');

        Taskbar.updateWindow(windowEl);
    },
    showWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        windowEl.dataset.minimized = 'false';
        windowEl.classList.remove('is-minimized');

        if (windowEl.dataset.maximized === 'true') {
            this.applyMaximizedBounds(windowEl);
        } else {
            this.keepWindowInBounds(windowEl);
        }

        this.bringToFront(windowEl);
        Taskbar.updateWindow(windowEl);
    },
    toggleMaximizeWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        if (windowEl.dataset.minimized === 'true') {
            this.showWindow(windowEl);
        }

        const shouldMaximize = windowEl.dataset.maximized === 'true' ? false : true;
        this.setMaximized(windowEl, shouldMaximize);
    },
    setMaximized(windowEl, shouldMaximize) {
        if (!windowEl) {
            return;
        }

        if (shouldMaximize) {
            if (windowEl.dataset.maximized === 'true') {
                this.applyMaximizedBounds(windowEl);
                return;
            }

            const rect = windowEl.getBoundingClientRect();
            windowEl.dataset.restoreLeft = rect.left;
            windowEl.dataset.restoreTop = rect.top;
            windowEl.dataset.restoreWidth = rect.width;
            windowEl.dataset.restoreHeight = rect.height;

            windowEl.dataset.maximized = 'true';
            windowEl.classList.add('is-maximized');
            this.applyMaximizedBounds(windowEl);
            this.bringToFront(windowEl);
        } else {
            if (windowEl.dataset.maximized !== 'true') {
                return;
            }

            const restoreLeft = parseFloat(windowEl.dataset.restoreLeft || windowEl.style.left || '0');
            const restoreTop = parseFloat(windowEl.dataset.restoreTop || windowEl.style.top || '0');
            const restoreWidth = parseFloat(windowEl.dataset.restoreWidth || windowEl.offsetWidth || '0');
            const restoreHeight = parseFloat(windowEl.dataset.restoreHeight || windowEl.offsetHeight || '0');

            windowEl.dataset.maximized = 'false';
            windowEl.classList.remove('is-maximized');

            windowEl.style.width = `${restoreWidth}px`;
            windowEl.style.height = `${restoreHeight}px`;
            this.positionWindow(windowEl, restoreLeft, restoreTop);
            this.bringToFront(windowEl);

            delete windowEl.dataset.restoreLeft;
            delete windowEl.dataset.restoreTop;
            delete windowEl.dataset.restoreWidth;
            delete windowEl.dataset.restoreHeight;
        }

        Taskbar.updateWindow(windowEl);
    },
    applyMaximizedBounds(windowEl) {
        if (!windowEl) {
            return;
        }

        const bounds = this.getViewportBounds();
        windowEl.style.left = '0px';
        windowEl.style.top = '0px';
        windowEl.style.width = `${bounds.width}px`;
        windowEl.style.height = `${bounds.height}px`;
    },
    keepWindowInBounds(windowEl) {
        if (!windowEl) {
            return;
        }

        const rect = windowEl.getBoundingClientRect();
        this.positionWindow(windowEl, rect.left, rect.top);
    },
    keepAllWindowsInBounds() {
        document.querySelectorAll('.window').forEach(win => {
            if (win.dataset.maximized === 'true') {
                this.applyMaximizedBounds(win);
            } else if (win.dataset.minimized !== 'true') {
                this.keepWindowInBounds(win);
            }
        });
    },
    resizeWindowFromRect(windowEl, direction, rect, deltaX, deltaY) {
        const computed = window.getComputedStyle(windowEl);
        const minWidth = parseFloat(computed.minWidth) || 200;
        const minHeight = parseFloat(computed.minHeight) || 160;
        const bounds = this.getViewportBounds();

        let newLeft = rect.left;
        let newTop = rect.top;
        let newWidth = rect.width;
        let newHeight = rect.height;

        if (direction.includes('e')) {
            let newRight = rect.right + deltaX;
            newRight = Math.min(newRight, bounds.width);
            newWidth = Math.max(minWidth, newRight - rect.left);
        }

        if (direction.includes('s')) {
            let newBottom = rect.bottom + deltaY;
            newBottom = Math.min(newBottom, bounds.height);
            newHeight = Math.max(minHeight, newBottom - rect.top);
        }

        if (direction.includes('w')) {
            let proposedLeft = rect.left + deltaX;
            const maxLeft = rect.right - minWidth;
            proposedLeft = Math.min(proposedLeft, maxLeft);
            proposedLeft = Math.max(0, proposedLeft);
            newLeft = proposedLeft;
            newWidth = Math.max(minWidth, rect.right - newLeft);
        }

        if (direction.includes('n')) {
            let proposedTop = rect.top + deltaY;
            const maxTop = rect.bottom - minHeight;
            proposedTop = Math.min(proposedTop, maxTop);
            proposedTop = Math.max(0, proposedTop);
            newTop = proposedTop;
            newHeight = Math.max(minHeight, rect.bottom - newTop);
        }

        const maxLeft = Math.max(0, bounds.width - newWidth);
        newLeft = Math.min(newLeft, maxLeft);

        const maxTop = Math.max(0, bounds.height - newHeight);
        newTop = Math.min(newTop, maxTop);

        windowEl.style.left = `${newLeft}px`;
        windowEl.style.top = `${newTop}px`;
        windowEl.style.width = `${newWidth}px`;
        windowEl.style.height = `${newHeight}px`;
    },
    ensureWindowDimensions(windowEl) {
        if (windowEl.dataset.sizeInitialized) {
            return;
        }

        const rect = windowEl.getBoundingClientRect();
        windowEl.style.width = `${rect.width}px`;
        windowEl.style.height = `${rect.height}px`;
        windowEl.dataset.sizeInitialized = 'true';
    },
    getViewportBounds() {
        const taskbar = document.querySelector('.start-menu');
        const taskbarHeight = taskbar ? taskbar.offsetHeight : 0;

        return {
            width: window.innerWidth,
            height: window.innerHeight - taskbarHeight
        };
    },
    positionWindow(windowEl, left, top) {
        const bounds = this.getViewportBounds();
        const maxLeft = Math.max(0, bounds.width - windowEl.offsetWidth);
        const maxTop = Math.max(0, bounds.height - windowEl.offsetHeight);
        const clampedLeft = Math.min(Math.max(0, left), maxLeft);
        const clampedTop = Math.min(Math.max(0, top), maxTop);

        windowEl.style.left = `${clampedLeft}px`;
        windowEl.style.top = `${clampedTop}px`;
    }
};

const Taskbar = {
    container: null,
    init() {
        this.container = document.getElementById('taskbar-apps');
    },
    registerWindow(windowEl) {
        if (!this.container || !windowEl) {
            return;
        }

        const windowId = windowEl.dataset.windowId;

        if (!windowId) {
            return;
        }

        if (this.container.querySelector(`[data-window-target="${windowId}"]`)) {
            this.updateWindow(windowEl);
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'taskbar-item';
        button.dataset.windowTarget = windowId;

        button.addEventListener('click', () => this.toggleWindow(windowId));

        this.container.appendChild(button);
        this.renderButtonContent(button, windowEl);
        this.updateWindow(windowEl);
    },
    removeWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        this.removeWindowById(windowEl.dataset.windowId);
    },
    removeWindowById(windowId) {
        if (!this.container || !windowId) {
            return;
        }

        const button = this.container.querySelector(`[data-window-target="${windowId}"]`);

        if (button) {
            button.remove();
        }
    },
    updateWindow(windowEl) {
        if (!this.container || !windowEl) {
            return;
        }

        const windowId = windowEl.dataset.windowId;

        if (!windowId) {
            return;
        }

        const button = this.container.querySelector(`[data-window-target="${windowId}"]`);

        if (!button) {
            return;
        }

        this.renderButtonContent(button, windowEl);

        const isActive = windowEl.classList.contains('is-active');
        const isMinimized = windowEl.dataset.minimized === 'true';

        button.classList.toggle('is-active', isActive);
        button.classList.toggle('is-minimized', isMinimized);
    },
    toggleWindow(windowId) {
        if (!windowId) {
            return;
        }

        const windowEl = document.querySelector(`.window[data-window-id="${windowId}"]`);

        if (!windowEl) {
            this.removeWindowById(windowId);
            return;
        }

        if (windowEl.dataset.minimized === 'true') {
            WindowManager.showWindow(windowEl);
        } else if (windowEl.classList.contains('is-active')) {
            WindowManager.minimizeWindow(windowEl);
        } else {
            WindowManager.showWindow(windowEl);
        }
    },
    renderButtonContent(button, windowEl) {
        const title = windowEl.dataset.appTitle || 'Window';
        const iconHtml = windowEl.dataset.appIcon || '';

        button.title = title;
        button.innerHTML = '';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'taskbar-item-icon';

        if (iconHtml) {
            iconSpan.innerHTML = iconHtml;
        } else {
            iconSpan.textContent = '•';
        }

        const labelSpan = document.createElement('span');
        labelSpan.className = 'taskbar-item-label';
        labelSpan.textContent = title;

        button.appendChild(iconSpan);
        button.appendChild(labelSpan);
    }
};

const StartMenu = {
    panel: null,
    button: null,
    init() {
        this.panel = document.getElementById('start-panel');
        this.button = document.querySelector('.start-menu .btn');

        if (this.panel) {
            this.panel.addEventListener('click', event => {
                const actionButton = event.target.closest('[data-action]');

                if (!actionButton) {
                    return;
                }

                event.preventDefault();
                const action = actionButton.dataset.action;
                this.close();

                if (action) {
                    try {
                        new Function(action)();
                    } catch (error) {
                        console.error('Start menu action failed:', error);
                    }
                }
            });
        }

        document.addEventListener('mousedown', event => {
            if (!this.panel || !this.panel.classList.contains('is-open')) {
                return;
            }

            const clickInsidePanel = this.panel.contains(event.target);
            const clickStartButton = this.button && this.button.contains(event.target);

            if (!clickInsidePanel && !clickStartButton) {
                this.close();
            }
        });
    },
    toggle() {
        if (!this.panel) {
            return;
        }

        if (this.panel.classList.contains('is-open')) {
            this.close();
        } else {
            this.open();
        }
    },
    open() {
        if (!this.panel) {
            return;
        }

        this.panel.classList.add('is-open');
        this.panel.setAttribute('aria-hidden', 'false');

        if (this.button) {
            this.button.classList.add('is-active');
        }
    },
    close() {
        if (!this.panel) {
            return;
        }

        this.panel.classList.remove('is-open');
        this.panel.setAttribute('aria-hidden', 'true');

        if (this.button) {
            this.button.classList.remove('is-active');
        }
    }
};

const ShutdownNotice = {
    overlay: null,
    init() {
        this.overlay = document.getElementById('shutdown-notice');

        if (!this.overlay) {
            return;
        }

        const dismissButton = this.overlay.querySelector('[data-shutdown-dismiss]');

        if (dismissButton) {
            dismissButton.addEventListener('click', () => this.hide());
        }

        this.overlay.addEventListener('click', event => {
            if (event.target === this.overlay) {
                this.hide();
            }
        });
    },
    show() {
        if (!this.overlay) {
            return;
        }

        this.overlay.classList.add('is-visible');
        this.overlay.setAttribute('aria-hidden', 'false');
    },
    hide() {
        if (!this.overlay) {
            return;
        }

        this.overlay.classList.remove('is-visible');
        this.overlay.setAttribute('aria-hidden', 'true');
    }
};

function closeModal(event) {
    const windowEl = event.target.closest('.window');

    if (!windowEl) {
        return;
    }

    WindowManager.unregisterWindow(windowEl);
    windowEl.remove();
}

function minimizeWindow(event) {
    const windowEl = event.target.closest('.window');

    if (!windowEl) {
        return;
    }

    WindowManager.minimizeWindow(windowEl);
}

function toggleMaximizeWindow(event) {
    const windowEl = event.target.closest('.window');

    if (!windowEl) {
        return;
    }

    WindowManager.toggleMaximizeWindow(windowEl);
}

function start() {
    StartMenu.toggle();
}

function turnOff() {
    StartMenu.close();
    ShutdownNotice.show();
}

// App system
const Apps = {
    _openApp(iframeUrl, appTitle, width, height, iconHtml, appKey) {
        const key = appKey || appTitle;

        if (key) {
            const existingWindow = document.querySelector(`.window[data-app-key="${key}"]`);

            if (existingWindow) {
                WindowManager.showWindow(existingWindow);
                WindowManager.bringToFront(existingWindow);

                return;
            }
        }
        const templateElement = document.getElementById('window-tpl');

        if (!templateElement || templateElement.tagName !== 'TEMPLATE') {
            console.error('Window template element (#window-tpl) not found or is not a <template> tag.');
            return;
        }

        // Clone the template's content
        const clonedFragment = templateElement.content.cloneNode(true);

        // Find the main window element from the cloned fragment
        const windowEl = clonedFragment.querySelector('.window'); // This is the <div id="window-tpl" class="window">

        if (!windowEl) {
            console.error('#window-tpl element not found within the cloned template content.');
            return;
        }

        // windowEl.style.display = 'block';

        const windowBody = windowEl.querySelector('.window-body');

        if (!windowBody) {
            console.error('.window-body not found within the #window-tpl element.');

            return;
        }

        const appTitleEl = windowEl.querySelector('.window-header-title');

        if (appTitleEl) {
            appTitleEl.textContent = appTitle;
        }

        windowEl.dataset.appTitle = appTitle;
        windowEl.dataset.appIcon = iconHtml || windowEl.dataset.appIcon || '';

        if (key) {
            windowEl.dataset.appKey = key;
        }

        // Create the iframe
        const iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.setAttribute('title', appTitle);

        // Replace the {{content}} placeholder with the iframe
        windowBody.innerHTML = ''; // Clear "{{content}}"
        windowBody.appendChild(iframe);

        document.body.appendChild(windowEl);

        const computed = window.getComputedStyle(windowEl);
        const minWidth = parseFloat(computed.minWidth) || 280;
        const minHeight = parseFloat(computed.minHeight) || 220;
        windowEl.style.width = `${Math.max(width, minWidth)}px`;
        windowEl.style.height = `${Math.max(height, minHeight)}px`;

        Components.init(windowEl);

        WindowManager.registerWindow(windowEl);
    },
    OutOfGas() {
        Apps._openApp('./out-of-gas/index.html', 'Out Of Gas', 960, 600, "<img src='./resources/oug.png' alt='' />", 'OutOfGas');
    },
    AboutMe() {
        Apps._openApp('./about.html', 'About Me', 800, 600, "<i class='bi bi-file-earmark-person'></i>", 'AboutMe');
    },
    MovaNova() {
        Apps._openApp('./_site/movanova/index.html', 'Mova Nova', 800, 800, "<i class='bi bi-translate'></i>", 'MovaNova');
    },
    Weather() {
        Apps._openApp('./weather/index.html', 'Weather', 1000, 800, "<i class='bi bi-cloud-sun'></i>", 'Weather');
    },
    WhiteBG() {
        if (confirm('Open White BG? Used for film scanning.')) {
            location.href = './white.html';
        }
    },
    MusVis() {
        Apps._openApp('./_site/musvis/index.html', 'Music Visualizer', 1000, 800, "<i class='bi bi-music-note-beamed'></i>", 'MusVis');
    }
};

function openApp(appName) {
    if (Apps && typeof Apps[appName] === 'function') {
        Apps[appName]();
    } else {
        console.error(`App "${appName}" not found or is not a function.`);
        alert(`Error: App "${appName}" could not be loaded.`);
    }
}

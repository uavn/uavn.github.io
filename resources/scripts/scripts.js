document.addEventListener('DOMContentLoaded', function() {
    Components.init();

    Widgets.init();

    WindowManager.init();

    StartMenu.init();
    ShutdownNotice.init();
});

const WindowManager = {
    zIndex: 100,
    cascadeIndex: 0,
    init() {
        document.querySelectorAll('.window').forEach(win => this.registerWindow(win));

        document.addEventListener('mousedown', event => {
            const win = event.target.closest('.window');

            if (win) {
                this.bringToFront(win);
            }
        });
    },
    registerWindow(windowEl) {
        if (!windowEl) {
            return;
        }

        if (!windowEl.dataset.positioned) {
            const offset = (this.cascadeIndex++ % 5) * 24;
            this.positionWindow(windowEl, 120 + offset, 80 + offset);
            windowEl.dataset.positioned = 'true';
        }

        this.makeDraggable(windowEl);
        this.bringToFront(windowEl);
    },
    bringToFront(windowEl) {
        this.zIndex += 1;
        windowEl.style.zIndex = this.zIndex;

        document.querySelectorAll('.window').forEach(win => {
            win.classList.toggle('is-active', win === windowEl);
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

            event.preventDefault();
            this.bringToFront(windowEl);

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
    positionWindow(windowEl, left, top) {
        const taskbar = document.querySelector('.start-menu');
        const taskbarHeight = taskbar ? taskbar.offsetHeight : 0;
        const maxLeft = Math.max(0, window.innerWidth - windowEl.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - taskbarHeight - windowEl.offsetHeight);
        const clampedLeft = Math.min(Math.max(0, left), maxLeft);
        const clampedTop = Math.min(Math.max(0, top), maxTop);

        windowEl.style.left = `${clampedLeft}px`;
        windowEl.style.top = `${clampedTop}px`;
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
    event.target.closest('.window').remove();
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
    _openApp(iframeUrl, appTitle, width, height) {
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

        windowBody.style.width = `${width}px`;
        windowBody.style.height = `${height}px`;

        document.body.appendChild(windowEl);

        Components.init(windowEl);

        WindowManager.registerWindow(windowEl);
    },
    OutOfGas() {
        Apps._openApp('./out-of-gas/index.html', 'Out Of Gas', 960, 600);
    },
    AboutMe() {
        Apps._openApp('./about.html', 'About Me', 800, 600);
    },
    MovaNova() {
        Apps._openApp('./movanova/index.html', 'About Me', 800, 600);
    },
    WhiteBG() {
        if (confirm('Open White BG? Used for film scanning.')) {
            location.href = './white.html';
        }
    },
};

function openApp(appName) {
    if (Apps && typeof Apps[appName] === 'function') {
        Apps[appName]();
    } else {
        console.error(`App "${appName}" not found or is not a function.`);
        alert(`Error: App "${appName}" could not be loaded.`);
    }
}

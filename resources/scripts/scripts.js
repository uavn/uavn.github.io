document.addEventListener('DOMContentLoaded', function() {
    Settings.init();
    WindowManager.init();
    Dock.init();
    Launchpad.init();
    MenuBar.init();
    Widgets.init();

    openAppFromHash();
});

// Every app on the desktop. `dock: true` pins it to the dock; everything is in the launchpad.
const AppRegistry = [
    { key: 'Photos', title: 'Photos', url: './photos/index.html', width: 1180, height: 780, icon: 'bi-camera', colors: ['#ffb340', '#ff375f'], dock: true },
    { key: 'AboutMe', title: 'About Me', url: './about.html', width: 820, height: 640, icon: 'bi-person-fill', colors: ['#5ac8fa', '#0a64d6'], dock: true },
    { key: 'NinetyPines', title: 'Ninety Pines', url: './ninety-pines/index.html', width: 900, height: 700, icon: 'bi-tree-fill', colors: ['#3a7d44', '#163b22'], dock: true },
    { key: 'OutOfGas', title: 'Out Of Gas', url: './out-of-gas/index.html', width: 960, height: 600, image: './resources/oug.png', colors: ['#2c2c2e', '#000000'], dock: true },
    { key: 'UnicornNoir', title: 'Unicorn Noir', url: './unicorn-noir/index.html', width: 900, height: 660, icon: 'bi-rainbow', colors: ['#bf5af2', '#3a0ca3'], dock: true },
    { key: 'MedievalDrift', title: 'Medieval Drift', url: './medieval-drift/index.html', width: 840, height: 700, icon: 'bi-tornado', colors: ['#d4a373', '#7f5539'], dock: true },
    { key: 'MovaNova', title: 'Mova Nova', url: './movanova/index.html', width: 800, height: 800, icon: 'bi-translate', colors: ['#ffd60a', '#0057b7'], dock: true },
    { key: 'Weather', title: 'Weather', url: './weather/index.html', width: 1000, height: 800, icon: 'bi-cloud-sun-fill', colors: ['#64d2ff', '#0a84ff'], dock: true },
    { key: 'MusVis', title: 'Music Visualizer', url: './musvis/index.html', width: 1000, height: 800, icon: 'bi-music-note-beamed', colors: ['#ff6482', '#c41e3a'], dock: true },
    { key: 'MapVis', title: 'Route Animator', url: './mapvis/index.html', width: 1100, height: 800, icon: 'bi-map-fill', colors: ['#34c759', '#0c8a5e'], dock: true },
    { key: 'TabStash', title: 'TabStash', url: './tab-stash/index.html', width: 900, height: 700, icon: 'bi-window-stack', colors: ['#8e8e93', '#3a3a3c'], dock: true }
];

function appIconHtml(app) {
    const style = `--c1: ${app.colors[0]}; --c2: ${app.colors[1]}`;
    const glyph = app.image
        ? `<img src="${app.image}" alt="" />`
        : `<i class="bi ${app.icon}"></i>`;

    return `<span class="app-icon" style="${style}">${glyph}</span>`;
}

const WindowManager = {
    zIndex: 100,
    cascadeIndex: 0,
    windowCounter: 0,
    layer: null,
    init() {
        this.layer = document.getElementById('window-layer');

        document.addEventListener('pointerdown', event => {
            const win = event.target.closest('.window');

            if (win) {
                this.bringToFront(win);
            }
        });

        window.addEventListener('resize', () => this.keepAllWindowsInBounds());
    },
    isCompact() {
        return window.innerWidth <= 700;
    },
    create({ key, title, iconHtml, width, height, content }) {
        const template = document.getElementById('window-tpl');
        const windowEl = template.content.firstElementChild.cloneNode(true);
        const body = windowEl.querySelector('.window-body');

        this.windowCounter += 1;
        windowEl.dataset.windowId = `window-${this.windowCounter}`;
        windowEl.dataset.appKey = key;
        windowEl.dataset.appTitle = title;
        windowEl.dataset.appIcon = iconHtml || '';
        windowEl.setAttribute('aria-label', title);
        windowEl.querySelector('.window-header-title').textContent = title;

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content) {
            body.appendChild(content);
        }

        windowEl.querySelector('.window-controls').addEventListener('click', event => {
            const control = event.target.closest('[data-window-action]');

            if (!control) {
                return;
            }

            const action = control.dataset.windowAction;

            if (action === 'close') {
                this.close(windowEl);
            } else if (action === 'minimize') {
                this.minimizeWindow(windowEl);
            } else if (action === 'maximize') {
                this.toggleMaximizeWindow(windowEl);
            }
        });

        windowEl.querySelector('.window-header').addEventListener('dblclick', event => {
            if (!event.target.closest('.window-controls')) {
                this.toggleMaximizeWindow(windowEl);
            }
        });

        this.layer.appendChild(windowEl);

        const bounds = this.getViewportBounds();
        const w = Math.min(width, bounds.width - 40);
        const h = Math.min(height, bounds.height - 40);
        windowEl.style.width = `${w}px`;
        windowEl.style.height = `${h}px`;

        // Cascade new windows around the centre of the free area.
        const offset = (this.cascadeIndex++ % 6) * 26;
        const left = (bounds.width - w) / 2 - 60 + offset;
        const top = bounds.top + Math.max(10, (bounds.height - h) / 2 - 40) + offset;
        this.positionWindow(windowEl, left, top);

        this.makeDraggable(windowEl);
        this.makeResizable(windowEl);

        if (this.isCompact()) {
            this.setMaximized(windowEl, true);
        }

        this.bringToFront(windowEl);

        return windowEl;
    },
    find(key) {
        return document.querySelector(`.window[data-app-key="${key}"]`);
    },
    all() {
        return Array.from(document.querySelectorAll('.window'));
    },
    close(windowEl) {
        windowEl.remove();
        this.activateTopmost();
    },
    closeAll() {
        this.all().forEach(win => win.remove());
        this.activateTopmost();
    },
    activateTopmost() {
        const visible = this.all()
            .filter(win => win.dataset.minimized !== 'true')
            .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex));

        if (visible[0]) {
            this.bringToFront(visible[0]);
        } else {
            this.all().forEach(win => win.classList.remove('is-active'));
            this.notify();
        }
    },
    bringToFront(windowEl) {
        this.zIndex += 1;
        windowEl.style.zIndex = this.zIndex;

        this.all().forEach(win => {
            win.classList.toggle('is-active', win === windowEl && win.dataset.minimized !== 'true');
        });

        this.notify();
    },
    // Lets the dock and the menu bar follow window state.
    notify() {
        const active = document.querySelector('.window.is-active');
        document.dispatchEvent(new CustomEvent('windows:change', {
            detail: { active: active ? active.dataset.appTitle : null }
        }));
    },
    startInteraction() {
        document.body.classList.add('is-interacting');
    },
    endInteraction() {
        document.body.classList.remove('is-interacting');
    },
    makeDraggable(windowEl) {
        const header = windowEl.querySelector('.window-header');
        let pointerId = null;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        const onPointerMove = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            this.positionWindow(windowEl, startLeft + event.clientX - startX, startTop + event.clientY - startY);
        };

        const onPointerUp = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            pointerId = null;
            this.endInteraction();
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };

        header.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest('.window-controls')) {
                return;
            }

            if (windowEl.dataset.maximized === 'true') {
                return;
            }

            event.preventDefault();

            const rect = windowEl.getBoundingClientRect();
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            startLeft = rect.left;
            startTop = rect.top;

            this.startInteraction();
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        });
    },
    makeResizable(windowEl) {
        const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        let pointerId = null;
        let direction = '';
        let startX = 0;
        let startY = 0;
        let startRect = null;

        const onPointerMove = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            this.resizeWindowFromRect(windowEl, direction, startRect, event.clientX - startX, event.clientY - startY);
        };

        const onPointerUp = event => {
            if (event.pointerId !== pointerId) {
                return;
            }

            pointerId = null;
            this.endInteraction();
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };

        directions.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `window-resize-handle window-resize-handle--${dir}`;
            windowEl.appendChild(handle);

            handle.addEventListener('pointerdown', event => {
                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();
                this.bringToFront(windowEl);

                const rect = windowEl.getBoundingClientRect();
                pointerId = event.pointerId;
                direction = dir;
                startX = event.clientX;
                startY = event.clientY;
                startRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };

                this.startInteraction();
                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
                document.addEventListener('pointercancel', onPointerUp);
            });
        });
    },
    minimizeWindow(windowEl) {
        windowEl.dataset.minimized = 'true';
        windowEl.classList.add('is-minimized');
        windowEl.classList.remove('is-active');
        this.activateTopmost();
    },
    showWindow(windowEl) {
        windowEl.dataset.minimized = 'false';
        windowEl.classList.remove('is-minimized');

        if (windowEl.dataset.maximized === 'true') {
            this.applyMaximizedBounds(windowEl);
        } else {
            this.keepWindowInBounds(windowEl);
        }

        this.bringToFront(windowEl);
    },
    toggleMaximizeWindow(windowEl) {
        this.setMaximized(windowEl, windowEl.dataset.maximized !== 'true');
    },
    setMaximized(windowEl, shouldMaximize) {
        if (shouldMaximize) {
            const rect = windowEl.getBoundingClientRect();
            windowEl.dataset.restore = JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
            windowEl.dataset.maximized = 'true';
            windowEl.classList.add('is-maximized');
            this.applyMaximizedBounds(windowEl);
        } else {
            const restore = JSON.parse(windowEl.dataset.restore || '{}');
            windowEl.dataset.maximized = 'false';
            windowEl.classList.remove('is-maximized');

            if (restore.width) {
                windowEl.style.width = `${restore.width}px`;
                windowEl.style.height = `${restore.height}px`;
                this.positionWindow(windowEl, restore.left, restore.top);
            }
        }
    },
    applyMaximizedBounds(windowEl) {
        const bounds = this.getViewportBounds();
        windowEl.style.left = '0px';
        windowEl.style.top = `${bounds.top}px`;
        windowEl.style.width = `${bounds.width}px`;
        windowEl.style.height = `${bounds.height}px`;
    },
    keepWindowInBounds(windowEl) {
        const rect = windowEl.getBoundingClientRect();
        this.positionWindow(windowEl, rect.left, rect.top);
    },
    keepAllWindowsInBounds() {
        this.all().forEach(win => {
            if (win.dataset.maximized === 'true') {
                this.applyMaximizedBounds(win);
            } else if (win.dataset.minimized !== 'true') {
                this.keepWindowInBounds(win);
            }
        });
    },
    resizeWindowFromRect(windowEl, direction, rect, deltaX, deltaY) {
        const computed = window.getComputedStyle(windowEl);
        const minWidth = parseFloat(computed.minWidth) || 320;
        const minHeight = parseFloat(computed.minHeight) || 220;
        const bounds = this.getViewportBounds();

        let left = rect.left;
        let top = rect.top;
        let width = rect.width;
        let height = rect.height;

        if (direction.includes('e')) {
            width = Math.max(minWidth, Math.min(rect.right + deltaX, bounds.width) - rect.left);
        }

        if (direction.includes('s')) {
            height = Math.max(minHeight, Math.min(rect.bottom + deltaY, bounds.top + bounds.height) - rect.top);
        }

        if (direction.includes('w')) {
            left = Math.max(0, Math.min(rect.left + deltaX, rect.right - minWidth));
            width = rect.right - left;
        }

        if (direction.includes('n')) {
            top = Math.max(bounds.top, Math.min(rect.top + deltaY, rect.bottom - minHeight));
            height = rect.bottom - top;
        }

        windowEl.style.left = `${left}px`;
        windowEl.style.top = `${top}px`;
        windowEl.style.width = `${width}px`;
        windowEl.style.height = `${height}px`;
    },
    // The area between the menu bar and the dock.
    getViewportBounds() {
        const styles = getComputedStyle(document.documentElement);
        const top = parseFloat(styles.getPropertyValue('--menubar-height')) || 30;
        const dock = parseFloat(styles.getPropertyValue('--dock-space')) || 84;

        return {
            top,
            width: window.innerWidth,
            height: window.innerHeight - top - dock
        };
    },
    positionWindow(windowEl, left, top) {
        const bounds = this.getViewportBounds();
        // Keep the title bar reachable; the window itself may hang over the dock.
        const maxLeft = Math.max(0, window.innerWidth - windowEl.offsetWidth);
        const maxTop = Math.max(bounds.top, window.innerHeight - 80);

        windowEl.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
        windowEl.style.top = `${Math.min(Math.max(bounds.top, top), maxTop)}px`;
    }
};

const Dock = {
    container: null,
    tooltip: null,
    init() {
        this.container = document.getElementById('dock');

        if (!this.container) {
            return;
        }

        const pinned = AppRegistry.filter(app => app.dock);
        this.container.innerHTML = pinned.map(app => this.itemHtml(app.key, app.title, appIconHtml(app))).join('') +
            '<span class="dock-divider" aria-hidden="true"></span>' +
            this.itemHtml('Launchpad', 'All Apps', '<span class="app-icon" style="--c1: #d1d1d6; --c2: #8e8e93"><i class="bi bi-grid-3x3-gap-fill"></i></span>');

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'dock-tooltip';
        document.body.appendChild(this.tooltip);

        this.container.addEventListener('click', event => {
            const item = event.target.closest('.dock-item');

            if (!item) {
                return;
            }

            if (item.dataset.app === 'Launchpad') {
                Launchpad.toggle();
            } else {
                Launchpad.close();
                this.activate(item.dataset.app);
            }
        });

        this.container.addEventListener('mouseover', event => {
            const item = event.target.closest('.dock-item');

            if (!item) {
                return;
            }

            const rect = item.getBoundingClientRect();
            this.tooltip.textContent = item.getAttribute('aria-label');
            this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
            this.tooltip.style.top = `${rect.top - 14}px`;
            this.tooltip.classList.add('is-visible');
        });

        this.container.addEventListener('mouseleave', () => this.tooltip.classList.remove('is-visible'));
        this.container.addEventListener('click', () => this.tooltip.classList.remove('is-visible'));

        document.addEventListener('windows:change', () => this.refresh());
    },
    itemHtml(key, title, iconHtml) {
        return `<button type="button" class="dock-item" data-app="${key}" aria-label="${title}">${iconHtml}</button>`;
    },
    // Clicking a running app's icon focuses it, or minimizes it when it already has focus.
    activate(key) {
        const windowEl = WindowManager.find(key);

        if (!windowEl) {
            openApp(key);
        } else if (windowEl.dataset.minimized === 'true' || !windowEl.classList.contains('is-active')) {
            WindowManager.showWindow(windowEl);
        } else {
            WindowManager.minimizeWindow(windowEl);
        }
    },
    refresh() {
        this.container.querySelectorAll('.dock-item').forEach(item => {
            item.classList.toggle('is-running', Boolean(WindowManager.find(item.dataset.app)));
        });
    }
};

const Launchpad = {
    overlay: null,
    init() {
        this.overlay = document.getElementById('launchpad');
        const grid = document.getElementById('launchpad-grid');

        if (!this.overlay || !grid) {
            return;
        }

        grid.innerHTML = AppRegistry.map(app => `
            <button type="button" class="launchpad-item" data-app="${app.key}">
                ${appIconHtml(app)}
                <span>${app.title}</span>
            </button>`).join('');

        this.overlay.addEventListener('click', event => {
            const item = event.target.closest('.launchpad-item');
            this.close();

            if (item) {
                openApp(item.dataset.app);
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                this.close();
            }
        });
    },
    toggle() {
        if (this.overlay.classList.contains('is-open')) {
            this.close();
        } else {
            this.open();
        }
    },
    open() {
        MenuBar.closeMenus();
        this.overlay.classList.add('is-open');
        this.overlay.setAttribute('aria-hidden', 'false');
    },
    close() {
        if (!this.overlay) {
            return;
        }

        this.overlay.classList.remove('is-open');
        this.overlay.setAttribute('aria-hidden', 'true');
    }
};

const MenuBar = {
    init() {
        const appName = document.getElementById('menubar-app');

        document.addEventListener('windows:change', event => {
            if (appName) {
                appName.textContent = event.detail.active || 'Desktop';
            }
        });

        document.querySelectorAll('[data-menu-toggle]').forEach(button => {
            button.addEventListener('click', event => {
                event.stopPropagation();
                const menu = document.getElementById(`menu-${button.dataset.menuToggle}`);
                const isOpen = menu.classList.contains('is-open');
                this.closeMenus();

                if (!isOpen) {
                    menu.classList.add('is-open');
                    button.classList.add('is-active');
                }
            });
        });

        // Any [data-open], [data-launchpad] or [data-close-all] control anywhere on the page.
        document.addEventListener('click', event => {
            const target = event.target.closest('[data-open], [data-launchpad], [data-close-all]');

            if (!event.target.closest('.menu')) {
                this.closeMenus();
            }

            if (!target) {
                return;
            }

            this.closeMenus();

            if (target.hasAttribute('data-launchpad')) {
                Launchpad.toggle();
            } else if (target.hasAttribute('data-close-all')) {
                WindowManager.closeAll();
            } else {
                Launchpad.close();
                openApp(target.dataset.open);
            }
        });
    },
    closeMenus() {
        document.querySelectorAll('.menu.is-open').forEach(menu => menu.classList.remove('is-open'));
        document.querySelectorAll('[data-menu-toggle].is-active').forEach(button => button.classList.remove('is-active'));
    }
};

const Settings = {
    storageKey: 'uavnSettings',
    defaultWallpaper: 'FUJI7715.jpg',
    colors: ['#2b3a42', '#1c1c1e', '#3a2e39', '#24343a'],
    wallpapers: [],
    state: { wallpaper: null, color: null },
    init() {
        try {
            this.state = { ...this.state, ...JSON.parse(localStorage.getItem(this.storageKey) || '{}') };
        } catch (error) {
            // Private mode or blocked storage: fall back to defaults.
        }

        if (!this.state.wallpaper && !this.state.color) {
            this.state.wallpaper = this.defaultWallpaper;
        }

        this.apply();
        this.loadManifest();
    },
    async loadManifest() {
        try {
            const response = await fetch('./resources/wallpapers/manifest.json', { cache: 'no-cache' });
            const payload = response.ok ? await response.json() : {};
            this.wallpapers = Array.isArray(payload.wallpapers) ? payload.wallpapers : [];
        } catch (error) {
            this.wallpapers = [];
        }

        if (!this.wallpapers.includes(this.defaultWallpaper)) {
            this.wallpapers.unshift(this.defaultWallpaper);
        }

        this.render();
    },
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            // Not critical.
        }
    },
    apply() {
        const body = document.body;

        if (this.state.wallpaper) {
            body.style.backgroundColor = '';
            body.style.backgroundImage = `url('./resources/wallpapers/web/${this.state.wallpaper}')`;
        } else {
            body.style.backgroundImage = 'none';
            body.style.backgroundColor = this.state.color;
        }
    },
    select(kind, value) {
        this.state = kind === 'wallpaper' ? { wallpaper: value, color: null } : { wallpaper: null, color: value };
        this.apply();
        this.save();
        this.render();
    },
    open() {
        const existing = WindowManager.find('Settings');

        if (existing) {
            WindowManager.showWindow(existing);
            return;
        }

        const content = document.createElement('div');
        content.className = 'settings';
        content.innerHTML = `
            <h2>Wallpaper</h2>
            <p>Shot on film and digital around Alberta and BC.</p>
            <div class="settings-grid" data-settings-grid></div>
        `;

        content.addEventListener('click', event => {
            const option = event.target.closest('[data-kind]');

            if (option) {
                this.select(option.dataset.kind, option.dataset.value);
            }
        });

        WindowManager.create({
            key: 'Settings',
            title: 'Wallpaper',
            iconHtml: '',
            width: 620,
            height: 520,
            content
        });

        this.render();
    },
    render() {
        const grid = document.querySelector('[data-settings-grid]');

        if (!grid) {
            return;
        }

        grid.innerHTML = this.wallpapers.map(name => `
            <button type="button" class="wallpaper-option ${this.state.wallpaper === name ? 'is-active' : ''}" data-kind="wallpaper" data-value="${name}" title="${name}">
                <img src="./resources/wallpapers/thumbs/${name}" alt="" loading="lazy" />
            </button>`).join('') + this.colors.map(color => `
            <button type="button" class="wallpaper-option wallpaper-option--color ${this.state.color === color ? 'is-active' : ''}" data-kind="color" data-value="${color}" style="background: ${color}" title="${color}"></button>`).join('');
    }
};

function openApp(key) {
    if (key === 'Settings') {
        Settings.open();
        return;
    }

    const app = AppRegistry.find(item => item.key === key);

    if (!app) {
        console.error(`App "${key}" not found.`);
        return;
    }

    const existing = WindowManager.find(app.key);

    if (existing) {
        WindowManager.showWindow(existing);
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = app.url;
    iframe.title = app.title;
    iframe.setAttribute('allow', 'fullscreen; autoplay');

    WindowManager.create({
        key: app.key,
        title: app.title,
        iconHtml: appIconHtml(app),
        width: app.width,
        height: app.height,
        content: iframe
    });
}

// Deep links: /#NinetyPines opens that app on load.
function openAppFromHash() {
    const key = (location.hash || '').replace('#', '').trim();

    if (key && (key === 'Settings' || AppRegistry.some(app => app.key === key))) {
        openApp(key);
    }
}

window.addEventListener('hashchange', openAppFromHash);

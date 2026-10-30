// Film photo library. Data comes from lomography.json, which
// scripts/lomography-sync.js produces; images are served by Lomography's CDN.
const Photos = {
    data: { albums: [], photos: [] },
    view: { type: 'all', value: '' },
    visible: [],
    viewerIndex: -1,
    els: {},
    init() {
        ['app', 'sidebar', 'sidebar-toggle', 'nav-library', 'nav-albums', 'nav-cameras', 'nav-films',
            'view-title', 'view-meta', 'view-link', 'zoom', 'content',
            'viewer', 'viewer-image', 'viewer-counter', 'viewer-info'].forEach(id => {
            this.els[id] = document.getElementById(id);
        });

        this.restoreZoom();
        this.bindEvents();
        this.load();
    },
    async load() {
        try {
            const response = await fetch('./lomography.json', { cache: 'no-cache' });

            if (!response.ok) {
                throw new Error(response.status);
            }

            this.data = await response.json();
        } catch (error) {
            console.warn('Failed to load photos', error);
            this.els.content.innerHTML = '<div class="state">Could not load photos.</div>';
            return;
        }

        this.renderSidebar();
        this.applyHash();
    },
    bindEvents() {
        window.addEventListener('hashchange', () => this.applyHash());

        this.els['sidebar-toggle'].addEventListener('click', () => {
            this.els.app.classList.toggle('is-sidebar-open');
        });

        this.els.sidebar.addEventListener('click', event => {
            const item = event.target.closest('[data-view]');

            if (item) {
                location.hash = item.dataset.view;
                this.els.app.classList.remove('is-sidebar-open');
            }
        });

        this.els.zoom.addEventListener('input', () => {
            this.setZoom(Number(this.els.zoom.value));
        });

        this.els.content.addEventListener('click', event => {
            const tile = event.target.closest('[data-index]');
            const album = event.target.closest('[data-album]');

            if (tile) {
                this.openViewer(Number(tile.dataset.index));
            } else if (album) {
                location.hash = `album/${album.dataset.album}`;
            }
        });

        this.els.viewer.addEventListener('click', event => {
            const button = event.target.closest('[data-viewer]');
            const album = event.target.closest('[data-album]');

            if (album) {
                this.closeViewer();
                location.hash = `album/${album.dataset.album}`;
                return;
            }

            if (!button) {
                if (event.target.classList.contains('viewer-stage')) {
                    this.closeViewer();
                }
                return;
            }

            const action = button.dataset.viewer;

            if (action === 'close') {
                this.closeViewer();
            } else if (action === 'prev') {
                this.step(-1);
            } else if (action === 'next') {
                this.step(1);
            } else if (action === 'info') {
                this.els.viewer.classList.toggle('is-info-hidden');
            }
        });

        document.addEventListener('keydown', event => {
            if (this.viewerIndex < 0) {
                return;
            }

            if (event.key === 'Escape') {
                this.closeViewer();
            } else if (event.key === 'ArrowLeft') {
                this.step(-1);
            } else if (event.key === 'ArrowRight') {
                this.step(1);
            } else if (event.key === 'i') {
                this.els.viewer.classList.toggle('is-info-hidden');
            }
        });

        // Swipe between photos on touch screens.
        let touchX = null;

        this.els.viewer.addEventListener('touchstart', event => {
            touchX = event.touches[0].clientX;
        }, { passive: true });

        this.els.viewer.addEventListener('touchend', event => {
            if (touchX === null) {
                return;
            }

            const delta = event.changedTouches[0].clientX - touchX;
            touchX = null;

            if (Math.abs(delta) > 50) {
                this.step(delta < 0 ? 1 : -1);
            }
        });
    },
    restoreZoom() {
        let zoom = 200;

        try {
            zoom = Number(localStorage.getItem('photosZoom')) || zoom;
        } catch (error) {
            // Storage can be blocked; the default size is fine.
        }

        this.els.zoom.value = zoom;
        this.zoom = zoom;
    },
    setZoom(zoom) {
        this.zoom = zoom;

        const grid = this.els.content.querySelector('.grid');

        if (grid) {
            grid.style.setProperty('--row', `${zoom}px`);
        }

        try {
            localStorage.setItem('photosZoom', String(zoom));
        } catch (error) {
            // Not critical.
        }
    },
    applyHash() {
        const [type, ...rest] = decodeURIComponent(location.hash.replace(/^#/, '')).split('/');
        const value = rest.join('/');
        const known = ['all', 'albums', 'album', 'camera', 'film'];

        this.view = known.includes(type) ? { type, value } : { type: 'all', value: '' };
        this.render();
    },
    countBy(key) {
        const counts = new Map();

        this.data.photos.forEach(photo => {
            const values = Array.isArray(photo[key]) ? photo[key] : [photo[key]];

            values.filter(Boolean).forEach(value => {
                counts.set(value, (counts.get(value) || 0) + 1);
            });
        });

        return counts;
    },
    renderSidebar() {
        const item = (view, label, count, icon) => `
            <button type="button" class="sidebar-item" data-view="${escapeHtml(view)}">
                ${icon}
                <span class="sidebar-item-label">${escapeHtml(label)}</span>
                <span class="sidebar-item-count">${count}</span>
            </button>`;
        const byCount = counts => [...counts.entries()].sort((a, b) => b[1] - a[1]);

        const albumCounts = this.countBy('albums');

        this.els['nav-library'].innerHTML =
            item('all', 'All Photos', this.data.photos.length, '<i class="bi bi-images"></i>') +
            item('albums', 'Albums', this.data.albums.length, '<i class="bi bi-collection"></i>');

        this.els['nav-albums'].innerHTML = this.data.albums
            .filter(album => albumCounts.get(album.slug))
            .map(album => item(
                `album/${album.slug}`,
                album.title,
                albumCounts.get(album.slug),
                album.cover ? `<img src="${escapeHtml(album.cover)}" alt="" loading="lazy" />` : '<i class="bi bi-folder"></i>'
            )).join('');

        this.els['nav-cameras'].innerHTML = byCount(this.countBy('camera'))
            .map(([name, count]) => item(`camera/${name}`, name, count, '<i class="bi bi-camera"></i>')).join('');

        this.els['nav-films'].innerHTML = byCount(this.countBy('film'))
            .map(([name, count]) => item(`film/${name}`, name, count, '<i class="bi bi-film"></i>')).join('');
    },
    render() {
        const { type, value } = this.view;
        const viewKey = value ? `${type}/${value}` : type;

        this.els.sidebar.querySelectorAll('[data-view]').forEach(el => {
            el.classList.toggle('is-active', el.dataset.view === viewKey);
        });

        this.els.content.scrollTop = 0;

        if (type === 'albums') {
            this.renderAlbums();
            return;
        }

        let title = 'All Photos';
        let link = this.data.profile || 'https://www.lomography.com/homes/artbonvic';

        if (type === 'album') {
            const album = this.data.albums.find(item => item.slug === value);
            title = album ? album.title : value;
            link = album ? album.url : link;
            this.visible = this.data.photos.filter(photo => (photo.albums || []).includes(value));
        } else if (type === 'camera' || type === 'film') {
            title = value;
            this.visible = this.data.photos.filter(photo => photo[type] === value);
        } else {
            this.visible = this.data.photos;
        }

        this.setHeader(title, this.describe(this.visible), link);

        if (!this.visible.length) {
            this.els.content.innerHTML = '<div class="state">No photos here.</div>';
            return;
        }

        this.els.content.innerHTML = `<div class="grid" style="--row: ${this.zoom}px">${this.visible.map((photo, index) => {
            const ratio = photo.width && photo.height ? photo.width / photo.height : 1.5;
            return `<button type="button" class="tile" data-index="${index}" style="--r: ${ratio.toFixed(4)}" aria-label="${escapeHtml(this.caption(photo))}">
                <img src="${escapeHtml(photo.thumb)}" alt="" loading="lazy" decoding="async" />
            </button>`;
        }).join('')}</div>`;

        this.fadeInImages();
    },
    renderAlbums() {
        const counts = this.countBy('albums');
        const albums = this.data.albums.filter(album => counts.get(album.slug));

        this.setHeader('Albums', `${albums.length} albums`, `${this.data.profile || 'https://www.lomography.com/homes/artbonvic'}/albums`);

        this.els.content.innerHTML = `<div class="albums">${albums.map(album => `
            <button type="button" class="album-card" data-album="${escapeHtml(album.slug)}">
                <div class="album-card-cover">${album.cover ? `<img src="${escapeHtml(album.cover)}" alt="" loading="lazy" />` : ''}</div>
                <div class="album-card-title">${escapeHtml(album.title)}</div>
                <div class="album-card-meta">${counts.get(album.slug)} photos</div>
            </button>`).join('')}</div>`;
    },
    fadeInImages() {
        this.els.content.querySelectorAll('.tile img').forEach(img => {
            if (img.complete) {
                img.classList.add('is-loaded');
            } else {
                img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
            }
        });
    },
    setHeader(title, meta, link) {
        this.els['view-title'].textContent = title;
        this.els['view-meta'].textContent = meta;
        this.els['view-link'].href = link;
        document.title = `${title} - Photos`;
    },
    describe(photos) {
        const dates = photos.map(photo => photo.uploaded).filter(Boolean).sort();
        const years = dates.length ? [dates[0].slice(0, 4), dates[dates.length - 1].slice(0, 4)] : [];
        const range = years.length ? (years[0] === years[1] ? years[0] : `${years[0]}–${years[1]}`) : '';

        return [`${photos.length} photos`, range].filter(Boolean).join(' · ');
    },
    caption(photo) {
        return [photo.camera, photo.film, photo.uploaded].filter(Boolean).join(' · ') || 'Photo';
    },
    openViewer(index) {
        this.viewerIndex = index;
        this.els.viewer.classList.add('is-open');
        this.els.viewer.setAttribute('aria-hidden', 'false');
        this.showPhoto();
    },
    closeViewer() {
        this.viewerIndex = -1;
        this.els.viewer.classList.remove('is-open');
        this.els.viewer.setAttribute('aria-hidden', 'true');
        this.els['viewer-image'].removeAttribute('src');
        this.els['viewer-image'].removeAttribute('srcset');
    },
    step(delta) {
        if (!this.visible.length) {
            return;
        }

        this.viewerIndex = (this.viewerIndex + delta + this.visible.length) % this.visible.length;
        this.showPhoto();
    },
    showPhoto() {
        const photo = this.visible[this.viewerIndex];

        if (!photo) {
            return;
        }

        const image = this.els['viewer-image'];

        // Show the already-cached thumbnail blurred-up until the large file arrives.
        image.style.backgroundImage = `url("${photo.thumb}")`;
        image.removeAttribute('srcset');
        image.src = photo.image;

        if (photo.image2x) {
            image.srcset = `${photo.image} 1x, ${photo.image2x} 2x`;
        }

        image.alt = this.caption(photo);

        this.els['viewer-counter'].textContent = `${this.viewerIndex + 1} / ${this.visible.length}`;

        const albums = (photo.albums || [])
            .map(slug => this.data.albums.find(album => album.slug === slug))
            .filter(Boolean);
        const row = (label, html) => html ? `<dt>${label}</dt><dd>${html}</dd>` : '';
        const filterLink = (type, value) => value ? `<a href="#${type}/${encodeURIComponent(value)}" data-close>${escapeHtml(value)}</a>` : '';

        this.els['viewer-info'].innerHTML = `
            <dl>
                ${row('Camera', filterLink('camera', photo.camera))}
                ${row('Film', filterLink('film', photo.film))}
                ${row('Uploaded', photo.uploaded ? escapeHtml(formatDate(photo.uploaded)) : '')}
                ${row('Size', photo.width && photo.height ? `${photo.width} × ${photo.height}` : '')}
                ${row(albums.length > 1 ? 'Albums' : 'Album', albums.map(album => `<button type="button" class="viewer-album" data-album="${escapeHtml(album.slug)}">${escapeHtml(album.title)}</button>`).join(''))}
            </dl>
            <a class="viewer-external" href="${escapeHtml(photo.url)}" target="_blank" rel="noreferrer">View on Lomography <i class="bi bi-box-arrow-up-right"></i></a>
        `;

        this.els['viewer-info'].querySelectorAll('[data-close]').forEach(link => {
            link.addEventListener('click', () => this.closeViewer());
        });

        // Warm up the neighbours so arrowing through feels instant.
        [1, -1].forEach(delta => {
            const next = this.visible[(this.viewerIndex + delta + this.visible.length) % this.visible.length];

            if (next) {
                new Image().src = next.image;
            }
        });
    }
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

document.addEventListener('DOMContentLoaded', () => Photos.init());

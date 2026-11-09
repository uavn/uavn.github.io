'use strict';

/*
 * Photo Reel: drop photos in, get a video where they follow one another, each
 * on a coloured background with an optional frame (plain border, rough edge,
 * filed negative carrier, 35mm strip, 120 film, instant prints).
 *
 * Everything is drawn by drawScene() at any resolution, so the preview and the
 * exported file look the same. Export renders frame by frame (not in real time),
 * encodes with WebCodecs and muxes to MP4 with mp4-muxer.
 */

const FORMATS = [
    { id: '3840x2160', label: '4K UHD · 16:9', w: 3840, h: 2160 },
    { id: '2560x1440', label: '1440p · 16:9', w: 2560, h: 1440 },
    { id: '1920x1080', label: '1080p · 16:9', w: 1920, h: 1080 },
    { id: '2160x3840', label: '4K vertical · 9:16', w: 2160, h: 3840 },
    { id: '1080x1920', label: '1080p vertical · 9:16', w: 1080, h: 1920 },
    { id: '2160x2700', label: '4K portrait · 4:5', w: 2160, h: 2700 },
    { id: '2160x2160', label: '4K square · 1:1', w: 2160, h: 2160 }
];

// Bits per pixel per frame.
const QUALITY = { standard: 0.1, high: 0.18, max: 0.3 };

const FRAMES = [
    ['none', 'None — clean edge'],
    ['border', 'Border'],
    ['rough', 'Rough edge'],
    ['carrier', 'Filed carrier (black, rough)'],
    ['35mm', '35mm film strip'],
    ['120', '120 medium format'],
    ['polaroid', 'Polaroid'],
    ['instax', 'Instax']
];

const TRANSITIONS = [
    ['crossfade', 'Dissolve'],
    ['fade', 'Fade through background'],
    ['push-left', 'Push left'],
    ['push-up', 'Push up (film advance)'],
    ['slide', 'Slide over'],
    ['zoom', 'Zoom'],
    ['cut', 'Cut']
];

// Soft gradients, mostly from webgradients.com plus a few multi-stop pastel sets.
const GRADIENTS = [
    { name: 'Juicy Peach', stops: ['#ffecd2', '#fcb69f'] },
    { name: 'Warm Flame', stops: ['#ff9a9e', '#fad0c4'] },
    { name: 'Night Fade', stops: ['#a18cd1', '#fbc2eb'] },
    { name: 'Winter Neva', stops: ['#a1c4fd', '#c2e9fb'] },
    { name: 'Tempting Azure', stops: ['#84fab0', '#8fd3f4'] },
    { name: 'Sunny Morning', stops: ['#f6d365', '#fda085'] },
    { name: 'Saint Petersburg', stops: ['#f5f7fa', '#c3cfe2'] },
    { name: 'Everlasting Sky', stops: ['#fdfcfb', '#e2d1c3'] },
    { name: 'Soft Grass', stops: ['#c1dfc4', '#deecdd'] },
    { name: 'Heavy Rain', stops: ['#cfd9df', '#e2ebf0'] },
    { name: 'Lavender Sky', stops: ['#e0c3fc', '#8ec5fc'] },
    { name: 'Powder Mauve', stops: ['#bce7fc', '#c491b1'] },
    { name: 'Cotton Candy', stops: ['#ffb7c5', '#f6d1ff', '#bfe3ff'] },
    { name: 'Blush Cloud', stops: ['#ffe9f0', '#ffd1dc', '#f5c6ff', '#d0f0ff'] },
    { name: 'Peach Mist', stops: ['#ffe6cc', '#ffbfa3', '#ff9fb5', '#f4c7ff'] },
    { name: 'Spring', stops: ['#ffc4c4', '#ffdfbd', '#f8ffeb'] },
    // Dark, ordered around the colour wheel.
    { name: 'Ember', stops: ['#2b0a0a', '#5c1a1a'], dark: true },
    { name: 'Bordeaux', stops: ['#1f0510', '#4d0f26'], dark: true },
    { name: 'Wine', stops: ['#1a0b14', '#4a1c2c'], dark: true },
    { name: 'Rose', stops: ['#2b0b18', '#6b1f3d'], dark: true },
    { name: 'Mulberry', stops: ['#1f0a1f', '#521c4a'], dark: true },
    { name: 'Plum', stops: ['#2a0a24', '#6b1f5c'], dark: true },
    { name: 'Aubergine', stops: ['#2c001e', '#5e2750'], dark: true },
    { name: 'Violet', stops: ['#1b0b2b', '#4a1f6b'], dark: true },
    { name: 'Indigo', stops: ['#120b2e', '#2e1f6b'], dark: true },
    { name: 'Dusk', stops: ['#0b0b2b', '#1b1b4b', '#3a2f5f'], dark: true },
    { name: 'Navy', stops: ['#050b1f', '#12234d'], dark: true },
    { name: 'Cobalt', stops: ['#0b1033', '#1f2f7a'], dark: true },
    { name: 'Royal', stops: ['#141e30', '#243b55'], dark: true },
    { name: 'Ocean', stops: ['#04142b', '#0b3a6b'], dark: true },
    { name: 'Petrol', stops: ['#0a1c24', '#14424f'], dark: true },
    { name: 'Moonlit', stops: ['#0f2027', '#203a43', '#2c5364'], dark: true },
    { name: 'Deep Teal', stops: ['#03201f', '#0b4a48'], dark: true },
    { name: 'Spruce', stops: ['#051a14', '#0f3d2e'], dark: true },
    { name: 'Pine', stops: ['#0b1f1a', '#16453a'], dark: true },
    { name: 'Forest Night', stops: ['#0b1a12', '#1f3b2c'], dark: true },
    { name: 'Olive', stops: ['#1a1d0c', '#3d4419'], dark: true },
    { name: 'Bronze', stops: ['#1f1505', '#4d3a12'], dark: true },
    { name: 'Amber', stops: ['#2a1c05', '#5e3d0e'], dark: true },
    { name: 'Rust', stops: ['#2a1206', '#6b2e12'], dark: true },
    { name: 'Cocoa', stops: ['#1e1410', '#4a3326'], dark: true },
    { name: 'Espresso', stops: ['#140c08', '#33221a'], dark: true },
    { name: 'Northern Lights', stops: ['#06141b', '#0f3b3a', '#2a1f4f'], dark: true },
    { name: 'Late Sunset', stops: ['#140a24', '#3d1240', '#6b2a1f'], dark: true },
    { name: 'Slate', stops: ['#14181f', '#2f3a4a'], dark: true },
    { name: 'Midnight City', stops: ['#232526', '#414345'], dark: true },
    { name: 'Graphite', stops: ['#0d0d0f', '#26262b'], dark: true },
    { name: 'Deep Space', stops: ['#000000', '#434343'], dark: true }
];

const PAPER = ['#ffffff', '#f4f0e8', '#e9e4da', '#d9d9d9', '#1a1a1a', '#000000'];
const BACKGROUNDS = ['#ffffff', '#f4f0e8', '#d9d9d9', '#1a1a1a', '#000000', '#00ff00'];

// Web fonts for the title and captions, all with Cyrillic. Loaded on demand.
const FONTS = [
    { id: 'inter', name: 'Inter', family: 'Inter', weight: 600, group: 'Sans' },
    { id: 'manrope', name: 'Manrope', family: 'Manrope', weight: 600, group: 'Sans' },
    { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 600, group: 'Sans' },
    { id: 'rubik', name: 'Rubik', family: 'Rubik', weight: 500, group: 'Sans' },
    { id: 'oswald', name: 'Oswald (condensed)', family: 'Oswald', weight: 500, group: 'Sans' },
    { id: 'unbounded', name: 'Unbounded (wide)', family: 'Unbounded', weight: 500, group: 'Sans' },
    { id: 'playfair', name: 'Playfair Display', family: 'Playfair Display', weight: 500, group: 'Serif' },
    { id: 'cormorant', name: 'Cormorant Garamond', family: 'Cormorant Garamond', weight: 500, group: 'Serif' },
    { id: 'lora', name: 'Lora', family: 'Lora', weight: 500, group: 'Serif' },
    { id: 'ptserif', name: 'PT Serif', family: 'PT Serif', weight: 400, group: 'Serif' },
    { id: 'prata', name: 'Prata', family: 'Prata', weight: 400, group: 'Serif' },
    { id: 'yeseva', name: 'Yeseva One', family: 'Yeseva One', weight: 400, group: 'Serif' },
    { id: 'caveat', name: 'Caveat', family: 'Caveat', weight: 600, group: 'Handwritten' },
    { id: 'marck', name: 'Marck Script', family: 'Marck Script', weight: 400, group: 'Handwritten' },
    { id: 'amatic', name: 'Amatic SC', family: 'Amatic SC', weight: 700, group: 'Handwritten' },
    { id: 'pacifico', name: 'Pacifico', family: 'Pacifico', weight: 400, group: 'Handwritten' },
    { id: 'jetbrains', name: 'JetBrains Mono', family: 'JetBrains Mono', weight: 500, group: 'Mono' },
    { id: 'plexmono', name: 'IBM Plex Mono', family: 'IBM Plex Mono', weight: 500, group: 'Mono' },
    { id: 'ptmono', name: 'PT Mono', family: 'PT Mono', weight: 400, group: 'Mono' },
    { id: 'russo', name: 'Russo One', family: 'Russo One', weight: 400, group: 'Display' }
];

const FONT_OPTIONS = FONTS.map(font => [font.id, font.name, font.group]);

const DEFAULTS = {
    format: '3840x2160',
    fps: 30,
    quality: 'high',
    duration: 3,
    transition: 'crossfade',
    transitionDuration: 1.6,
    kenBurns: 0,
    fadeEdges: false,
    bgType: 'solid',
    bgColor: '#ffffff',
    gradient: ['#ffecd2', '#fcb69f'],
    bgDirection: 'vertical',
    blurDim: 30,
    padding: 1.5,
    frame: 'none',
    frameColor: '#ffffff',
    frameThickness: 4,
    radius: 0,
    roughness: 50,
    gateRough: 0,
    trimEdges: 1,
    filmStock: '',
    edgeColor: '#e2963a',
    dust: 20,
    captionMode: 'each',
    captionText: '{camera} · {film}',
    captionSize: 100,
    title: '',
    titleMode: 'always',
    titleFont: 'inter',
    captionFont: 'auto',
    titleSize: 100,
    sound: 'none',
    soundVolume: 80,
    soundCustomName: '',
    music: 'none',
    musicName: '',
    musicStart: 0,
    musicVolume: 70,
    musicFadeIn: 1,
    musicFadeOut: 2.5,
    musicLoop: true,
    musicSeed: 1,
    soundOffset: 0,
    soundWhen: 'auto',
    soundFirst: false,
    shadow: 25,
    grain: 0
};

const SECTIONS = [
    {
        title: 'Video',
        fields: [
            { key: 'format', label: 'Format', type: 'select', options: FORMATS.map(f => [f.id, `${f.label}`]) },
            { key: 'fps', label: 'Frame rate', type: 'select', options: [24, 25, 30, 50, 60].map(v => [v, `${v} fps`]), number: true },
            { key: 'quality', label: 'Quality', type: 'select', options: [['standard', 'Standard'], ['high', 'High'], ['max', 'Max (big file)']] }
        ]
    },
    {
        title: 'Timing',
        fields: [
            { key: 'duration', label: 'Per photo', type: 'range', min: 1, max: 12, step: 0.1, unit: 's' },
            { key: 'transition', label: 'Transition', type: 'select', options: TRANSITIONS },
            { key: 'transitionDuration', label: 'Length', type: 'range', min: 0.1, max: 3, step: 0.05, unit: 's', show: s => s.transition !== 'cut' },
            { key: 'kenBurns', label: 'Slow zoom', type: 'range', min: 0, max: 15, step: 0.5, unit: '%' },
            { key: 'fadeEdges', label: 'Fade in/out', type: 'checkbox' }
        ]
    },
    {
        title: 'Background',
        fields: [
            { key: 'bgType', label: 'Type', type: 'select', options: [['solid', 'Solid colour'], ['gradient', 'Gradient'], ['blur', 'Blurred photo']] },
            { key: 'bgColor', label: 'Colour', type: 'color', swatches: BACKGROUNDS, show: s => s.bgType === 'solid' },
            { key: 'gradient', label: 'Gradient', type: 'gradient', show: s => s.bgType === 'gradient' },
            { key: 'bgDirection', label: 'Direction', type: 'select', options: [['vertical', 'Vertical ↓'], ['horizontal', 'Horizontal →'], ['diagonal', 'Diagonal ↘'], ['diagonal-up', 'Diagonal ↗'], ['radial', 'Radial ◎']], show: s => s.bgType === 'gradient' },
            { key: 'blurDim', label: 'Darken', type: 'range', min: 0, max: 90, step: 1, unit: '%', show: s => s.bgType === 'blur' },
            { key: 'padding', label: 'Margin', type: 'range', min: 0, max: 30, step: 0.5, unit: '%' }
        ]
    },
    {
        title: 'Frame',
        fields: [
            { key: 'frame', label: 'Style', type: 'select', options: FRAMES },
            { key: 'frameColor', label: 'Paper', type: 'color', swatches: PAPER, show: s => ['border', 'polaroid', 'instax'].includes(s.frame) },
            { key: 'frameThickness', label: 'Thickness', type: 'range', min: 0.5, max: 20, step: 0.5, unit: '%', show: s => s.frame === 'border' },
            { key: 'radius', label: 'Corners', type: 'range', min: 0, max: 8, step: 0.25, unit: '%', show: s => ['none', 'border'].includes(s.frame) },
            { key: 'roughness', label: 'Roughness', type: 'range', min: 0, max: 100, step: 1, unit: '%', show: s => ['rough', 'carrier'].includes(s.frame) },
            { key: 'trimEdges', label: 'Trim edges', type: 'range', min: 0, max: 5, step: 0.25, unit: '%' },
            { key: 'gateRough', label: 'Rough edges', type: 'range', min: 0, max: 100, step: 1, unit: '%', show: s => ['35mm', '120'].includes(s.frame) },
            { key: 'filmStock', label: 'Edge print', type: 'text', placeholder: 'e.g. KODAK PORTRA 400', show: s => ['35mm', '120'].includes(s.frame) },
            { key: 'edgeColor', label: 'Print colour', type: 'color', swatches: ['#e2963a', '#f2c94c', '#d8d2c4', '#ff7a45'], show: s => ['35mm', '120'].includes(s.frame) },
            { key: 'dust', label: 'Dust', type: 'range', min: 0, max: 100, step: 1, unit: '%', show: s => ['carrier', '35mm', '120'].includes(s.frame) },
            { key: 'shadow', label: 'Shadow', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
        ]
    },
    {
        title: 'Title',
        fields: [
            { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Wild West · roll 12' },
            { key: 'titleMode', label: 'Show', type: 'select', options: [['always', 'Whole video'], ['intro', 'First photo only']], show: s => s.title.trim() !== '' },
            { key: 'titleFont', label: 'Font', type: 'select', options: FONT_OPTIONS, show: s => s.title.trim() !== '' },
            { key: 'titleSize', label: 'Size', type: 'range', min: 50, max: 250, step: 5, unit: '%', show: s => s.title.trim() !== '' }
        ]
    },
    {
        title: 'Caption',
        fields: [
            { key: 'captionMode', label: 'Text', type: 'select', options: [['each', 'Per photo (edit in the list)'], ['same', 'Same for every photo'], ['off', 'Off']] },
            { key: 'captionText', label: 'Caption', type: 'text', show: s => s.captionMode === 'same' },
            { key: 'captionNote', type: 'note', text: 'Tokens: {n} frame number, {camera}, {film}, {name}, {date}. On film frames the caption is printed on the film edge.', show: s => s.captionMode !== 'off' },
            { key: 'captionFont', label: 'Font', type: 'select', options: [['auto', 'Auto (matches the frame)', ''], ...FONT_OPTIONS], show: s => s.captionMode !== 'off' },
            { key: 'captionSize', label: 'Size', type: 'range', min: 50, max: 200, step: 5, unit: '%', show: s => s.captionMode !== 'off' }
        ]
    },
    {
        title: 'Sound',
        fields: [
            { key: 'sound', label: 'On each photo', type: 'select', options: [['none', 'None'], ['wind', 'Film advance'], ['shutter', 'Film shutter'], ['digital', 'Digital shutter'], ['custom', 'Your own sound…']] },
            { key: 'soundWhen', label: 'Plays', type: 'select', options: [['auto', 'Auto (advance on start, shutter at the end)'], ['start', 'As the photo starts moving'], ['middle', 'Mid-transition'], ['end', 'Once the photo is in']], show: s => s.sound !== 'none' },
            { key: 'soundCustomName', label: 'File', type: 'file', target: 'sound', show: s => s.sound === 'custom' },
            { key: 'soundVolume', label: 'Volume', type: 'range', min: 0, max: 100, step: 1, unit: '%', show: s => s.sound !== 'none' },
            { key: 'soundOffset', label: 'Nudge', type: 'range', min: -0.5, max: 0.5, step: 0.01, unit: 's', show: s => s.sound !== 'none' },
            { key: 'soundFirst', label: 'On 1st photo', type: 'checkbox', show: s => s.sound !== 'none' },
            { key: 'soundTest', label: '', type: 'action', action: 'sound-test', text: 'Play sample', show: s => s.sound !== 'none' }
        ]
    },
    {
        title: 'Music',
        fields: [
            { key: 'music', label: 'Background', type: 'select', options: [['none', 'None'], ['file', 'Your own track…'], ['ambient', 'Ambient pad', 'Generated'], ['chiptune', '8-bit chiptune', 'Generated'], ['lofi', 'Lo-fi beat', 'Generated'], ['musicbox', 'Music box', 'Generated']] },
            { key: 'musicNew', label: '', type: 'action', action: 'music-new', text: 'New variation', icon: 'bi-shuffle', show: s => GENERATED_STYLES.includes(s.music) },
            { key: 'musicName', label: 'File', type: 'file', target: 'music', show: s => s.music === 'file' },
            { key: 'musicStart', label: 'Start at', type: 'range', min: 0, max: 180, step: 0.5, unit: 's', show: s => s.music === 'file' },
            { key: 'musicVolume', label: 'Volume', type: 'range', min: 0, max: 100, step: 1, unit: '%', show: s => s.music !== 'none' },
            { key: 'musicFadeIn', label: 'Fade in', type: 'range', min: 0, max: 5, step: 0.1, unit: 's', show: s => s.music !== 'none' },
            { key: 'musicFadeOut', label: 'Fade out', type: 'range', min: 0, max: 8, step: 0.1, unit: 's', show: s => s.music !== 'none' },
            { key: 'musicLoop', label: 'Loop', type: 'checkbox', show: s => s.music === 'file' }
        ]
    },
    {
        title: 'Look',
        fields: [
            { key: 'grain', label: 'Film grain', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
        ]
    }
];

const STORAGE_KEY = 'photoReelSettings';
// Bumped when defaults change, so new defaults reach people with saved settings.
const SETTINGS_VERSION = 3;
// Settings whose default changed in each version: reset once for anyone saved before it.
const RESET_ON_UPGRADE = { 2: ['padding', 'kenBurns'], 3: ['transitionDuration'] };
const PREVIEW_MAX_SIDE = 1600;
const FILM_BASE = '#100e0d';

let state = loadSettings();
let photos = [];
let nextId = 1;
let time = 0;
let playing = false;
let lastTick = 0;
let exporting = null;

const fullCache = new Map(); // photo id -> full-resolution canvas, during export only

const el = {
    preview: document.getElementById('preview'),
    viewport: document.getElementById('viewport'),
    list: document.getElementById('photo-list'),
    count: document.getElementById('photo-count'),
    fileInput: document.getElementById('file-input'),
    dropzone: document.getElementById('dropzone'),
    play: document.getElementById('play'),
    scrubber: document.getElementById('scrubber'),
    timeNow: document.getElementById('time-now'),
    timeTotal: document.getElementById('time-total'),
    summary: document.getElementById('summary'),
    controls: document.getElementById('controls'),
    presets: document.getElementById('presets'),
    exportBtn: document.getElementById('export'),
    stillsBtn: document.getElementById('export-stills'),
    stillsMode: document.getElementById('stills-mode'),
    cancelBtn: document.getElementById('cancel'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progress-bar'),
    status: document.getElementById('status'),
    busy: document.getElementById('busy'),
    busyText: document.getElementById('busy-text'),
    reset: document.getElementById('reset')
};

const previewCtx = el.preview.getContext('2d', { alpha: false });

/* ------------------------------------------------------------------ settings */

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const merged = { ...DEFAULTS };

        const savedVersion = Number(saved.version) || 1;
        const outdated = savedVersion < SETTINGS_VERSION;
        const reset = Object.entries(RESET_ON_UPGRADE)
            .filter(([version]) => Number(version) > savedVersion)
            .flatMap(([, keys]) => keys);

        Object.keys(DEFAULTS).forEach(key => {
            if (!(key in saved) || reset.includes(key)) {
                return;
            }

            // The old default edge print; a custom one is kept.
            if (outdated && key === 'filmStock' && saved.filmStock === 'KODAK PORTRA 400') {
                return;
            }

            if (Array.isArray(DEFAULTS[key])) {
                const value = saved[key];

                if (Array.isArray(value) && value.length >= 2 && value.length <= 4 && value.every(c => /^#[0-9a-f]{6}$/i.test(c))) {
                    merged[key] = value;
                }
            } else if (typeof saved[key] === typeof DEFAULTS[key]) {
                merged[key] = saved[key];
            }
        });

        const legacyFonts = { sans: 'inter', serif: 'playfair', hand: 'caveat', mono: 'jetbrains' };
        merged.titleFont = legacyFonts[merged.titleFont] || merged.titleFont;

        if (!FONTS.some(font => font.id === merged.titleFont)) {
            merged.titleFont = DEFAULTS.titleFont;
        }

        if (merged.captionFont !== 'auto' && !FONTS.some(font => font.id === merged.captionFont)) {
            merged.captionFont = 'auto';
        }

        const legacySounds = { 'shutter-lever': 'shutter', lever: 'wind', motor: 'shutter', 'wind-shutter': 'shutter', 'shutter-wind': 'shutter', click: 'digital' };
        merged.sound = legacySounds[merged.sound] || merged.sound;

        return merged;
    } catch (error) {
        return { ...DEFAULTS };
    }
}

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: SETTINGS_VERSION }));
    } catch (error) {
        // Not critical.
    }
}

function currentFormat() {
    return FORMATS.find(f => f.id === state.format) || FORMATS[0];
}

const MUSIC_KEYS = ['musicSeed', 'music', 'musicStart', 'musicVolume', 'musicFadeIn', 'musicFadeOut', 'musicLoop', 'duration', 'transition', 'transitionDuration'];

function setState(patch) {
    const musicChanged = Object.keys(patch).some(key => MUSIC_KEYS.includes(key) && patch[key] !== state[key]);
    state = { ...state, ...patch };

    if (musicChanged && playing) {
        Music.play(time);
    }

    saveSettings();
    syncControls();
    layoutPreview();
    clampTime();
    draw();
}

/* -------------------------------------------------------------------- timing */

function timing() {
    const D = state.duration;
    const T = state.transition === 'cut' ? 0 : Math.min(state.transitionDuration, D * 0.9);
    return { D, T, total: photos.length * D };
}

function easeInOut(p) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

// Which photo(s) are on screen at time t, and how far the transition is.
function sceneAt(t) {
    const { D, T } = timing();
    const N = photos.length;
    const a = Math.min(N - 1, Math.max(0, Math.floor(t / D)));
    const local = t - a * D;

    if (T > 0 && a < N - 1 && local > D - T) {
        return { a, b: a + 1, p: easeInOut((local - (D - T)) / T) };
    }

    return { a, b: -1, p: 0 };
}

// 0..1 across the whole time a photo is visible, for the slow zoom.
function lifeProgress(k, t) {
    const { D, T } = timing();
    const start = k === 0 ? 0 : k * D - T;
    const end = (k + 1) * D;
    return Math.min(1, Math.max(0, (t - start) / (end - start)));
}

/* ------------------------------------------------------------------- helpers */

function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hash1(seed, i) {
    let h = Math.imul(i | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

function valueNoise(seed, x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return hash1(seed, i) * (1 - u) + hash1(seed, i + 1) * u;
}

// Fractal 1D noise in -1..1.
function fbm(seed, x, octaves) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let freq = 1;

    for (let o = 0; o < octaves; o++) {
        sum += amp * (valueNoise(seed + o * 1013, x * freq) * 2 - 1);
        norm += amp;
        amp *= 0.55;
        freq *= 2.13;
    }

    return sum / norm;
}

const CAN_FILTER = (() => {
    try {
        return typeof document.createElement('canvas').getContext('2d').filter === 'string';
    } catch (error) {
        return false;
    }
})();

function scaleToCanvas(source, maxSide) {
    const sw = source.width;
    const sh = source.height;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function makeBlurred(source) {
    const w = 360;
    const h = Math.round(w * source.height / source.width);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (CAN_FILTER) {
        ctx.filter = 'blur(14px)';
        // Overscan so the blur doesn't fade to transparent at the edges.
        ctx.drawImage(source, -w * 0.15, -h * 0.15, w * 1.3, h * 1.3);
        ctx.filter = 'none';
    } else {
        const tiny = scaleToCanvas(source, 18);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tiny, 0, 0, w, h);
    }

    return canvas;
}

const grainTiles = (() => {
    const tiles = [];
    const rnd = mulberry32(99);

    for (let n = 0; n < 4; n++) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const data = ctx.createImageData(256, 256);

        for (let i = 0; i < data.data.length; i += 4) {
            // Roughly gaussian around mid grey, which "overlay" leaves untouched.
            const g = (rnd() + rnd() + rnd() - 1.5) * 90;
            const v = Math.max(0, Math.min(255, 128 + g));
            data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
            data.data[i + 3] = 255;
        }

        ctx.putImageData(data, 0, 0);
        tiles.push(canvas);
    }

    return tiles;
})();

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds - m * 60;
    return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------- drawing */

function borders(photo) {
    const landscape = photo.w >= photo.h;

    switch (state.frame) {
        case 'border': {
            const t = state.frameThickness / 100;
            return [t, t, t, t];
        }
        case 'carrier':
            return [0.075, 0.075, 0.075, 0.075];
        case '35mm':
            // 24mm frame on 35mm film: 5.5mm margins carry the sprocket holes.
            return landscape ? [0.05, 0.215, 0.05, 0.215] : [0.215, 0.05, 0.215, 0.05];
        case '120':
            return landscape ? [0.06, 0.085, 0.06, 0.085] : [0.085, 0.06, 0.085, 0.06];
        case 'polaroid':
            return [0.06, 0.06, 0.06, 0.24];
        case 'instax':
            return [0.085, 0.13, 0.085, 0.36];
        default:
            return [0, 0, 0, 0];
    }
}

// Card geometry centred on (0, 0), in output pixels.
function layout(photo, W, H, band = 0, top = titleBand(W, H)) {
    const aspect = photo.w / photo.h;
    const short = Math.min(aspect, 1);
    const [l, t, r, b] = borders(photo).map(v => v * short);
    const cw0 = aspect + l + r;
    const ch0 = 1 + t + b;
    const pad = (state.padding / 100) * Math.min(W, H);
    const k = Math.max(1, Math.min((W - 2 * pad) / cw0, (H - 2 * pad - band - top) / ch0));
    const cw = cw0 * k;
    const ch = ch0 * k;

    return {
        dy: (top - band) / 2,
        cw,
        ch,
        x0: -cw / 2,
        y0: -ch / 2,
        px: (-cw0 / 2 + l) * k,
        py: (-ch0 / 2 + t) * k,
        pw: aspect * k,
        ph: k,
        s: short * k
    };
}

function applyShadow(ctx, W, H) {
    const amount = state.shadow / 100;

    if (amount <= 0) {
        return;
    }

    const m = Math.min(W, H);
    ctx.shadowColor = `rgba(0, 0, 0, ${0.16 + 0.34 * amount})`;
    ctx.shadowBlur = m * 0.045 * amount;
    ctx.shadowOffsetY = m * 0.012 * amount;
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();

    if (r > 0 && ctx.roundRect) {
        ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    } else {
        ctx.rect(x, y, w, h);
    }
}

/*
 * The outline of an opening (a filed carrier window, a camera gate, a torn print).
 * It walks a (slightly inset) rounded rectangle and pushes every point inwards by:
 *   - short straight facets at varying depths, like strokes of a file,
 *   - fine grit at a few pixels' scale,
 * and adds thin overcut slots running past some corners.
 * Displacement is a function of distance along the edge measured in units of the
 * photo's short side, so the shape is identical in the preview and at 4K; only
 * the sampling gets finer.
 */
function windowPath(x, y, w, h, o) {
    const path = new Path2D();
    const inset = o.inset || 0;
    x += inset;
    y += inset;
    w -= inset * 2;
    h -= inset * 2;
    const [c0, c1, c2, c3] = o.corners;
    const segments = [];
    const line = (x1, y1, x2, y2, nx, ny) => segments.push({ line: true, x1, y1, x2, y2, nx, ny, len: Math.hypot(x2 - x1, y2 - y1) });
    const arc = (cx, cy, r, a0, a1) => segments.push({ line: false, cx, cy, r, a0, a1, len: r * Math.abs(a1 - a0) });

    line(x + c0, y, x + w - c1, y, 0, -1);
    arc(x + w - c1, y + c1, c1, -Math.PI / 2, 0);
    line(x + w, y + c1, x + w, y + h - c2, 1, 0);
    arc(x + w - c2, y + h - c2, c2, 0, Math.PI / 2);
    line(x + w - c2, y + h, x + c3, y + h, 0, 1);
    arc(x + c3, y + h - c3, c3, Math.PI / 2, Math.PI);
    line(x, y + h - c3, x, y + c0, -1, 0);
    arc(x + c0, y + c0, c0, Math.PI, Math.PI * 1.5);

    let distance = 0;
    let first = true;

    segments.forEach(seg => {
        const steps = Math.max(1, Math.ceil(seg.len / o.step));

        for (let i = 0; i < steps; i++) {
            const f = i / steps;
            let px;
            let py;
            let nx;
            let ny;

            if (seg.line) {
                px = seg.x1 + (seg.x2 - seg.x1) * f;
                py = seg.y1 + (seg.y2 - seg.y1) * f;
                nx = seg.nx;
                ny = seg.ny;
            } else {
                const a = seg.a0 + (seg.a1 - seg.a0) * f;
                nx = Math.cos(a);
                ny = Math.sin(a);
                px = seg.cx + seg.r * nx;
                py = seg.cy + seg.r * ny;
            }

            const d = edgeDisplacement(o, (distance + seg.len * f) / o.unit);
            const qx = px - nx * d;
            const qy = py - ny * d;

            if (first) {
                path.moveTo(qx, qy);
                first = false;
            } else {
                path.lineTo(qx, qy);
            }
        }

        distance += seg.len;
    });

    path.closePath();

    // Overcut slots stay inside the inset, so they never run past the photo.
    (o.ears || []).forEach(({ c, side, len, width }) => {
        const reach = inset * len;
        const thick = Math.max(o.step / 1.25, o.unit * width);
        const r = o.corners[c] + thick;
        const left = c === 0 || c === 3;
        const top = c === 0 || c === 1;
        const cx = left ? x : x + w;
        const cy = top ? y : y + h;

        if (reach <= 0) {
            return;
        }

        if (side === 0) {
            // Along the top/bottom edge, past the corner sideways.
            const x0 = left ? cx - reach : cx - r;
            const y0 = top ? cy : cy - thick;
            path.rect(x0, y0, reach + r, thick);
        } else {
            const x0 = left ? cx : cx - thick;
            const y0 = top ? cy - reach : cy - r;
            path.rect(x0, y0, thick, reach + r);
        }
    });

    return path;
}

// Edge offset at distance u (in photo short sides) along the outline: a chain of
// short straight facets at slightly different depths, like strokes of a file,
// plus a little grit.
function edgeDisplacement(o, u) {
    let d = 0;
    const facets = o.facets;

    if (o.amp && facets.length > 1) {
        let lo = 0;
        let hi = facets.length - 1;

        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;

            if (facets[mid][0] <= u) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        const [u0, v0] = facets[lo];
        const [u1, v1] = facets[hi];
        const f = Math.max(0, Math.min(1, (u - u0) / (u1 - u0)));
        d += o.amp * (v0 + (v1 - v0) * f);
    }

    if (o.fuzz) {
        d += o.fuzz * (0.5 + 0.5 * fbm(o.seed + 7, u * 240, 3));
    }

    return Math.max(0, d);
}

function windowOptions(rnd, L, rs, { amp = 0, fuzz = 0, corner = 0, cornerJitter = 0.5, ears = 0, inset = 0 }) {
    const perimeter = 2 * (L.pw + L.ph) / L.s + 0.5;
    const facets = [];

    for (let u = 0; u <= perimeter + 0.15; u += 0.03 + 0.1 * rnd()) {
        facets.push([u, rnd() * rnd()]);
    }

    // Overcuts: the file ran past a corner, leaving a thin slot along the edge.
    const earList = [];

    for (let c = 0; c < 4; c++) {
        for (let side = 0; side < 2; side++) {
            if (rnd() < ears) {
                earList.push({ c, side, len: 0.35 + 0.65 * rnd(), width: 0.004 + 0.006 * rnd() });
            }
        }
    }

    return {
        amp,
        fuzz,
        facets,
        ears: earList,
        inset,
        corners: [0, 0, 0, 0].map(() => corner * (1 - cornerJitter / 2 + cornerJitter * rnd())),
        seed: Math.floor(rnd() * 1e9),
        unit: L.s,
        step: 1.25 / rs
    };
}

// Draw the photo into its rect, trimming a few percent off every side first:
// lab scans often carry a thin line of film edge or scanner frame.
function drawPhoto(ctx, image, x, y, w, h) {
    const t = Math.max(0, Math.min(0.2, state.trimEdges / 100));
    ctx.drawImage(image, image.width * t, image.height * t, image.width * (1 - 2 * t), image.height * (1 - 2 * t), x, y, w, h);
}

let maskCanvas = null;

// Draw the photo through `path` with a soft (blurred) edge.
function drawThroughWindow(ctx, image, L, path, softPx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (!maskCanvas) {
        maskCanvas = document.createElement('canvas');
    }

    if (maskCanvas.width !== W || maskCanvas.height !== H) {
        maskCanvas.width = W;
        maskCanvas.height = H;
    }

    const m = maskCanvas.getContext('2d');
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, W, H);
    m.setTransform(ctx.getTransform());

    if (CAN_FILTER && softPx > 0.25) {
        m.filter = `blur(${softPx.toFixed(2)}px)`;
    }

    m.fillStyle = '#fff';
    m.fill(path);
    m.filter = 'none';
    m.globalCompositeOperation = 'source-in';
    m.imageSmoothingQuality = 'high';
    drawPhoto(m, image, L.px, L.py, L.pw, L.ph);
    m.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.restore();
}

// Unexposed film base: near black with faint uneven density.
function fillFilmBase(ctx, path, L, rnd) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0, L.y0, L.cw, L.ch);
    ctx.clip();
    ctx.fillStyle = FILM_BASE;
    ctx.fill(path, 'evenodd');
    ctx.clip(path, 'evenodd');

    const mottle = document.createElement('canvas');
    mottle.width = 28;
    mottle.height = 18;
    const mctx = mottle.getContext('2d');
    const data = mctx.createImageData(mottle.width, mottle.height);

    for (let i = 0; i < data.data.length; i += 4) {
        const v = 40 + rnd() * 50;
        data.data[i] = v;
        data.data[i + 1] = v * 0.92;
        data.data[i + 2] = v * 0.85;
        data.data[i + 3] = 255;
    }

    mctx.putImageData(data, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.12;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mottle, L.x0, L.y0, L.cw, L.ch);
    ctx.restore();
}

function paperTexture(ctx, path, L) {
    ctx.save();
    ctx.clip(path);
    const pattern = ctx.createPattern(grainTiles[1], 'repeat');
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = pattern;
    ctx.fillRect(L.x0, L.y0, L.cw, L.ch);
    ctx.restore();
}

// Dust and the odd hair, white as they come out of a negative scan.
function drawDust(ctx, L, rnd) {
    const amount = state.dust / 100;

    if (amount <= 0) {
        return;
    }

    const inPhoto = (x, y) => x > L.px && x < L.px + L.pw && y > L.py && y < L.py + L.ph;
    const randomPoint = border => {
        for (let tries = 0; tries < 8; tries++) {
            const x = L.x0 + rnd() * L.cw;
            const y = L.y0 + rnd() * L.ch;

            if (inPhoto(x, y) !== border) {
                return [x, y];
            }
        }

        return [L.x0 + rnd() * L.cw, L.y0 + rnd() * L.ch];
    };

    ctx.save();
    ctx.fillStyle = '#f4f1ea';
    ctx.strokeStyle = '#f4f1ea';
    ctx.lineCap = 'round';

    const specks = Math.round(amount * 80);

    for (let i = 0; i < specks; i++) {
        const [x, y] = randomPoint(rnd() < 0.7);
        const r = L.s * (0.00035 + 0.0018 * Math.pow(rnd(), 3));
        ctx.globalAlpha = 0.35 + 0.6 * rnd();
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (0.5 + 0.5 * rnd()), rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    const hairs = Math.round(amount * 4 + rnd() * amount * 2);

    for (let i = 0; i < hairs; i++) {
        const [x, y] = randomPoint(rnd() < 0.75);
        const len = L.s * (0.02 + 0.07 * rnd());
        const a = rnd() * Math.PI * 2;
        const ex = x + Math.cos(a) * len;
        const ey = y + Math.sin(a) * len;
        const bend = () => (rnd() - 0.5) * len * 0.8;
        ctx.globalAlpha = 0.55 + 0.35 * rnd();
        ctx.lineWidth = L.s * (0.0005 + 0.0005 * rnd());
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + (ex - x) / 3 + bend(), y + (ey - y) / 3 + bend(), x + (ex - x) * 2 / 3 + bend(), y + (ey - y) * 2 / 3 + bend(), ex, ey);
        ctx.stroke();
    }

    ctx.restore();
}

// Run fn in a frame where the card's long side is horizontal, so film
// details (sprocket holes, edge print) can be drawn one way only.
function inLongSideFrame(ctx, L, fn) {
    ctx.save();
    let w = L.cw;
    let h = L.ch;

    if (L.ch > L.cw) {
        ctx.rotate(-Math.PI / 2);
        w = L.ch;
        h = L.cw;
    }

    fn(-w / 2, -h / 2, w, h);
    ctx.restore();
}

function edgePrint(ctx, mm, rs, draw) {
    ctx.save();
    ctx.fillStyle = state.edgeColor;
    ctx.globalAlpha = 0.88;
    ctx.textBaseline = 'middle';
    draw();
    ctx.restore();
}

function edgeFont(size) {
    return `600 ${size}px "Helvetica Neue", Arial, sans-serif`;
}

function film35Path(L) {
    const mm = L.s / 24;
    const path = new Path2D();
    path.rect(L.x0, L.y0, L.cw, L.ch);
    const vertical = L.ch > L.cw;
    const long = vertical ? L.ch : L.cw;
    const across = vertical ? L.cw : L.ch;
    const pitch = 4.75 * mm;
    const holeAlong = 2.8 * mm;
    const holeAcross = 1.98 * mm;
    const edge = 2.0 * mm;
    const r = 0.5 * mm;

    // Fit a whole number of perforations so the strip is cut through the
    // middle of a hole on both ends, like a strip cut from a longer roll.
    const count = Math.max(2, Math.round(long / pitch));
    const step = long / count;

    for (let j = 0; j <= count; j++) {
        const along = -long / 2 + j * step;

        [-across / 2 + edge, across / 2 - edge - holeAcross].forEach(off => {
            const x = vertical ? off : along - holeAlong / 2;
            const y = vertical ? along - holeAlong / 2 : off;
            const w = vertical ? holeAcross : holeAlong;
            const h = vertical ? holeAlong : holeAcross;

            if (path.roundRect) {
                path.roundRect(x, y, w, h, r);
            } else {
                path.rect(x, y, w, h);
            }
        });
    }

    return path;
}

function paintFilm35(ctx, L, k, rs, rnd, caption) {
    const mm = L.s / 24;
    fillFilmBase(ctx, film35Path(L), L, rnd);

    inLongSideFrame(ctx, L, (x0, y0, w, h) => {
        const edge = 2.0 * mm;
        const frameNo = k + 1;
        const at = f => x0 + w * f;

        edgePrint(ctx, mm, rs, () => {
            ctx.textAlign = 'left';

            if (caption) {
                fitFont(ctx, caption, captionFontOr(edgeFont), 1.2 * mm * Math.min(1.4, state.captionSize / 100), w * 0.48);
                ctx.fillText(caption, at(0.08), y0 + edge * 0.5);
            } else {
                ctx.font = edgeFont(1.2 * mm);
                ctx.fillText(state.filmStock, at(0.08), y0 + edge * 0.5);
            }

            ctx.font = edgeFont(1.2 * mm);
            ctx.fillText(state.filmStock, at(0.62), y0 + edge * 0.5);
            ctx.textAlign = 'center';
            ctx.fillText(String(frameNo), at(0.3), y0 + h - edge * 0.5);
            ctx.fillText(`▸${frameNo}A`, at(0.78), y0 + h - edge * 0.5);
        });
    });
}

function paintFilm120(ctx, L, k, rs, rnd, caption) {
    const mm = L.s / 56;
    const path = new Path2D();
    path.rect(L.x0, L.y0, L.cw, L.ch);
    fillFilmBase(ctx, path, L, rnd);

    inLongSideFrame(ctx, L, (x0, y0, w, h) => {
        const band = (h - (L.ch > L.cw ? L.pw : L.ph)) / 2;

        edgePrint(ctx, mm, rs, () => {
            ctx.font = edgeFont(Math.min(1.9 * mm, band * 0.42));
            ctx.textAlign = 'left';
            ctx.fillText(state.filmStock, x0 + w * 0.06, y0 + band * 0.5);
            ctx.textAlign = 'right';
            ctx.fillText(`${k + 1}  ◀`, x0 + w * 0.94, y0 + band * 0.5);

            if (caption) {
                ctx.textAlign = 'center';
                fitFont(ctx, caption, captionFontOr(edgeFont), Math.min(1.9 * mm, band * 0.42) * Math.min(1.4, state.captionSize / 100), w * 0.8);
                ctx.fillText(caption, x0 + w / 2, y0 + h - band * 0.5);
            }
        });
    });
}

const CAPTION_BELOW = ['none', 'border', 'rough'];

function captionFor(photo, k) {
    if (state.captionMode === 'off') {
        return '';
    }

    const raw = state.captionMode === 'same' ? state.captionText : (photo.caption || '');
    const values = {
        n: String(k + 1),
        camera: photo.camera || '',
        film: photo.film || '',
        name: photo.name.replace(/\.[^.]+$/, ''),
        date: photo.date || ''
    };

    return raw
        .replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match))
        // Drop separators left dangling by empty tokens ("Camera · ").
        .replace(/(\s*[·|]\s*){2,}/g, ' · ')
        .replace(/^\s*[·|]\s*|\s*[·|]\s*$/g, '')
        .trim();
}

function captionPx(W, H) {
    return Math.min(W, H) * 0.024 * (state.captionSize / 100);
}

function captionInk(edge = 'bottom') {
    const stops = state.gradient;
    const color = state.bgType === 'solid' ? state.bgColor
        : state.bgType === 'gradient' ? (edge === 'top' ? stops[0] : stops[stops.length - 1])
        : '#000000';
    const n = parseInt(color.slice(1), 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.55 ? 'rgba(24, 22, 20, 0.8)' : 'rgba(255, 255, 255, 0.88)';
}

function fitFont(ctx, text, font, size, maxWidth) {
    let px = size;
    ctx.font = font(px);

    while (px > 4 && ctx.measureText(text).width > maxWidth) {
        px *= 0.92;
        ctx.font = font(px);
    }

    return px;
}

function fontById(id) {
    return FONTS.find(font => font.id === id) || FONTS[0];
}

function fontSpec(id) {
    const font = fontById(id);
    const fallback = font.group === 'Serif' ? 'Georgia, serif' : font.group === 'Mono' ? 'ui-monospace, Menlo, monospace' : font.group === 'Handwritten' ? 'cursive' : '"Helvetica Neue", Arial, sans-serif';
    return size => `${font.weight} ${size}px "${font.family}", ${fallback}`;
}

const fontLoads = new Map();

// Canvas only draws with a web font once it has loaded; load it, then redraw.
function loadFont(id) {
    const font = fontById(id);

    if (!fontLoads.has(font.id)) {
        fontLoads.set(font.id, document.fonts.load(`${font.weight} 20px "${font.family}"`, 'АаZz').catch(() => {}).then(() => {
            cardCache.clear();
            draw();
        }));
    }

    return fontLoads.get(font.id);
}

// The caption font: the chosen one, or what suits the frame ("auto").
function captionFontOr(fallback) {
    if (state.captionFont === 'auto') {
        return fallback;
    }

    loadFont(state.captionFont);
    return fontSpec(state.captionFont);
}

function titlePx(W, H) {
    return Math.min(W, H) * 0.042 * (state.titleSize / 100);
}

function titleBand(W, H) {
    return state.title.trim() ? titlePx(W, H) * 2.2 : 0;
}

function drawTitle(ctx, W, H, t) {
    const text = state.title.trim();

    if (!text) {
        return;
    }

    let alpha = 1;

    if (state.titleMode === 'intro' && photos.length > 1) {
        const { D, T } = timing();
        const end = D - T;
        alpha = t < end ? 1 : Math.max(0, 1 - (t - end) / Math.max(T, 0.5));
    }

    if (alpha <= 0) {
        return;
    }

    const px = titlePx(W, H);
    const pad = (state.padding / 100) * Math.min(W, H);
    const font = fontSpec(state.titleFont);
    loadFont(state.titleFont);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = captionInk('top');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if ('letterSpacing' in ctx) {
        ctx.letterSpacing = ['Sans', 'Mono'].includes(fontById(state.titleFont).group) ? `${(px * 0.03).toFixed(1)}px` : '0px';
    }

    fitFont(ctx, text, font, px, W * 0.9);
    ctx.fillText(text, W / 2, pad + titleBand(W, H) / 2);
    ctx.restore();
}

const uiFont = size => `500 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
const handFont = size => `500 ${size}px Caveat, "Bradley Hand", "Segoe Print", cursive`;

// Settings that change what a card looks like; anything else is applied when it is drawn.
const CARD_KEYS = ['trimEdges', 'captionFont', 'gateRough', 'title', 'titleSize', 'captionMode', 'captionText', 'captionSize', 'frame', 'frameColor', 'frameThickness', 'radius', 'roughness', 'filmStock', 'edgeColor', 'padding', 'dust', 'kenBurns', 'transition'];
const cardCache = new Map();

function cardSignature() {
    return CARD_KEYS.map(key => String(state[key])).join('|');
}

function getCard(k, W, H, mode) {
    const photo = photos[k];
    const full = mode === 'full' ? fullCache.get(photo.id) : null;
    const image = full || photo.preview;
    const key = `${photo.id}|${W}x${H}|${full ? 'full' : 'preview'}|${cardSignature()}|${k}|${photo.caption || ''}`;
    let card = cardCache.get(key);

    if (card) {
        cardCache.delete(key);
    } else {
        card = renderCard(photo, k, image, W, H);
    }

    cardCache.set(key, card);
    const limit = mode === 'full' ? 4 : 40;

    while (cardCache.size > limit) {
        cardCache.delete(cardCache.keys().next().value);
    }

    return card;
}

// Each photo's card (frame + photo) is rendered once per size and settings,
// at enough resolution for the slow zoom, then reused for every frame.
function renderCard(photo, k, image, W, H) {
    const caption = captionFor(photo, k);
    const below = Boolean(caption) && CAPTION_BELOW.includes(state.frame);
    const captionSize = captionPx(W, H);
    const L = layout(photo, W, H, below ? captionSize * 2.6 : 0);
    const room = 1 + state.kenBurns / 100 + (state.transition === 'zoom' ? 0.12 : 0);
    const rs = Math.min(room, 8192 / Math.max(L.cw, L.ch));
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(L.cw * rs);
    canvas.height = Math.ceil(L.ch * rs);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(rs, 0, 0, rs, canvas.width / 2, canvas.height / 2);
    ctx.imageSmoothingQuality = 'high';

    const rnd = mulberry32(photo.seed);
    const r = state.roughness / 100;
    const devS = L.s * rs; // photo short side in device pixels

    switch (state.frame) {
        case 'border': {
            const radius = (state.radius / 100) * L.s;
            roundRectPath(ctx, L.x0, L.y0, L.cw, L.ch, radius);
            ctx.fillStyle = state.frameColor;
            ctx.fill();
            ctx.save();
            roundRectPath(ctx, L.px, L.py, L.pw, L.ph, radius * 0.4);
            ctx.clip();
            drawPhoto(ctx, image, L.px, L.py, L.pw, L.ph);
            ctx.restore();
            break;
        }
        case 'rough': {
            const path = windowPath(L.px, L.py, L.pw, L.ph, windowOptions(rnd, L, rs, {
                amp: L.s * (0.003 + 0.016 * r),
                fuzz: L.s * (0.0006 + 0.0018 * r),
                corner: L.s * 0.002
            }));
            drawThroughWindow(ctx, image, L, path, Math.max(0.5, devS * (0.0006 + 0.001 * r)));
            break;
        }
        case 'carrier': {
            const outer = windowPath(L.x0, L.y0, L.cw, L.ch, windowOptions(rnd, L, rs, { amp: L.s * 0.002, fuzz: L.s * 0.0005, corner: L.s * 0.003 }));
            fillFilmBase(ctx, outer, L, rnd);
            const inner = windowPath(L.px, L.py, L.pw, L.ph, windowOptions(rnd, L, rs, {
                amp: L.s * (0.003 + 0.016 * r),
                fuzz: L.s * (0.0006 + 0.0018 * r),
                corner: L.s * (0.002 + 0.004 * r),
                cornerJitter: 0.8,
                inset: L.s * (0.004 + 0.012 * r),
                ears: 0.25 + 0.4 * r
            }));
            drawThroughWindow(ctx, image, L, inner, Math.max(0.6, devS * (0.0008 + 0.0014 * r)));

            if (caption) {
                const border = L.ch / 2 - (L.py + L.ph);
                ctx.save();
                ctx.fillStyle = state.edgeColor;
                ctx.globalAlpha = 0.92;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                fitFont(ctx, caption, captionFontOr(edgeFont), border * 0.3 * (state.captionSize / 100), L.pw * 0.9);
                ctx.fillText(caption, L.px + L.s * 0.01, L.py + L.ph + border * 0.52);
                ctx.restore();
            }

            drawDust(ctx, L, rnd);
            break;
        }
        case '35mm': {
            paintFilm35(ctx, L, k, rs, rnd, caption);
            const g = state.gateRough / 100;
            const gate = windowPath(L.px, L.py, L.pw, L.ph, windowOptions(rnd, L, rs, {
                amp: L.s * 0.016 * g,
                fuzz: L.s * (0.0006 + 0.0018 * g),
                corner: (L.s / 24) * 0.35 * (1 - 0.6 * g),
                cornerJitter: 0.3 + 0.5 * g,
                inset: L.s * 0.012 * g,
                ears: 0.5 * g
            }));
            drawThroughWindow(ctx, image, L, gate, Math.max(0.5, devS * (0.0011 + 0.0012 * g)));
            drawDust(ctx, L, rnd);
            break;
        }
        case '120': {
            paintFilm120(ctx, L, k, rs, rnd, caption);
            const g = state.gateRough / 100;
            const gate = windowPath(L.px, L.py, L.pw, L.ph, windowOptions(rnd, L, rs, {
                fuzz: L.s * (0.0007 + 0.0018 * g),
                amp: L.s * (0.0012 + 0.016 * g),
                corner: (L.s / 56) * 0.6 * (1 - 0.6 * g),
                cornerJitter: 0.4 + 0.4 * g,
                inset: L.s * 0.012 * g,
                ears: 0.5 * g
            }));
            drawThroughWindow(ctx, image, L, gate, Math.max(0.5, devS * (0.0012 + 0.0012 * g)));
            drawDust(ctx, L, rnd);
            break;
        }
        case 'polaroid':
        case 'instax': {
            const paper = new Path2D();

            if (paper.roundRect) {
                paper.roundRect(L.x0, L.y0, L.cw, L.ch, state.frame === 'instax' ? L.s * 0.035 : L.s * 0.006);
            } else {
                paper.rect(L.x0, L.y0, L.cw, L.ch);
            }

            ctx.fillStyle = state.frameColor;
            ctx.fill(paper);
            paperTexture(ctx, paper, L);
            drawPhoto(ctx, image, L.px, L.py, L.pw, L.ph);
            // The print sits slightly recessed in the frame.
            ctx.save();
            ctx.beginPath();
            ctx.rect(L.px, L.py, L.pw, L.ph);
            ctx.clip();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = devS * 0.006;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.lineWidth = L.s * 0.003;
            ctx.strokeRect(L.px, L.py, L.pw, L.ph);
            ctx.restore();

            if (caption) {
                const bottom = L.ch / 2 - (L.py + L.ph);
                ctx.save();
                ctx.fillStyle = 'rgba(30, 30, 34, 0.85)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                fitFont(ctx, caption, captionFontOr(handFont), bottom * 0.34 * (state.captionSize / 100), L.pw * 0.92);
                ctx.fillText(caption, 0, L.py + L.ph + bottom * 0.5);
                ctx.restore();
            }
            break;
        }
        default: {
            ctx.save();
            roundRectPath(ctx, L.px, L.py, L.pw, L.ph, (state.radius / 100) * L.s);
            ctx.clip();
            drawPhoto(ctx, image, L.px, L.py, L.pw, L.ph);
            ctx.restore();
        }
    }

    return { canvas, cw: L.cw, ch: L.ch, dy: L.dy, caption: below ? caption : '', captionSize };
}

function drawCard(ctx, W, H, k, t, mode, { dx = 0, dy = 0, scale = 1, alpha = 1 } = {}) {
    if (alpha <= 0.001) {
        return;
    }

    const card = getCard(k, W, H, mode);
    const zoom = 1 + (state.kenBurns / 100) * lifeProgress(k, t);

    ctx.save();
    ctx.translate(W / 2 + dx, H / 2 + dy + card.dy);
    ctx.scale(scale * zoom, scale * zoom);
    ctx.globalAlpha = alpha;
    ctx.save();
    applyShadow(ctx, W, H);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(card.canvas, -card.cw / 2, -card.ch / 2, card.cw, card.ch);
    ctx.restore();

    if (card.caption) {
        ctx.fillStyle = captionInk();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fitFont(ctx, card.caption, captionFontOr(uiFont), card.captionSize, W * 0.9);
        ctx.fillText(card.caption, 0, card.ch / 2 + card.captionSize * 1.4);
    }

    ctx.restore();
}

function drawCover(ctx, image, W, H, alpha) {
    const scale = Math.max(W / image.width, H / image.height) * 1.05;
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
    ctx.globalAlpha = 1;
}

function makeGradient(ctx, W, H) {
    let gradient;

    switch (state.bgDirection) {
        case 'horizontal':
            gradient = ctx.createLinearGradient(0, 0, W, 0);
            break;
        case 'diagonal':
            gradient = ctx.createLinearGradient(0, 0, W, H);
            break;
        case 'diagonal-up':
            gradient = ctx.createLinearGradient(0, H, W, 0);
            break;
        case 'radial':
            gradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
            break;
        default:
            gradient = ctx.createLinearGradient(0, 0, 0, H);
    }

    const stops = state.gradient;
    stops.forEach((color, index) => gradient.addColorStop(index / (stops.length - 1), color));
    return gradient;
}

function drawBackground(ctx, W, H, scene) {
    if (state.bgType === 'blur' && photos.length) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingQuality = 'high';
        drawCover(ctx, photos[scene.a].blur, W, H, 1);

        if (scene.b >= 0) {
            drawCover(ctx, photos[scene.b].blur, W, H, scene.p);
        }

        ctx.fillStyle = `rgba(0, 0, 0, ${state.blurDim / 100})`;
        ctx.fillRect(0, 0, W, H);
        return;
    }

    if (state.bgType === 'gradient') {
        ctx.fillStyle = makeGradient(ctx, W, H);
        ctx.fillRect(0, 0, W, H);

        // A touch of static noise so soft gradients don't band once encoded.
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.04;
        ctx.fillStyle = ctx.createPattern(grainTiles[2], 'repeat');
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        return;
    }

    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, W, H);
}

function drawGrain(ctx, W, H, frameIndex) {
    if (state.grain <= 0) {
        return;
    }

    const rnd = mulberry32(frameIndex * 7919 + 13);
    const scale = Math.max(W, H) / 1920;
    const pattern = ctx.createPattern(grainTiles[frameIndex % grainTiles.length], 'repeat');
    pattern.setTransform(new DOMMatrix().translate(rnd() * 256 * scale, rnd() * 256 * scale).scale(scale));

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = (state.grain / 100) * 0.55;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
}

function drawScene(ctx, W, H, t, mode, frameIndex, still = false) {
    if (!photos.length) {
        drawBackground(ctx, W, H, { a: 0, b: -1, p: 0 });
        return;
    }

    const scene = sceneAt(t);
    const { a, b, p } = scene;

    drawBackground(ctx, W, H, scene);

    if (b < 0) {
        drawCard(ctx, W, H, a, t, mode);
    } else {
        switch (state.transition) {
            case 'fade':
                if (p < 0.5) {
                    drawCard(ctx, W, H, a, t, mode, { alpha: 1 - p * 2 });
                } else {
                    drawCard(ctx, W, H, b, t, mode, { alpha: p * 2 - 1 });
                }
                break;
            case 'push-left': {
                // Cards wider than the video (an edge-to-edge strip) travel
                // their own width, so neighbouring strips meet end to end.
                const span = Math.max(W, (getCard(a, W, H, mode).cw + getCard(b, W, H, mode).cw) / 2);
                drawCard(ctx, W, H, a, t, mode, { dx: -p * span });
                drawCard(ctx, W, H, b, t, mode, { dx: (1 - p) * span });
                break;
            }
            case 'push-up': {
                const span = Math.max(H, (getCard(a, W, H, mode).ch + getCard(b, W, H, mode).ch) / 2);
                drawCard(ctx, W, H, a, t, mode, { dy: -p * span });
                drawCard(ctx, W, H, b, t, mode, { dy: (1 - p) * span });
                break;
            }
            case 'slide':
                drawCard(ctx, W, H, a, t, mode);
                drawCard(ctx, W, H, b, t, mode, { dx: (1 - p) * W });
                break;
            case 'zoom':
                drawCard(ctx, W, H, a, t, mode, { scale: 1 + 0.12 * p, alpha: 1 - p });
                drawCard(ctx, W, H, b, t, mode, { scale: 0.9 + 0.1 * p, alpha: p });
                break;
            default:
                drawCard(ctx, W, H, a, t, mode, { alpha: 1 - p });
                drawCard(ctx, W, H, b, t, mode, { alpha: p });
        }
    }

    drawTitle(ctx, W, H, t);
    drawGrain(ctx, W, H, frameIndex);

    if (state.fadeEdges && !still) {
        const { total } = timing();
        const fade = Math.min(0.8, total / 4);
        const visible = Math.min(1, t / fade, (total - t) / fade);

        if (visible < 1) {
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - Math.max(0, visible)})`;
            ctx.fillRect(0, 0, W, H);
        }
    }
}

/* ------------------------------------------------------------------- preview */

function layoutPreview() {
    const fmt = currentFormat();
    const box = el.viewport.getBoundingClientRect();
    const availW = Math.max(100, box.width - 40);
    const availH = Math.max(100, box.height - 40);
    const scale = Math.min(availW / fmt.w, availH / fmt.h);
    const cssW = Math.floor(fmt.w * scale);
    const cssH = Math.floor(fmt.h * scale);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pxScale = Math.min(dpr, 1600 / cssW);

    el.preview.style.width = `${cssW}px`;
    el.preview.style.height = `${cssH}px`;
    el.preview.width = Math.max(2, Math.round(cssW * pxScale));
    el.preview.height = Math.max(2, Math.round(cssH * pxScale));
}

function draw() {
    if (exporting) {
        return;
    }

    const { total } = timing();
    drawScene(previewCtx, el.preview.width, el.preview.height, time, 'preview', Math.floor(time * state.fps));

    el.scrubber.max = String(Math.max(0.01, total));
    el.scrubber.value = String(time);
    el.timeNow.textContent = formatTime(time);
    el.timeTotal.textContent = formatTime(total);

    const current = photos.length ? sceneAt(time).a : -1;
    el.list.querySelectorAll('.photo-item').forEach((item, index) => {
        item.classList.toggle('is-current', index === current);
    });
}

function clampTime() {
    const { total } = timing();
    time = Math.min(Math.max(0, time), Math.max(0, total - 0.001));
}

function setPlaying(value) {
    playing = value && photos.length > 0 && !exporting;
    el.play.innerHTML = playing ? '<i class="bi bi-pause-fill"></i>' : '<i class="bi bi-play-fill"></i>';
    el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');

    if (playing) {
        Sound.unlock();
        Music.play(time);
        lastTick = performance.now();
        requestAnimationFrame(tick);
    } else {
        Music.stop();
    }
}

function tick(now) {
    if (!playing) {
        return;
    }

    const { total } = timing();
    const before = time;
    time += (now - lastTick) / 1000;
    lastTick = now;

    if (time >= total) {
        time = 0;
        Music.play(0);
        Sound.playBetween(before, total);
        Sound.playBetween(-1, time);
    } else {
        Sound.playBetween(before, time);
    }

    draw();
    requestAnimationFrame(tick);
}

function updateSummary() {
    const fmt = currentFormat();
    const { total } = timing();
    const bitrate = fmt.w * fmt.h * state.fps * QUALITY[state.quality];
    const sizeMb = (bitrate * total) / 8 / 1e6;
    el.summary.textContent = photos.length
        ? `${fmt.w}×${fmt.h} · ${state.fps} fps · ${Math.round(total * state.fps)} frames · ~${(bitrate / 1e6).toFixed(0)} Mbps · ≈${sizeMb.toFixed(0)} MB`
        : `${fmt.w}×${fmt.h} · ${state.fps} fps · add photos to start`;
}

/* -------------------------------------------------------------------- photos */

async function decodePhoto(file, record) {
    const bitmap = await createImageBitmap(file);
    const preview = scaleToCanvas(bitmap, PREVIEW_MAX_SIDE);
    const photo = {
        id: record.id,
        name: record.name || file.name,
        camera: record.camera || '',
        film: record.film || '',
        date: record.date || '',
        caption: record.caption || '',
        seed: record.seed || Math.floor(Math.random() * 1e9),
        file,
        w: bitmap.width,
        h: bitmap.height,
        preview,
        blur: makeBlurred(preview),
        thumb: scaleToCanvas(preview, 160).toDataURL('image/jpeg', 0.8)
    };
    bitmap.close();
    return photo;
}

async function addFiles(fileList) {
    const files = Array.from(fileList).filter(file => file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(file.name));
    const failed = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBusy(`Loading ${i + 1} / ${files.length}…`);

        try {
            const meta = file.reelMeta || {};
            const photo = await decodePhoto(file, {
                id: nextId++,
                name: file.name,
                camera: meta.camera,
                film: meta.film,
                date: meta.date,
                caption: [meta.camera, meta.film].filter(Boolean).join(' · ')
            });
            photos.push(photo);
            Store.putFile(`photo:${photo.id}`, file);
        } catch (error) {
            failed.push(file.name);
        }

        renderList();
        draw();
    }

    setBusy(null);
    persistPhotos();
    setStatus(failed.length ? `Couldn't read: ${failed.join(', ')}` : '', Boolean(failed.length));
}

/* ----------------------------------------------------------------- persistence */

// Photos (and a custom sound) are kept in IndexedDB so the reel survives reloads.
const Store = {
    db: null,
    open() {
        if (!this.db) {
            this.db = new Promise((resolve, reject) => {
                const request = indexedDB.open('photo-reel', 1);
                request.onupgradeneeded = () => {
                    request.result.createObjectStore('files');
                    request.result.createObjectStore('meta');
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        return this.db;
    },
    async run(storeName, mode, fn) {
        try {
            const db = await this.open();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, mode);
                const request = fn(tx.objectStore(storeName));
                tx.oncomplete = () => resolve(request ? request.result : undefined);
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            return undefined; // Private mode / blocked storage: just don't persist.
        }
    },
    putFile(key, blob) {
        return this.run('files', 'readwrite', store => store.put(blob, key));
    },
    getFile(key) {
        return this.run('files', 'readonly', store => store.get(key));
    },
    deleteFile(key) {
        return this.run('files', 'readwrite', store => store.delete(key));
    },
    putMeta(key, value) {
        return this.run('meta', 'readwrite', store => store.put(value, key));
    },
    getMeta(key) {
        return this.run('meta', 'readonly', store => store.get(key));
    }
};

let persistTimer = 0;

function persistPhotos() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
        Store.putMeta('photos', photos.map(({ id, name, caption, camera, film, date, seed }) => ({ id, name, caption, camera, film, date, seed })));
    }, 300);
}

async function restorePhotos() {
    const list = await Store.getMeta('photos');

    if (!Array.isArray(list) || !list.length) {
        return;
    }

    for (let i = 0; i < list.length; i++) {
        setBusy(`Restoring ${i + 1} / ${list.length}…`);
        const record = list[i];
        const file = await Store.getFile(`photo:${record.id}`);

        if (!file) {
            continue;
        }

        try {
            photos.push(await decodePhoto(file, record));
            nextId = Math.max(nextId, record.id + 1);
        } catch (error) {
            // Skip anything that no longer decodes.
        }

        renderList();
        draw();
    }

    setBusy(null);
}

function renderList() {
    el.count.textContent = String(photos.length);
    el.list.innerHTML = photos.map((photo, index) => `
        <li class="photo-item" draggable="true" data-index="${index}">
            <span class="photo-index">${index + 1}</span>
            <img src="${photo.thumb}" alt="" />
            <span class="photo-text">
                <span class="photo-name" title="${escapeHtml(photo.name)}">${escapeHtml(photo.name)}</span>
                <input class="photo-caption" data-caption="${index}" value="${escapeHtml(photo.caption || '')}" placeholder="Caption…" maxlength="80" />
            </span>
            <button type="button" class="photo-remove" data-remove="${index}" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
        </li>`).join('');
    updateSummary();
    clampTime();
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function movePhoto(from, to) {
    if (from === to || from < 0) {
        return;
    }

    const [item] = photos.splice(from, 1);
    photos.splice(to > from ? to - 1 : to, 0, item);
    persistPhotos();
    renderList();
    draw();
}

function bindList() {
    let dragIndex = -1;

    el.list.addEventListener('input', event => {
        const input = event.target.closest('[data-caption]');

        if (input) {
            photos[Number(input.dataset.caption)].caption = input.value;
            persistPhotos();
            draw();
        }
    });

    // Text inputs inside draggable rows: don't start a drag while editing.
    el.list.addEventListener('pointerdown', event => {
        const row = event.target.closest('.photo-item');

        if (row) {
            row.draggable = !event.target.closest('input');
        }
    });

    el.list.addEventListener('click', event => {
        const remove = event.target.closest('[data-remove]');

        if (remove) {
            const [removed] = photos.splice(Number(remove.dataset.remove), 1);
            Store.deleteFile(`photo:${removed.id}`);
            persistPhotos();
            renderList();
            draw();
            return;
        }

        const item = event.target.closest('.photo-item');

        if (item) {
            setPlaying(false);
            time = Number(item.dataset.index) * state.duration;
            draw();
        }
    });

    el.list.addEventListener('dragstart', event => {
        const item = event.target.closest('.photo-item');

        if (!item) {
            return;
        }

        dragIndex = Number(item.dataset.index);
        item.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(dragIndex));
    });

    el.list.addEventListener('dragover', event => {
        if (dragIndex < 0) {
            return;
        }

        event.preventDefault();
        const item = event.target.closest('.photo-item');
        el.list.querySelectorAll('.drop-before, .drop-after').forEach(node => node.classList.remove('drop-before', 'drop-after'));

        if (item) {
            const rect = item.getBoundingClientRect();
            item.classList.add(event.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
        }
    });

    el.list.addEventListener('drop', event => {
        if (dragIndex < 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const item = event.target.closest('.photo-item');

        if (item) {
            const index = Number(item.dataset.index);
            const after = item.classList.contains('drop-after');
            movePhoto(dragIndex, after ? index + 1 : index);
        }
    });

    el.list.addEventListener('dragend', () => {
        dragIndex = -1;
        renderList();
    });

    // Files dropped anywhere on the page.
    let depth = 0;
    const hasFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');

    document.addEventListener('dragenter', event => {
        if (hasFiles(event)) {
            depth += 1;
            document.body.classList.add('is-dropping');
        }
    });

    document.addEventListener('dragleave', event => {
        if (hasFiles(event)) {
            depth = Math.max(0, depth - 1);
            document.body.classList.toggle('is-dropping', depth > 0);
        }
    });

    document.addEventListener('dragover', event => {
        if (hasFiles(event)) {
            event.preventDefault();
        }
    });

    document.addEventListener('drop', event => {
        if (!hasFiles(event)) {
            return;
        }

        event.preventDefault();
        depth = 0;
        document.body.classList.remove('is-dropping');

        if (!exporting) {
            addFiles(event.dataTransfer.files);
        }
    });

    el.dropzone.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', () => {
        addFiles(el.fileInput.files);
        el.fileInput.value = '';
    });

    document.querySelector('.panel-foot').addEventListener('click', event => {
        const button = event.target.closest('[data-action]');

        if (!button || exporting) {
            return;
        }

        if (button.dataset.action === 'sort') {
            photos.sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
        } else if (button.dataset.action === 'shuffle') {
            for (let i = photos.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [photos[i], photos[j]] = [photos[j], photos[i]];
            }
        } else if (button.dataset.action === 'clear') {
            photos.forEach(photo => Store.deleteFile(`photo:${photo.id}`));
            photos = [];
            setPlaying(false);
            time = 0;
        }

        persistPhotos();
        renderList();
        draw();
    });
}

/* --------------------------------------------------------- film gallery import */

// The Photos app's Lomography library. Its CDN sends CORS headers, so the
// images can be drawn into the canvas and exported.
const Gallery = {
    data: null,
    album: 'all',
    selected: new Set(),
    els: {},
    init() {
        ['picker', 'picker-album', 'picker-all', 'picker-close', 'picker-grid', 'picker-meta', 'picker-import'].forEach(id => {
            this.els[id] = document.getElementById(id);
        });

        document.getElementById('lomo-open').addEventListener('click', () => this.open());
        this.els['picker-close'].addEventListener('click', () => this.close());
        this.els.picker.addEventListener('click', event => {
            if (event.target === this.els.picker) {
                this.close();
            }
        });
        this.els['picker-album'].addEventListener('change', () => {
            this.album = this.els['picker-album'].value;
            this.renderGrid();
        });
        this.els['picker-all'].addEventListener('click', () => {
            const visible = this.visible();
            const allOn = visible.every(photo => this.selected.has(photo.id));
            visible.forEach(photo => (allOn ? this.selected.delete(photo.id) : this.selected.add(photo.id)));
            this.renderGrid();
        });
        this.els['picker-grid'].addEventListener('click', event => {
            const item = event.target.closest('[data-photo]');

            if (!item) {
                return;
            }

            const id = item.dataset.photo;

            if (this.selected.has(id)) {
                this.selected.delete(id);
            } else {
                this.selected.add(id);
            }

            item.classList.toggle('is-selected', this.selected.has(id));
            this.updateMeta();
        });
        this.els['picker-import'].addEventListener('click', () => this.importSelected());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !this.els.picker.hidden) {
                this.close();
            }
        });
    },
    async open() {
        if (exporting) {
            return;
        }

        this.els.picker.hidden = false;

        if (!this.data) {
            this.els['picker-grid'].innerHTML = '<div class="picker-loading"><span class="spinner"></span> Loading gallery…</div>';

            try {
                const response = await fetch('../photos/lomography.json', { cache: 'no-cache' });
                this.data = await response.json();
            } catch (error) {
                this.els['picker-grid'].innerHTML = '<p class="picker-meta">Couldn\'t load the gallery.</p>';
                return;
            }

            const albums = this.data.albums || [];
            this.els['picker-album'].innerHTML = `<option value="all">All photos (${this.data.photos.length})</option>` +
                albums.map(album => {
                    const count = this.data.photos.filter(photo => (photo.albums || []).includes(album.slug)).length;
                    return `<option value="${escapeHtml(album.slug)}">${escapeHtml(album.title)} (${count})</option>`;
                }).join('');
        }

        this.renderGrid();
    },
    close() {
        this.els.picker.hidden = true;
    },
    visible() {
        const all = this.data ? this.data.photos : [];
        return this.album === 'all' ? all : all.filter(photo => (photo.albums || []).includes(this.album));
    },
    renderGrid() {
        this.els['picker-grid'].innerHTML = this.visible().map(photo => `
            <button type="button" class="picker-item ${this.selected.has(photo.id) ? 'is-selected' : ''}" data-photo="${escapeHtml(photo.id)}" title="${escapeHtml([photo.camera, photo.film].filter(Boolean).join(' · '))}">
                <img src="${escapeHtml(photo.thumb)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.classList.add('is-loaded')" />
            </button>`).join('');
        this.updateMeta();
    },
    updateMeta() {
        const count = this.selected.size;
        const visible = this.visible();
        this.els['picker-all'].textContent = visible.length && visible.every(photo => this.selected.has(photo.id)) ? 'Select none' : 'Select all';
        this.els['picker-meta'].textContent = count ? `${count} selected` : 'Pick photos to add to the reel';
        this.els['picker-import'].disabled = count === 0;
        this.els['picker-import'].textContent = count ? `Import ${count}` : 'Import';
    },
    async importSelected() {
        // Keep the gallery's order, not the click order.
        const chosen = this.data.photos.filter(photo => this.selected.has(photo.id));
        this.close();
        const files = new Array(chosen.length).fill(null);
        let done = 0;
        let next = 0;

        // A few downloads at a time; files keep the gallery order.
        const worker = async () => {
            while (next < chosen.length) {
                const index = next++;
                const photo = chosen[index];

                try {
                    // The largest size the CDN serves (about 2400px on the long side).
                    const response = await fetch(photo.image2x || photo.image, { mode: 'cors' });

                    if (!response.ok) {
                        throw new Error(String(response.status));
                    }

                    const blob = await response.blob();
                    const label = [photo.film, photo.id].filter(Boolean).join(' ');
                    const file = new File([blob], `${label}.jpg`, { type: blob.type || 'image/jpeg' });
                    file.reelMeta = { camera: photo.camera, film: photo.film, date: photo.uploaded };
                    files[index] = file;
                } catch (error) {
                    // Counted below.
                }

                done += 1;
                setBusy(`Downloading ${done} / ${chosen.length}…`);
            }
        };

        setBusy(`Downloading 0 / ${chosen.length}…`);
        await Promise.all(Array.from({ length: Math.min(4, chosen.length) }, worker));
        const downloaded = files.filter(Boolean);

        this.selected.clear();
        await addFiles(downloaded);

        if (downloaded.length < chosen.length) {
            setStatus(`${chosen.length - downloaded.length} photo(s) couldn't be downloaded.`, true);
        }
    }
};

/* ------------------------------------------------------------------- presets */

// Your own named presets: a snapshot of every setting, kept in this browser.
const Presets = {
    key: 'photoReelPresets',
    list() {
        try {
            const list = JSON.parse(localStorage.getItem(this.key) || '[]');
            return Array.isArray(list) ? list.filter(item => item && typeof item.name === 'string' && item.values) : [];
        } catch (error) {
            return [];
        }
    },
    write(list) {
        try {
            localStorage.setItem(this.key, JSON.stringify(list));
        } catch (error) {
            setStatus('Couldn\'t save presets in this browser.', true);
        }
    },
    save(name) {
        const clean = name.trim().slice(0, 40);

        if (!clean) {
            el.presets.querySelector('[data-preset-name]').focus();
            return;
        }

        const values = JSON.parse(JSON.stringify(state));
        const list = this.list().filter(item => item.name !== clean);
        list.push({ name: clean, values });
        this.write(list);
        this.render();
        setStatus(`Saved preset “${clean}”.`);
    },
    apply(name) {
        const preset = this.list().find(item => item.name === name);

        if (!preset) {
            return;
        }

        const values = {};

        // Only known settings, so old presets keep working as settings change.
        Object.keys(DEFAULTS).forEach(key => {
            if (key in preset.values) {
                values[key] = preset.values[key];
            }
        });

        setState(values);
        renderControlsValues();
        this.render();
    },
    remove(name) {
        this.write(this.list().filter(item => item.name !== name));
        this.render();
    },
    matches(values) {
        return Object.keys(DEFAULTS).every(key => !(key in values) || JSON.stringify(values[key]) === JSON.stringify(state[key]));
    },
    render() {
        const list = this.list();
        el.presets.innerHTML = `
            <div class="preset-list">${list.length ? list.map(item => `
                <span class="preset ${this.matches(item.values) ? 'is-active' : ''}">
                    <button type="button" class="preset-apply" data-preset="${escapeHtml(item.name)}" title="Apply">${escapeHtml(item.name)}</button>
                    <button type="button" class="preset-remove" data-preset-remove="${escapeHtml(item.name)}" aria-label="Delete ${escapeHtml(item.name)}"><i class="bi bi-x"></i></button>
                </span>`).join('') : '<span class="note">No presets yet — set things up, name it, save.</span>'}</div>
            <form class="preset-save" data-preset-form>
                <input type="text" data-preset-name placeholder="Preset name" maxlength="40" />
                <button type="submit" class="btn btn--mini"><i class="bi bi-bookmark-plus"></i> Save</button>
            </form>`;
    },
    // Highlight the preset matching the current settings without re-rendering the form.
    mark() {
        const list = this.list();
        el.presets.querySelectorAll('.preset').forEach(node => {
            const item = list.find(entry => entry.name === node.querySelector('[data-preset]').dataset.preset);
            node.classList.toggle('is-active', Boolean(item && this.matches(item.values)));
        });
    },
    bind() {
        el.presets.addEventListener('click', event => {
            const remove = event.target.closest('[data-preset-remove]');

            if (remove) {
                this.remove(remove.dataset.presetRemove);
                return;
            }

            const apply = event.target.closest('[data-preset]');

            if (apply) {
                this.apply(apply.dataset.preset);
            }
        });

        el.presets.addEventListener('submit', event => {
            event.preventDefault();
            this.save(el.presets.querySelector('[data-preset-name]').value);
        });
    }
};

/* ------------------------------------------------------------------ controls */

function fieldHtml(field) {
    const id = `f-${field.key}`;
    const value = state[field.key];
    let input = '';

    if (field.type === 'select') {
        const option = ([v, label]) => `<option value="${v}" ${String(v) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        const groups = [];

        // Options may carry a group name as their third item: render <optgroup>s.
        field.options.forEach(item => {
            const name = item[2] || '';
            const last = groups[groups.length - 1];

            if (last && last.name === name) {
                last.items.push(item);
            } else {
                groups.push({ name, items: [item] });
            }
        });

        input = `<select id="${id}" data-key="${field.key}">${groups.map(group => group.name
            ? `<optgroup label="${escapeHtml(group.name)}">${group.items.map(option).join('')}</optgroup>`
            : group.items.map(option).join('')).join('')}</select>`;
    } else if (field.type === 'range') {
        input = `<div class="field-range"><input type="range" id="${id}" data-key="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" /><output data-output="${field.key}"></output></div>`;
    } else if (field.type === 'checkbox') {
        input = `<div><input type="checkbox" id="${id}" data-key="${field.key}" ${value ? 'checked' : ''} /></div>`;
    } else if (field.type === 'color') {
        input = `<div class="field-color">${field.swatches.map(c =>
            `<button type="button" class="swatch" data-swatch="${field.key}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" id="${id}" data-key="${field.key}" value="${value}" /></div>`;
    } else if (field.type === 'file') {
        input = `<div class="field-file"><button type="button" class="btn btn--mini" data-pick="${field.target}"><i class="bi bi-folder2-open"></i> Choose…</button><span class="file-name" data-file-name>${escapeHtml(value || 'No file yet')}</span><input type="file" accept="audio/*" hidden data-file-input="${field.target}" /></div>`;
    } else if (field.type === 'action') {
        input = `<div><button type="button" class="btn btn--mini" data-action-btn="${field.action}"><i class="bi ${field.icon || 'bi-volume-up'}"></i> ${escapeHtml(field.text)}</button></div>`;
    } else if (field.type === 'note') {
        return `<div class="field field--stack" data-field="${field.key}"><p class="note">${escapeHtml(field.text)}</p></div>`;
    } else if (field.type === 'gradient') {
        return `<div class="field field--stack" data-field="${field.key}">
            <label>${field.label}</label>
            ${[['Light', false], ['Dark', true]].map(([title, dark]) => `
                <span class="gradient-group">${title}</span>
                <div class="gradient-presets">${GRADIENTS.map((g, index) => Boolean(g.dark) !== dark ? '' :
                    `<button type="button" class="gradient-chip" data-gradient="${index}" title="${g.name}" style="background: linear-gradient(180deg, ${g.stops.join(', ')})"></button>`).join('')}</div>`).join('')}
            <div class="gradient-stops" data-stops></div>
        </div>`;
    } else {
        input = `<input type="text" id="${id}" data-key="${field.key}" value="${escapeHtml(String(value))}" maxlength="80" placeholder="${escapeHtml(field.placeholder || '')}" />`;
    }

    return `<div class="field" data-field="${field.key}"><label for="${id}">${field.label}</label>${input}</div>`;
}

function renderControls() {
    el.controls.innerHTML = SECTIONS.map(section => `
        <section class="section">
            <h3>${section.title}</h3>
            ${section.fields.map(fieldHtml).join('')}
        </section>`).join('');

    Presets.render();

    const allFields = SECTIONS.flatMap(section => section.fields);

    el.controls.addEventListener('input', event => {
        if (event.target.dataset.stop !== undefined) {
            const gradient = [...state.gradient];
            gradient[Number(event.target.dataset.stop)] = event.target.value;
            setState({ gradient });
            return;
        }

        const key = event.target.dataset.key;
        const field = allFields.find(f => f.key === key);

        if (!field) {
            return;
        }

        let value;

        if (field.type === 'checkbox') {
            value = event.target.checked;
        } else if (field.type === 'range' || field.number) {
            value = Number(event.target.value);
        } else {
            value = event.target.value;
        }

        setState({ [key]: value });
    });

    el.controls.addEventListener('click', event => {
        const swatch = event.target.closest('[data-swatch]');

        if (swatch) {
            setState({ [swatch.dataset.swatch]: swatch.dataset.color });
        }

        const pick = event.target.closest('[data-pick]');

        if (pick) {
            el.controls.querySelector(`[data-file-input="${pick.dataset.pick}"]`).click();
        }

        const actionBtn = event.target.closest('[data-action-btn]');

        if (actionBtn?.dataset.actionBtn === 'sound-test') {
            Sound.test();
        } else if (actionBtn?.dataset.actionBtn === 'music-new') {
            setState({ musicSeed: Math.floor(Math.random() * 1e9) });
        }

        const chip = event.target.closest('[data-gradient]');

        if (chip) {
            setState({ gradient: [...GRADIENTS[Number(chip.dataset.gradient)].stops] });
        }

        const stopAction = event.target.closest('[data-stop-action]');

        if (stopAction) {
            const gradient = [...state.gradient];

            if (stopAction.dataset.stopAction === 'add' && gradient.length < 4) {
                gradient.push(gradient[gradient.length - 1]);
            } else if (stopAction.dataset.stopAction === 'remove' && gradient.length > 2) {
                gradient.pop();
            } else if (stopAction.dataset.stopAction === 'reverse') {
                gradient.reverse();
            }

            setState({ gradient });
        }
    });

    el.controls.addEventListener('change', event => {
        const target = event.target.dataset.fileInput;

        if (target && event.target.files[0]) {
            if (target === 'music') {
                Music.setFile(event.target.files[0]);
            } else {
                Sound.setCustom(event.target.files[0]);
            }

            event.target.value = '';
        }
    });

    Presets.bind();

    syncControls();
}

// Push state back into inputs (after presets / reset).
function renderControlsValues() {
    el.controls.querySelectorAll('[data-key]').forEach(input => {
        const value = state[input.dataset.key];

        if (input.type === 'checkbox') {
            input.checked = Boolean(value);
        } else if (document.activeElement !== input) {
            input.value = String(value);
        }
    });
}

function syncControls() {
    const allFields = SECTIONS.flatMap(section => section.fields);

    allFields.forEach(field => {
        const row = el.controls.querySelector(`[data-field="${field.key}"]`);

        if (!row) {
            return;
        }

        row.hidden = field.show ? !field.show(state) : false;

        if (field.type === 'range') {
            const output = row.querySelector('output');
            const value = state[field.key];
            output.textContent = `${Number.isInteger(field.step) ? value : value.toFixed(field.step < 0.1 ? 2 : 1)}${field.unit}`;
        }

        if (field.type === 'gradient') {
            syncGradientStops(row);
        }

        if (field.type === 'file') {
            row.querySelector('[data-file-name]').textContent = state[field.key] || 'No file yet';
        }

        if (field.type === 'color') {
            row.querySelectorAll('.swatch').forEach(swatch => {
                swatch.classList.toggle('is-active', swatch.dataset.color.toLowerCase() === String(state[field.key]).toLowerCase());
            });
            const picker = row.querySelector('input[type="color"]');
            picker.value = state[field.key];
        }
    });

    updateSummary();
    Presets.mark();
}

function syncGradientStops(row) {
    const holder = row.querySelector('[data-stops]');
    const inputs = holder.querySelectorAll('input[type="color"]');

    if (inputs.length !== state.gradient.length) {
        holder.innerHTML = state.gradient.map((color, index) =>
            `<input type="color" data-stop="${index}" value="${color}" aria-label="Stop ${index + 1}" />`).join('') +
            `<button type="button" class="btn btn--mini" data-stop-action="add" title="Add colour" ${state.gradient.length >= 4 ? 'disabled' : ''}><i class="bi bi-plus"></i></button>` +
            `<button type="button" class="btn btn--mini" data-stop-action="remove" title="Remove colour" ${state.gradient.length <= 2 ? 'disabled' : ''}><i class="bi bi-dash"></i></button>` +
            `<button type="button" class="btn btn--mini" data-stop-action="reverse" title="Reverse"><i class="bi bi-arrow-down-up"></i></button>`;
    } else {
        inputs.forEach((input, index) => {
            if (document.activeElement !== input) {
                input.value = state.gradient[index];
            }
        });
    }

    const current = state.gradient.join(',').toLowerCase();
    row.querySelectorAll('[data-gradient]').forEach(chip => {
        chip.classList.toggle('is-active', GRADIENTS[Number(chip.dataset.gradient)].stops.join(',').toLowerCase() === current);
    });
}

/* --------------------------------------------------------------------- sound */

const SOUND_RATE = 48000;

// Real film SLR recordings (CC0): the wind lever from freesound.org/s/170139
// (jgrzinich), kept at its original quiet level, and the shutter release from
// freesound.org/s/554268 (Clagnar); a digital SLR shutter from
// freesound.org/s/453782 (kyles).
const SOUND_FILES = {
    wind: './sounds/wind.mp3?v=3',
    shutter: './sounds/shutter.mp3?v=4',
    digital: './sounds/digital.mp3?v=1'
};

// How far into each clip the click starts, so it lands on the moment.
const ONSETS = { shutter: 0.1, digital: 0.06 };

const Sound = {
    buffers: new Map(),
    pending: new Map(),
    custom: null,
    live: null,
    async fetchBuffer(type) {
        const response = await fetch(SOUND_FILES[type]);
        return this.decode(await response.blob());
    },
    // Starts loading in the background; returns the buffer once ready.
    get(type) {
        if (type === 'custom') {
            return this.custom;
        }

        if (!this.buffers.has(type) && !this.pending.has(type)) {
            this.pending.set(type, this.fetchBuffer(type).then(buffer => {
                this.buffers.set(type, buffer);
                this.pending.delete(type);
                return buffer;
            }).catch(() => {
                this.pending.delete(type);
                return null;
            }));
        }

        return this.buffers.get(type) || null;
    },
    async load(type) {
        if (type === 'custom') {
            return this.custom;
        }

        return this.get(type) || this.pending.get(type);
    },
    // The shot lands when each photo appears (the start of its transition);
    // with "wind + shutter" the lever is wound just before it.
    events() {
        if (state.sound === 'none' || !photos.length) {
            return [];
        }

        const { D, T, total } = timing();
        const list = [];

        // The first photo is already on screen at 0:00, so by default it stays quiet.
        for (let k = state.soundFirst ? 0 : 1; k < photos.length; k++) {
            // The transition into photo k runs from k·D − T to k·D. The film
            // advance plays as it starts moving; everything else once it's in.
            const start = k === 0 ? 0.05 : Math.max(0, k * D - T);
            const end = k === 0 ? 0.15 : k * D;
            const when = state.soundWhen === 'auto' ? (state.sound === 'wind' ? 'start' : 'end') : state.soundWhen;
            const moment = when === 'start' ? start : when === 'middle' ? (start + end) / 2 : end;
            const at = moment - (ONSETS[state.sound] || 0);
            list.push({ at: at + state.soundOffset, type: state.sound });
        }

        return list.filter(event => event.at < total);
    },
    unlock() {
        if (!this.live) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.live = Ctx ? new Ctx() : null;
        }

        this.live?.resume?.();
        this.warm();
    },
    warm() {
        if (SOUND_FILES[state.sound]) {
            this.get(state.sound);
        }
    },
    play(type, offset = 0) {
        const buffer = this.get(type);

        if (!buffer || !this.live || offset >= buffer.duration) {
            return;
        }

        const src = this.live.createBufferSource();
        src.buffer = buffer;
        const amp = this.live.createGain();
        amp.gain.value = state.soundVolume / 100;
        src.connect(amp).connect(this.live.destination);
        src.start(0, offset);
    },
    playBetween(from, to) {
        this.events().forEach(event => {
            if (event.at < 0) {
                // A wind that would start before 0:00 plays from its middle,
                // when playback starts or loops back to the beginning.
                if (from <= 0 && to >= 0) {
                    this.play(event.type, -event.at);
                }
            } else if (event.at > from && event.at <= to) {
                this.play(event.type);
            }
        });
    },
    async test() {
        this.unlock();
        await this.load(state.sound);
        this.play(state.sound);
    },
    async decode(blob) {
        const ctx = new OfflineAudioContext(2, SOUND_RATE, SOUND_RATE);
        return ctx.decodeAudioData(await blob.arrayBuffer());
    },
    async setCustom(file) {
        setStatus(`Loading ${file.name}…`, false, true);

        try {
            this.custom = await this.decode(file);
            Store.putFile('sound', file);
            setState({ soundCustomName: file.name, sound: 'custom' });
            setStatus('');
        } catch (error) {
            setStatus(`Couldn't read ${file.name} as audio.`, true);
        }
    },
    async restoreCustom() {
        const file = await Store.getFile('sound');

        if (file) {
            try {
                this.custom = await this.decode(file);
            } catch (error) {
                this.custom = null;
            }
        }
    },
    // The full soundtrack for export.
    async render(total) {
        const events = this.events();
        const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(total * SOUND_RATE)), SOUND_RATE);
        const gain = ctx.createGain();
        gain.gain.value = state.soundVolume / 100;
        gain.connect(ctx.destination);

        const music = await Music.buffer();

        if (music) {
            Music.connect(ctx, music, ctx.destination, 0, total, 0);
        }

        for (const event of events) {
            const buffer = await this.load(event.type);

            if (!buffer) {
                continue;
            }

            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(gain);

            if (event.at >= 0) {
                src.start(event.at);
            } else if (-event.at < buffer.duration) {
                src.start(0, -event.at);
            }
        }

        return ctx.startRendering();
    }
};

const GENERATED_STYLES = ['ambient', 'chiptune', 'lofi', 'musicbox'];

// Generated background music. Each variation (seed) picks its own key, chord
// progression, tempo and melody, so "New variation" gives a different piece.
const CHORDS = { I: [0, 'maj'], ii: [2, 'min'], iii: [4, 'min'], IV: [5, 'maj'], V: [7, 'maj'], vi: [9, 'min'] };
const PROGRESSIONS = [
    ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'vi', 'IV', 'V'], ['ii', 'V', 'I', 'vi'],
    ['I', 'IV', 'vi', 'V'], ['vi', 'ii', 'V', 'I'], ['I', 'iii', 'IV', 'V'], ['IV', 'I', 'V', 'vi']
];
const PENTATONIC = [0, 2, 4, 7, 9];

function chordTones([root, quality], seventh) {
    const tones = [root, root + (quality === 'maj' ? 4 : 3), root + 7];

    if (seventh) {
        tones.push(root + (quality === 'maj' ? 11 : 10));
    }

    return tones;
}

async function renderGenerated(style, seconds, seed) {
    const length = Math.max(1, Math.ceil(seconds * SOUND_RATE));
    const ctx = new OfflineAudioContext(2, length, SOUND_RATE);
    const rnd = mulberry32(seed * 7919 + style.length);
    const pick = list => list[Math.floor(rnd() * list.length)];
    const hz = note => 440 * Math.pow(2, (note - 69) / 12);
    const key = 45 + Math.floor(rnd() * 8);
    const progression = pick(PROGRESSIONS).map(name => CHORDS[name]);

    const noise = ctx.createBuffer(1, SOUND_RATE, SOUND_RATE);
    const noiseData = noise.getChannelData(0);

    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = rnd() * 2 - 1;
    }

    const master = ctx.createGain();
    master.connect(ctx.destination);

    const makeReverb = (secondsLong, wetLevel) => {
        const impulse = ctx.createBuffer(2, Math.ceil(SOUND_RATE * secondsLong), SOUND_RATE);

        for (let c = 0; c < 2; c++) {
            const data = impulse.getChannelData(c);

            for (let i = 0; i < data.length; i++) {
                data[i] = (rnd() * 2 - 1) * Math.pow(1 - i / data.length, 3);
            }
        }

        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = wetLevel;
        convolver.connect(wet).connect(master);
        return convolver;
    };

    const tone = ({ at, dur, note, gain, type = 'sine', wave = null, attack = 0.005, release = 0.05, out = master, extra = [], detune = 0 }) => {
        if (at >= seconds) {
            return;
        }

        const osc = ctx.createOscillator();

        if (wave) {
            osc.setPeriodicWave(wave);
        } else {
            osc.type = type;
        }

        osc.frequency.value = hz(note);
        osc.detune.value = detune;
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(gain, at + attack);
        amp.gain.setValueAtTime(gain, at + Math.max(attack, dur - release));
        amp.gain.exponentialRampToValueAtTime(0.0001, at + dur + release);
        osc.connect(amp);
        amp.connect(out);
        extra.forEach(node => amp.connect(node));
        osc.start(at);
        osc.stop(at + dur + release + 0.02);
    };

    const pluck = ({ at, note, gain, decay, type = 'sine', out = master, extra = [] }) => {
        if (at >= seconds) {
            return;
        }

        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = hz(note);
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(gain, at + 0.003);
        amp.gain.exponentialRampToValueAtTime(0.0001, at + decay);
        osc.connect(amp);
        amp.connect(out);
        extra.forEach(node => amp.connect(node));
        osc.start(at);
        osc.stop(at + decay + 0.02);
    };

    const hit = ({ at, dur, freq, q = 1, filter = 'bandpass', gain, out = master }) => {
        if (at >= seconds) {
            return;
        }

        const src = ctx.createBufferSource();
        src.buffer = noise;
        const biquad = ctx.createBiquadFilter();
        biquad.type = filter;
        biquad.frequency.value = freq;
        biquad.Q.value = q;
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(gain, at);
        amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        src.connect(biquad).connect(amp).connect(out);
        src.start(at, rnd() * 0.5);
        src.stop(at + dur + 0.02);
    };

    const kick = (at, gain, out = master) => {
        if (at >= seconds) {
            return;
        }

        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(150, at);
        osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
        const amp = ctx.createGain();
        amp.gain.setValueAtTime(gain, at);
        amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
        osc.connect(amp).connect(out);
        osc.start(at);
        osc.stop(at + 0.27);
    };

    // A melody that wanders over the pentatonic scale.
    let melodyIndex = Math.floor(rnd() * PENTATONIC.length);
    const nextMelodyNote = octave => {
        melodyIndex = Math.max(0, Math.min(PENTATONIC.length * 2 - 1, melodyIndex + pick([-2, -1, -1, 0, 1, 1, 2])));
        return key + octave + PENTATONIC[melodyIndex % PENTATONIC.length] + 12 * Math.floor(melodyIndex / PENTATONIC.length);
    };

    if (style === 'chiptune') {
        const beat = 60 / (118 + Math.floor(rnd() * 34));
        const bar = beat * 4;
        const duty = pick([0.125, 0.25, 0.5]);
        const real = new Float32Array(32);
        const imag = new Float32Array(32);

        for (let n = 1; n < 32; n++) {
            imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
        }

        const pulse = ctx.createPeriodicWave(real, imag);
        const arpUpDown = rnd() < 0.5;

        for (let t = 0, i = 0; t < seconds; t += bar, i++) {
            const tones = chordTones(progression[i % progression.length], false);

            for (let e = 0; e < 8; e++) {
                tone({ at: t + e * beat / 2, dur: beat * 0.35, note: key - 12 + tones[0] + (e % 2 ? 7 : 0), gain: 0.2, type: 'triangle', release: 0.02 });
                hit({ at: t + e * beat / 2, dur: 0.03, freq: 7500, filter: 'highpass', gain: 0.05 });
            }

            const arp = arpUpDown ? [...tones, tones[1]] : tones;

            for (let x = 0; x < 16; x++) {
                tone({ at: t + x * beat / 4, dur: beat * 0.18, note: key + 12 + arp[x % arp.length], gain: 0.04, type: 'square', release: 0.01 });
            }

            for (let e = 0; e < 8; e++) {
                if (rnd() < 0.62) {
                    const len = rnd() < 0.3 ? 2 : 1;
                    tone({ at: t + e * beat / 2, dur: beat * 0.45 * len, note: nextMelodyNote(24), gain: 0.06, wave: pulse, release: 0.03 });
                    e += len - 1;
                }
            }

            [0, 2].forEach(b => kick(t + b * beat, 0.45));
            [1, 3].forEach(b => hit({ at: t + b * beat, dur: 0.12, freq: 1800, q: 0.8, gain: 0.22 }));
        }
    } else if (style === 'lofi') {
        const beat = 60 / (70 + Math.floor(rnd() * 16));
        const bar = beat * 4;
        const swing = beat * 0.58;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 2400;
        lowpass.connect(master);
        const reverb = makeReverb(1.6, 0.25);

        for (let t = 0, i = 0; t < seconds; t += bar, i++) {
            const tones = chordTones(progression[i % progression.length], true);
            [0, 2.5].forEach(b => {
                tones.forEach((n, v) => tone({ at: t + b * beat + v * 0.012, dur: beat * 1.3, note: key + 12 + n, gain: 0.05, type: 'triangle', attack: 0.01, release: 0.4, out: lowpass, extra: [reverb], detune: (rnd() - 0.5) * 12 }));
            });
            tone({ at: t, dur: beat * 1.6, note: key - 12 + tones[0], gain: 0.22, attack: 0.01, release: 0.2, out: lowpass });
            tone({ at: t + 2.75 * beat, dur: beat * 1.1, note: key - 12 + tones[0] + pick([0, 7, 12]), gain: 0.18, attack: 0.01, release: 0.2, out: lowpass });

            if (rnd() < 0.7) {
                for (let m = 0; m < 3; m++) {
                    pluck({ at: t + (pick([0, 1, 2, 3]) + pick([0, 0.5])) * beat, note: nextMelodyNote(24), gain: 0.05, decay: 1.1, type: 'sine', out: lowpass, extra: [reverb] });
                }
            }

            [0, 2.5].forEach(b => kick(t + b * beat, 0.4, lowpass));
            [1, 3].forEach(b => hit({ at: t + b * beat, dur: 0.18, freq: 1500, q: 0.6, gain: 0.16, out: lowpass }));

            for (let e = 0; e < 4; e++) {
                hit({ at: t + e * beat, dur: 0.04, freq: 6000, filter: 'highpass', gain: 0.035, out: lowpass });
                hit({ at: t + e * beat + swing, dur: 0.03, freq: 6000, filter: 'highpass', gain: 0.022, out: lowpass });
            }
        }

        // Vinyl: soft hiss and the odd crackle.
        for (let t = 0; t < seconds; t += 1) {
            hit({ at: t, dur: 1.05, freq: 3000, q: 0.3, gain: 0.01 });

            for (let c = 0; c < 5; c++) {
                hit({ at: t + rnd(), dur: 0.006, freq: 2500 + rnd() * 3000, q: 2, gain: 0.03 + rnd() * 0.05 });
            }
        }
    } else if (style === 'musicbox') {
        const beat = 60 / (84 + Math.floor(rnd() * 24));
        const bar = beat * 4;
        const reverb = makeReverb(2.5, 0.4);

        for (let t = 0, i = 0; t < seconds; t += bar, i++) {
            const tones = chordTones(progression[i % progression.length], rnd() < 0.5);

            for (let e = 0; e < 8; e++) {
                const note = key + 24 + tones[e % tones.length] + (e >= 4 ? 12 : 0);
                pluck({ at: t + e * beat / 2, note, gain: 0.06, decay: 1.4, type: 'triangle', extra: [reverb] });
            }

            for (let m = 0; m < 3; m++) {
                if (rnd() < 0.6) {
                    pluck({ at: t + (m * 4 / 3 + rnd() * 0.3) * beat, note: nextMelodyNote(36), gain: 0.05, decay: 1.8, extra: [reverb] });
                }
            }

            pluck({ at: t, note: key + tones[0], gain: 0.07, decay: 2.2, extra: [reverb] });
        }
    } else {
        // Ambient pad.
        const bar = 3.5 + rnd() * 2;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1300 + rnd() * 600;
        const reverb = makeReverb(3, 0.35);
        lowpass.connect(master);
        lowpass.connect(reverb);
        const wave = pick(['triangle', 'sine']);

        for (let t = 0, i = 0; t < seconds; t += bar, i++) {
            const tones = chordTones(progression[i % progression.length], true);

            tones.forEach(n => {
                [-5, 5].forEach(detune => tone({ at: t, dur: bar + 0.3, note: key + n, gain: 0.04, type: wave, attack: 1.4, release: 1.6, out: lowpass, detune }));
            });

            for (let b = 0; b < 2; b++) {
                pluck({ at: t + 0.5 + b * bar / 2 + rnd() * 0.4, note: nextMelodyNote(24), gain: 0.03, decay: 1.8, extra: [reverb] });
            }
        }
    }

    const buffer = await ctx.startRendering();
    let peak = 0;

    for (let c = 0; c < 2; c++) {
        buffer.getChannelData(c).forEach(v => { peak = Math.max(peak, Math.abs(v)); });
    }

    if (peak > 0) {
        for (let c = 0; c < 2; c++) {
            const channel = buffer.getChannelData(c);
            for (let i = 0; i < channel.length; i++) {
                channel[i] *= 0.8 / peak;
            }
        }
    }

    return buffer;
}

const Music = {
    file: null,
    generated: null,
    generatedKey: '',
    pending: null,
    pendingKey: '',
    node: null,
    async buffer() {
        if (state.music === 'file') {
            return this.file;
        }

        if (!GENERATED_STYLES.includes(state.music)) {
            return null;
        }

        const { total } = timing();
        const needed = Math.ceil((total + 4) / 4) * 4;
        const key = `${state.music}|${state.musicSeed}`;

        if (this.generated && this.generatedKey === key && this.generated.duration >= needed - 0.01) {
            return this.generated;
        }

        const pendingKey = `${key}|${needed}`;

        if (this.pendingKey !== pendingKey) {
            this.pendingKey = pendingKey;
            this.pending = renderGenerated(state.music, needed, state.musicSeed).then(buffer => {
                if (this.pendingKey === pendingKey) {
                    this.generated = buffer;
                    this.generatedKey = key;
                }

                return buffer;
            });
        }

        return this.pending;
    },
    // Volume over the video's timeline: fade in at the start, out at the end.
    envelope(from, total) {
        const volume = state.musicVolume / 100;
        const points = 256;
        const curve = new Float32Array(points);

        for (let i = 0; i < points; i++) {
            const t = from + ((total - from) * i) / (points - 1);
            const fadeIn = state.musicFadeIn > 0 ? t / state.musicFadeIn : 1;
            const fadeOut = state.musicFadeOut > 0 ? (total - t) / state.musicFadeOut : 1;
            curve[i] = volume * Math.max(0, Math.min(1, fadeIn, fadeOut));
        }

        return curve;
    },
    offset(t) {
        return state.music === 'file' ? state.musicStart + t : t;
    },
    connect(ctx, buffer, destination, from, total, when) {
        const offset = this.offset(from);
        const loop = GENERATED_STYLES.includes(state.music) || state.musicLoop;

        if (!loop && offset >= buffer.duration) {
            return null;
        }

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = loop;

        if (loop && state.music === 'file') {
            src.loopStart = Math.min(state.musicStart, buffer.duration - 0.1);
            src.loopEnd = buffer.duration;
        }

        const gain = ctx.createGain();
        gain.gain.setValueCurveAtTime(this.envelope(from, total), when, Math.max(0.05, total - from));
        src.connect(gain).connect(destination);
        src.start(when, loop ? offset % buffer.duration : offset);
        src.stop(when + Math.max(0.05, total - from));
        return src;
    },
    async play(from) {
        this.stop();

        if (state.music === 'none' || !Sound.live) {
            return;
        }

        const ready = state.music === 'file' ? this.file : this.buffer();

        if (ready instanceof Promise) {
            setStatus('Generating music…', false, true);
        }

        const buffer = await ready;

        if (ready instanceof Promise && !exporting) {
            setStatus('');
        }

        if (!buffer || !playing) {
            return;
        }

        const { total } = timing();
        this.node = this.connect(Sound.live, buffer, Sound.live.destination, Math.max(from, time), total, Sound.live.currentTime);
    },
    stop() {
        try {
            this.node?.stop();
        } catch (error) {
            // Already stopped.
        }

        this.node = null;
    },
    async setFile(file) {
        setStatus(`Loading ${file.name}…`, false, true);

        try {
            this.file = await Sound.decode(file);
            Store.putFile('music', file);
            setState({ musicName: file.name, music: 'file' });
            setStatus(`${file.name} · ${formatTime(this.file.duration)}`);
        } catch (error) {
            setStatus(`Couldn't read ${file.name} as audio.`, true);
        }
    },
    async restore() {
        const file = await Store.getFile('music');

        if (file) {
            try {
                this.file = await Sound.decode(file);
            } catch (error) {
                this.file = null;
            }
        }
    }
};

// Encode a rendered AudioBuffer to AAC chunks for the muxer.
async function encodeAudio(buffer) {
    const chunks = [];
    let failure = null;
    const encoder = new AudioEncoder({
        output: (chunk, meta) => chunks.push({ chunk, meta }),
        error: error => { failure = error; }
    });
    encoder.configure({ codec: 'mp4a.40.2', sampleRate: SOUND_RATE, numberOfChannels: 2, bitrate: 192000 });

    const block = 4096;
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let start = 0; start < buffer.length; start += block) {
        const frames = Math.min(block, buffer.length - start);
        const planar = new Float32Array(frames * 2);
        planar.set(left.subarray(start, start + frames), 0);
        planar.set(right.subarray(start, start + frames), frames);
        const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate: SOUND_RATE,
            numberOfFrames: frames,
            numberOfChannels: 2,
            timestamp: Math.round((start / SOUND_RATE) * 1e6),
            data: planar
        });
        encoder.encode(audioData);
        audioData.close();
    }

    await encoder.flush();
    encoder.close();

    if (failure) {
        throw failure;
    }

    return chunks;
}

async function audioSupported() {
    if (!('AudioEncoder' in window)) {
        return false;
    }

    try {
        const support = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: SOUND_RATE, numberOfChannels: 2, bitrate: 192000 });
        return support.supported;
    } catch (error) {
        return false;
    }
}

/* -------------------------------------------------------------------- export */

function setStatus(text, isError = false, busy = false) {
    el.status.innerHTML = (busy ? '<span class="spinner"></span>' : '') + escapeHtml(text);
    el.status.classList.toggle('is-error', isError);
}

// Spinner row at the top of the photo list while photos load.
function setBusy(text) {
    el.busy.hidden = !text;
    el.busyText.textContent = text || '';
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function pickCodec(W, H, fps, bitrate) {
    const candidates = [
        { muxer: 'avc', codec: 'avc1.640034', name: 'H.264 High' },
        { muxer: 'avc', codec: 'avc1.640033', name: 'H.264 High' },
        { muxer: 'avc', codec: 'avc1.4d0034', name: 'H.264 Main' },
        { muxer: 'hevc', codec: 'hvc1.1.6.L153.B0', name: 'HEVC' },
        { muxer: 'vp9', codec: 'vp09.00.51.08', name: 'VP9' }
    ];

    for (const candidate of candidates) {
        const config = {
            codec: candidate.codec,
            width: W,
            height: H,
            bitrate,
            framerate: fps,
            latencyMode: 'quality'
        };

        if (candidate.muxer === 'avc') {
            config.avc = { format: 'avc' };
        }

        try {
            const support = await VideoEncoder.isConfigSupported(config);

            if (support.supported) {
                return { ...candidate, config };
            }
        } catch (error) {
            // Try the next one.
        }
    }

    return null;
}

async function decodeFull(photo, maxSide) {
    const bitmap = await createImageBitmap(photo.file);

    if (Math.max(bitmap.width, bitmap.height) <= maxSide) {
        return bitmap;
    }

    const canvas = scaleToCanvas(bitmap, maxSide);
    bitmap.close();
    return canvas;
}

// Keep full-resolution images only for the photos on screen (and the next one).
async function ensureFull(t, maxSide) {
    const { a, b } = sceneAt(t);
    const needed = [a, b, a + 1].filter(i => i >= 0 && i < photos.length).map(i => photos[i]);
    const keep = new Set(needed.map(photo => photo.id));

    for (const [id, image] of fullCache) {
        if (!keep.has(id)) {
            image.close?.();
            fullCache.delete(id);
        }
    }

    for (const photo of needed) {
        if (!fullCache.has(photo.id)) {
            fullCache.set(photo.id, await decodeFull(photo, maxSide));
        }
    }
}

function clearFullCache() {
    fullCache.forEach(image => image.close?.());
    fullCache.clear();
    cardCache.clear();
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function setExportingUi(active) {
    el.exportBtn.hidden = active;
    el.stillsBtn.hidden = active;
    el.stillsMode.disabled = active;
    el.cancelBtn.hidden = !active;
    el.progress.hidden = !active;
    el.controls.querySelectorAll('input, select, button').forEach(node => { node.disabled = active; });
    el.presets.querySelectorAll('button').forEach(node => { node.disabled = active; });
    el.play.disabled = active;
    el.scrubber.disabled = active;
}

async function exportVideo() {
    if (!photos.length) {
        setStatus('Add some photos first.', true);
        return;
    }

    if (!('VideoEncoder' in window) || !window.Mp4Muxer) {
        setStatus('This browser can\'t encode video here. Use a recent Chrome, Edge or Safari.', true);
        return;
    }

    setPlaying(false);

    const fmt = currentFormat();
    const W = fmt.w;
    const H = fmt.h;
    const fps = Number(state.fps);
    const bitrate = Math.round(W * H * fps * QUALITY[state.quality]);
    const fileName = `photo-reel-${W}x${H}-${fps}fps.mp4`;

    // Ask for the destination first, while the click still counts as a user gesture.
    // Streaming to disk keeps long 4K renders out of memory.
    let writable = null;

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }]
            });
            writable = await handle.createWritable();
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            writable = null; // Not allowed here (e.g. inside a frame): build it in memory.
        }
    }

    setStatus('Preparing…', false, true);
    const codec = await pickCodec(W, H, fps, bitrate);

    if (!codec) {
        await writable?.abort?.();
        setStatus(`No encoder for ${W}×${H} at ${fps} fps in this browser. Try 1080p or a lower frame rate.`, true);
        return;
    }

    await loadFont(state.titleFont);

    if (state.captionFont !== 'auto') {
        await loadFont(state.captionFont);
    }

    await document.fonts.ready;
    const { total } = timing();

    // The soundtrack is rendered and encoded up front, then interleaved with video.
    let audioChunks = null;
    let audioNote = '';

    if (state.sound !== 'none' || state.music !== 'none') {
        if (await audioSupported()) {
            try {
                setStatus(GENERATED_STYLES.includes(state.music) ? 'Generating music…' : 'Rendering sound…', false, true);
                audioChunks = await encodeAudio(await Sound.render(total));
            } catch (error) {
                audioNote = '\nSound skipped: encoder error.';
            }
        } else {
            audioNote = '\nSound skipped: this browser can\'t encode AAC.';
        }
    }

    const target = writable
        ? new Mp4Muxer.FileSystemWritableFileStreamTarget(writable)
        : new Mp4Muxer.ArrayBufferTarget();
    const muxer = new Mp4Muxer.Muxer({
        target,
        video: { codec: codec.muxer, width: W, height: H, frameRate: fps },
        audio: audioChunks ? { codec: 'aac', numberOfChannels: 2, sampleRate: SOUND_RATE } : undefined,
        fastStart: writable ? false : 'in-memory',
        firstTimestampBehavior: 'offset'
    });

    let audioIndex = 0;
    const flushAudio = untilUs => {
        while (audioChunks && audioIndex < audioChunks.length && audioChunks[audioIndex].chunk.timestamp <= untilUs) {
            const { chunk, meta } = audioChunks[audioIndex++];
            muxer.addAudioChunk(chunk, meta);
        }
    };

    let encodeError = null;
    const encoder = new VideoEncoder({
        output: (chunk, meta) => {
            flushAudio(chunk.timestamp);
            muxer.addVideoChunk(chunk, meta);
        },
        error: error => { encodeError = error; }
    });
    encoder.configure(codec.config);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { alpha: false });

    const frameCount = Math.max(1, Math.round(total * fps));
    const started = performance.now();
    exporting = { cancelled: false };
    setExportingUi(true);

    try {
        for (let f = 0; f < frameCount; f++) {
            if (exporting.cancelled || encodeError) {
                break;
            }

            const t = f / fps;
            await ensureFull(t, Math.max(W, H));
            drawScene(ctx, W, H, t, 'full', f);

            const frame = new VideoFrame(canvas, {
                timestamp: Math.round((f * 1e6) / fps),
                duration: Math.round(1e6 / fps)
            });
            encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
            frame.close();

            while (encoder.encodeQueueSize > 4) {
                await sleep(2);
            }

            if (f % 4 === 0 || f === frameCount - 1) {
                const done = (f + 1) / frameCount;
                const elapsed = (performance.now() - started) / 1000;
                const eta = elapsed / done - elapsed;
                el.progressBar.style.width = `${(done * 100).toFixed(1)}%`;
                setStatus(`${codec.name} · ${W}×${H} · frame ${f + 1} / ${frameCount}\n${(done * 100).toFixed(0)}% · ~${Math.ceil(eta)}s left`, false, true);
                // Show what is being rendered.
                previewCtx.drawImage(canvas, 0, 0, el.preview.width, el.preview.height);
                el.scrubber.value = String(t);
                el.timeNow.textContent = formatTime(t);
                await sleep(0);
            }
        }

        if (exporting.cancelled || encodeError) {
            encoder.close();
            await writable?.abort?.();
            setStatus(encodeError ? `Encoder error: ${encodeError.message}` : 'Export cancelled.', Boolean(encodeError));
            return;
        }

        setStatus('Finishing…', false, true);
        await encoder.flush();
        encoder.close();
        flushAudio(Infinity);
        muxer.finalize();

        if (writable) {
            await writable.close();
            setStatus(`Saved ${fileName}\n${codec.name} · ${W}×${H} · ${fps} fps · ${formatTime(total)}${audioChunks ? ' · AAC sound' : ''}${audioNote}`);
        } else {
            const blob = new Blob([target.buffer], { type: 'video/mp4' });
            downloadBlob(blob, fileName);
            setStatus(`Downloaded ${fileName} (${(blob.size / 1e6).toFixed(0)} MB)\n${codec.name} · ${W}×${H} · ${fps} fps${audioChunks ? ' · AAC sound' : ''}${audioNote}`);
        }
    } catch (error) {
        try {
            encoder.close();
        } catch (closeError) {
            // Already closed.
        }
        await writable?.abort?.().catch(() => {});
        setStatus(`Export failed: ${error.message}`, true);
    } finally {
        clearFullCache();
        exporting = null;
        setExportingUi(false);
        el.progressBar.style.width = '0';
        draw();
    }
}

/* -------------------------------------------------------------- photo export */

const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), type, quality);
});

// Photo k as a frame of the video: background, title, caption and all.
function renderStillFrame(k, W, H) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    drawScene(canvas.getContext('2d', { alpha: false }), W, H, k * timing().D, 'full', k, true);
    return canvas;
}

// Just photo k in its frame with its caption, on a transparent background,
// at about the photo's own resolution.
function renderStillCard(k, W, H, image) {
    const photo = photos[k];
    const base = layout(photo, W, H);
    const scale = Math.max(0.5, Math.min(Math.min(image.width, image.height) / base.s, 8000 / Math.max(base.cw, base.ch)));
    const W2 = Math.round(W * scale);
    const H2 = Math.round(H * scale);
    const card = renderCard(photo, k, image, W2, H2);
    const px = card.canvas.width / card.cw;

    if (!card.caption) {
        return card.canvas;
    }

    const size = card.captionSize * px;
    const canvas = document.createElement('canvas');
    canvas.width = card.canvas.width;
    canvas.height = Math.ceil(card.canvas.height + size * 2.6);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(card.canvas, 0, 0);
    ctx.fillStyle = captionInk();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitFont(ctx, card.caption, captionFontOr(uiFont), size, canvas.width * 0.95);
    ctx.fillText(card.caption, canvas.width / 2, card.canvas.height + size * 1.4);
    return canvas;
}

async function exportStills() {
    if (!photos.length) {
        setStatus('Add some photos first.', true);
        return;
    }

    if (!window.fflate) {
        setStatus('The zip library didn\'t load. Check the connection and reload.', true);
        return;
    }

    setPlaying(false);
    const withBackground = el.stillsMode.value !== 'clean';
    const fmt = currentFormat();
    const files = {};
    const digits = String(photos.length).length;

    exporting = { cancelled: false };
    setExportingUi(true);

    try {
        await loadFont(state.titleFont);

        if (state.captionFont !== 'auto') {
            await loadFont(state.captionFont);
        }

        await document.fonts.ready;

        for (let k = 0; k < photos.length; k++) {
            if (exporting.cancelled) {
                break;
            }

            const photo = photos[k];
            setStatus(`Rendering photo ${k + 1} / ${photos.length}…`, false, true);
            el.progressBar.style.width = `${((k / photos.length) * 100).toFixed(1)}%`;

            clearFullCache();
            const image = await decodeFull(photo, withBackground ? Math.max(fmt.w, fmt.h) : 8000);
            fullCache.set(photo.id, image);

            const canvas = withBackground ? renderStillFrame(k, fmt.w, fmt.h) : renderStillCard(k, fmt.w, fmt.h, image);
            const blob = withBackground ? await canvasBlob(canvas, 'image/jpeg', 0.95) : await canvasBlob(canvas, 'image/png');
            const base = photo.name.replace(/\.[^.]+$/, '').replace(/[^\w\-. ]+/g, '_').trim() || 'photo';
            files[`${String(k + 1).padStart(digits, '0')} ${base}.${withBackground ? 'jpg' : 'png'}`] = new Uint8Array(await blob.arrayBuffer());

            previewCtx.fillStyle = '#000';
            previewCtx.fillRect(0, 0, el.preview.width, el.preview.height);
            const fit = Math.min(el.preview.width / canvas.width, el.preview.height / canvas.height);
            previewCtx.drawImage(canvas, (el.preview.width - canvas.width * fit) / 2, (el.preview.height - canvas.height * fit) / 2, canvas.width * fit, canvas.height * fit);
            await sleep(0);
        }

        if (exporting.cancelled) {
            setStatus('Export cancelled.');
            return;
        }

        setStatus('Packing the zip…', false, true);
        await sleep(0);
        // Images are already compressed, so just store them.
        const zip = fflate.zipSync(files, { level: 0 });
        const name = `photo-reel-${withBackground ? `${fmt.w}x${fmt.h}` : 'framed'}.zip`;
        downloadBlob(new Blob([zip], { type: 'application/zip' }), name);
        setStatus(`Downloaded ${name}\n${photos.length} ${withBackground ? 'frames (JPEG)' : 'framed photos (PNG, transparent)'} · ${(zip.length / 1e6).toFixed(0)} MB`);
    } catch (error) {
        setStatus(`Export failed: ${error.message}`, true);
    } finally {
        clearFullCache();
        exporting = null;
        setExportingUi(false);
        el.progressBar.style.width = '0';
        draw();
    }
}

/* ---------------------------------------------------------------------- init */

function init() {
    renderControls();
    bindList();
    Gallery.init();
    renderList();

    el.play.addEventListener('click', () => setPlaying(!playing));
    el.scrubber.addEventListener('input', () => {
        setPlaying(false);
        time = Number(el.scrubber.value);
        draw();
    });

    el.exportBtn.addEventListener('click', exportVideo);
    el.stillsBtn.addEventListener('click', exportStills);

    try {
        el.stillsMode.value = localStorage.getItem('photoReelStills') || 'background';
    } catch (error) {
        // Default stays.
    }

    el.stillsMode.addEventListener('change', () => {
        try {
            localStorage.setItem('photoReelStills', el.stillsMode.value);
        } catch (error) {
            // Not critical.
        }
    });
    el.cancelBtn.addEventListener('click', () => {
        if (exporting) {
            exporting.cancelled = true;
        }
    });

    el.reset.addEventListener('click', () => {
        setState({ ...DEFAULTS, gradient: [...DEFAULTS.gradient] });
        renderControlsValues();
    });

    document.addEventListener('keydown', event => {
        if (event.code === 'Space' && !event.target.closest('input, select, button, textarea')) {
            event.preventDefault();
            setPlaying(!playing);
        }
    });

    new ResizeObserver(() => {
        layoutPreview();
        draw();
    }).observe(el.viewport);

    layoutPreview();
    draw();

    // Canvas text only uses web fonts once they've loaded.
    const fonts = ['500 20px Inter', '600 20px Inter', '500 20px Caveat', '600 20px Caveat'];
    Promise.all(fonts.map(font => document.fonts.load(font).catch(() => {}))).then(() => {
        cardCache.clear();
        draw();
    });
    loadFont(state.titleFont);

    if (state.captionFont !== 'auto') {
        loadFont(state.captionFont);
    }

    restorePhotos();

    if (state.sound === 'custom') {
        Sound.restoreCustom();
    }

    Music.restore();
}

init();

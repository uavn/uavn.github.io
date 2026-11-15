'use strict';

/*
 * Film Dev: a development timer that works out the times (push/pull, developer
 * temperature, chemistry reuse) and then talks you through every step: when to
 * pour, agitate, invert and drain, with a pause between steps.
 *
 * Times are approximate starting points from kit sheets and common practice;
 * every process can be edited, duplicated and saved in the browser.
 */

const PRESETS = [
    {
        id: 'kodak-c41',
        name: 'Kodak Flexicolor C-41',
        note: 'Developer 3:15 at 37.8 °C (water bath 38.5 °C). Kodak Z-131 push starting points: +1 → 3:45, +2 → 4:15 (+30 s a stop). Kodak gives no times below 37.8 °C; colder is estimated at +15% per °C. Other baths 24–41 °C.',
        pushMode: 'add', pushAdd: 30, pullAdd: 30, pushPct: 25, pullPct: 20, pushTable: {},
        tempCoef: 15, reusePct: 0, reuseAdd: 0, colour: true,
        steps: [
            { name: 'Pre-warm', bath: '', kind: 'prep', temp: 38.5, time: 60, agitation: [0, 0, 0], note: 'Rinse the tank with warm water under the tap' },
            { name: 'Developer', bath: '1', kind: 'dev', temp: 37.8, time: 195, agitation: [30, 15, 2], note: 'Keep it at 37.8 °C — water bath 38.5 °C' },
            { name: 'Bleach', bath: '2', kind: 'chem', temp: 24, tempMax: 41, time: 390, agitation: [30, 30, 2] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 24, tempMax: 41, time: 90, agitation: [0, 0, 0] },
            { name: 'Fixer', bath: '3', kind: 'chem', temp: 24, tempMax: 41, time: 390, agitation: [30, 30, 3], note: '2–3 inversions' },
            { name: 'Wash', bath: '', kind: 'wash', temp: 24, tempMax: 41, time: 195, agitation: [0, 0, 0] },
            { name: 'Stabilizer', bath: '4', kind: 'chem', temp: 24, tempMax: 41, time: 90, agitation: [30, 0, 0], note: 'Agitate only the first 30 s' }
        ]
    },
    {
        id: 'cinestill-cs41',
        name: 'CineStill Cs41 (2-bath)',
        note: 'Developer 3:30 at 38.9 °C (102 °F); push/pull and lower temperatures from CineStill’s chart (95 °F 5:45, 90 °F 8:30, 85 °F 13:00). Add 2% for every roll already developed.',
        pushMode: 'table', pushAdd: 30, pullAdd: 30, pushPct: 30, pullPct: 20, pushTable: { '-1': 165, 1: 273, 2: 368, 3: 525 },
        tempCoef: 16, tempTable: { 38.9: 210, 35: 345, 32.2: 510, 29.4: 780 }, reusePct: 2, reuseAdd: 0, colour: true,
        steps: [
            { name: 'Pre-warm', bath: '', kind: 'prep', temp: 38.9, time: 60, agitation: [0, 0, 0], note: 'Warm water in the tank to bring it up to temperature' },
            { name: 'Developer', bath: '1', kind: 'dev', temp: 38.9, time: 210, agitation: [10, 30, 2], note: '102 °F' },
            { name: 'Blix', bath: '2', kind: 'chem', temp: 38.9, time: 480, agitation: [10, 30, 2] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 30, tempMax: 40, time: 180, agitation: [0, 0, 0] },
            { name: 'Stabilizer', bath: '3', kind: 'chem', temp: 20, tempMax: 40, time: 60, agitation: [15, 0, 0] }
        ]
    },
    {
        id: 'tetenal-e6',
        name: 'Tetenal Colortec E-6 (3-bath)',
        note: 'Tetenal sheet: first developer 6:15 at 38 °C; push +1 → +2:00, push +2 → +5:30, pull −1 → −2:00. Films 5–8 +15 s, 9–12 +30 s.',
        pushMode: 'table', pushAdd: 120, pullAdd: 120, pushPct: 30, pullPct: 25, pushTable: { '-1': 255, 1: 495, 2: 705 },
        tempCoef: 10, reusePct: 0, reuseAdd: 15, reuseBatch: 4, colour: true,
        steps: [
            { name: 'Pre-warm', bath: '', kind: 'prep', temp: 38, time: 120, agitation: [0, 0, 0], note: 'Warm water at 38 °C' },
            { name: 'First developer', bath: '1', kind: 'dev', temp: 38, time: 375, agitation: [15, 30, 2] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 33, tempMax: 39, time: 150, agitation: [0, 0, 0] },
            { name: 'Colour developer', bath: '2', kind: 'chem', temp: 38, time: 360, agitation: [15, 30, 2] },
            { name: 'Blix', bath: '3', kind: 'chem', temp: 33, tempMax: 39, time: 360, agitation: [15, 30, 2] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 33, tempMax: 39, time: 240, agitation: [0, 0, 0] },
            { name: 'Stabilizer', bath: '4', kind: 'chem', temp: 20, tempMax: 39, time: 60, agitation: [15, 0, 0] }
        ]
    },
    {
        id: 'bw-d76-trix',
        name: 'B&W · Kodak D-76 stock · Tri-X 400',
        note: 'Kodak F-4017, small tank, 20 °C: EI 400 6:45, EI 1600 9:30, EI 3200 11:00. Kodak says EI 800 develops fine at the normal time; 8:00 here is the usual compromise. Pull is −20%.',
        pushMode: 'table', pushAdd: 60, pullAdd: 45, pushPct: 15, pullPct: 20, pushTable: { '-1': 330, 1: 480, 2: 570, 3: 660 },
        tempCoef: 9, tempTable: { 18: 480, 20: 405, 21: 375, 22: 330, 24: 285 }, reusePct: 0, reuseAdd: 0,
        steps: [
            { name: 'Pre-soak', bath: '', kind: 'prep', temp: 20, time: 60, agitation: [0, 0, 0], note: 'Optional: plain water' },
            { name: 'Developer', bath: '1', kind: 'dev', temp: 20, time: 405, agitation: [5, 18, 5], note: 'Kodak: 5–7 inversions every 30 s' },
            { name: 'Stop bath', bath: '2', kind: 'chem', temp: 20, tempMax: 24, time: 60, agitation: [60, 0, 0] },
            { name: 'Fixer', bath: '3', kind: 'chem', temp: 20, tempMax: 24, time: 300, agitation: [30, 30, 5] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 20, tempMax: 24, time: 600, agitation: [0, 0, 0] },
            { name: 'Wetting agent', bath: '4', kind: 'chem', temp: 20, tempMax: 24, time: 30, agitation: [0, 0, 0] }
        ]
    },
    {
        id: 'bw-hc110-trix',
        name: 'B&W · Kodak HC-110 dil. B · Tri-X 400',
        note: 'Kodak F-4017, small tank, 20 °C: EI 400 3:45, EI 1600 6:00 (1+31). Kodak warns that tank times under 5 min can develop unevenly. EI 800 4:45 is interpolated.',
        pushMode: 'table', pushAdd: 60, pullAdd: 45, pushPct: 20, pullPct: 20, pushTable: { 1: 285, 2: 360 },
        tempCoef: 10, tempTable: { 18: 270, 20: 225, 21: 210, 22: 180, 24: 150 }, reusePct: 0, reuseAdd: 0,
        steps: [
            { name: 'Pre-soak', bath: '', kind: 'prep', temp: 20, time: 60, agitation: [0, 0, 0], note: 'Optional: plain water' },
            { name: 'Developer', bath: '1', kind: 'dev', temp: 20, time: 225, agitation: [5, 18, 5], note: 'Kodak: 5–7 inversions every 30 s' },
            { name: 'Stop bath', bath: '2', kind: 'chem', temp: 20, tempMax: 24, time: 60, agitation: [60, 0, 0] },
            { name: 'Fixer', bath: '3', kind: 'chem', temp: 20, tempMax: 24, time: 300, agitation: [30, 30, 5] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 20, tempMax: 24, time: 600, agitation: [0, 0, 0] },
            { name: 'Wetting agent', bath: '4', kind: 'chem', temp: 20, tempMax: 24, time: 30, agitation: [0, 0, 0] }
        ]
    },
    {
        id: 'bw-id11-hp5',
        name: 'B&W · Ilford ID-11 stock · HP5 Plus',
        note: 'Ilford, 20 °C: EI 400 7:30, EI 800 10:30, EI 1600 14:00. For EI 3200 Ilford suggests DD-X or Microphen. Agitation: 10 s, then 4 inversions every minute.',
        pushMode: 'table', pushAdd: 60, pullAdd: 45, pushPct: 30, pullPct: 20, pushTable: { 1: 630, 2: 840 },
        tempCoef: 10, reusePct: 0, reuseAdd: 0,
        steps: [
            { name: 'Developer', bath: '1', kind: 'dev', temp: 20, time: 450, agitation: [10, 60, 4] },
            { name: 'Stop bath', bath: '2', kind: 'chem', temp: 20, tempMax: 24, time: 10, agitation: [10, 0, 0] },
            { name: 'Fixer', bath: '3', kind: 'chem', temp: 20, tempMax: 24, time: 300, agitation: [10, 60, 4] },
            { name: 'Wash', bath: '', kind: 'wash', temp: 20, tempMax: 24, time: 300, agitation: [0, 0, 0], note: 'Ilford method: fill and invert 5, 10, 20 times' },
            { name: 'Wetting agent', bath: '4', kind: 'chem', temp: 20, tempMax: 24, time: 30, agitation: [0, 0, 0] }
        ]
    }
];

const BLANK_RECIPE = {
    name: 'My process',
    note: '',
    pushMode: 'percent', pushAdd: 30, pullAdd: 30, pushPct: 30, pullPct: 20, pushTable: {},
    tempCoef: 10, reusePct: 0, reuseAdd: 0,
    steps: [
        { name: 'Developer', bath: '1', kind: 'dev', temp: 20, time: 360, agitation: [30, 30, 4] },
        { name: 'Fixer', bath: '2', kind: 'chem', temp: 20, time: 300, agitation: [30, 60, 4] },
        { name: 'Wash', bath: '', kind: 'wash', temp: 20, time: 300, agitation: [0, 0, 0] }
    ]
};

const DEFAULT_SETTINGS = {
    recipeId: 'kodak-c41',
    isoBox: 400,
    isoShot: 400,
    stops: 0,
    devTemp: null,
    rollsUsed: 0,
    pauseMode: 'manual',
    pauseSeconds: 15,
    drainLead: 0,
    invertSeconds: 2.5,
    prepLead: 30,
    voice: true,
    voiceLang: 'en',
    beeps: true
};

const KEYS = { settings: 'filmDevSettings', recipes: 'filmDevRecipes', run: 'filmDevRun' };

const $ = id => document.getElementById(id);

/* ------------------------------------------------------------------ storage */

function readJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value === null ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function writeJson(key, value) {
    try {
        if (value === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (error) {
        // Private mode: works, just won't remember.
    }
}

let settings = { ...DEFAULT_SETTINGS, ...readJson(KEYS.settings, {}) };

// v2: draining starts when the step's time is up; the early warning is optional.
if ((settings.v || 1) < 2) {
    settings.drainLead = 0;
    settings.v = 2;
}
settings.stops = Math.round(settings.stops) || 0;
let customRecipes = readJson(KEYS.recipes, []);
let run = readJson(KEYS.run, null);

const saveSettings = () => writeJson(KEYS.settings, settings);
const saveRecipes = () => writeJson(KEYS.recipes, customRecipes);
const saveRun = () => writeJson(KEYS.run, run);

// Custom recipes with a preset's id override that preset.
function allRecipes() {
    const list = PRESETS.map(preset => customRecipes.find(item => item.id === preset.id) || preset);
    return list.concat(customRecipes.filter(item => !PRESETS.some(preset => preset.id === item.id)));
}

function currentRecipe() {
    const list = allRecipes();
    return list.find(item => item.id === settings.recipeId) || list[0];
}

const isPreset = id => PRESETS.some(preset => preset.id === id);
const isOverridden = id => isPreset(id) && customRecipes.some(item => item.id === id);

/* ---------------------------------------------------------------- formatting */

function fmt(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

function parseTime(text) {
    const value = String(text).trim();

    if (!value) {
        return NaN;
    }

    if (value.includes(':')) {
        const [m, s] = value.split(':').map(Number);
        return m * 60 + (s || 0);
    }

    return Number(value);
}

function fmtStops(stops) {
    const thirds = Math.round(stops * 3);

    if (thirds === 0) {
        return '±0';
    }

    const sign = thirds > 0 ? '+' : '−';
    const whole = Math.floor(Math.abs(thirds) / 3);
    const rest = Math.abs(thirds) % 3;
    const frac = rest ? `${rest}/3` : '';
    return `${sign}${whole ? whole : ''}${whole && frac ? ' ' : ''}${frac}`;
}

function tempText(step) {
    if (step.tempMax && step.tempMax !== step.temp) {
        return `${step.temp}–${step.tempMax} °C`;
    }

    return step.temp ? `${step.temp} °C` : '';
}

function agitationText(step) {
    const [initial, every, count] = step.agitation || [0, 0, 0];
    const parts = [];

    if (initial) {
        parts.push(`${initial} s agitate`);
    }

    if (every && count) {
        parts.push(`${parts.length ? 'then ' : ''}${count}× with ${every} s rest`);
    }

    return parts.join(', ');
}

/* -------------------------------------------------------------- calculation */

function pushTableTime(recipe, base, stops) {
    const table = recipe.pushTable || {};
    const known = n => (n === 0 ? base : Number.isFinite(table[n]) ? table[n] : null);

    if (known(stops) !== null) {
        return known(stops);
    }

    // Not in the table: start from the nearest known stop towards normal and
    // carry on with percent per stop from there.
    const dir = stops > 0 ? -1 : 1;
    let from = stops;

    while (known(from) === null) {
        from += dir;
    }

    const extra = Math.abs(stops - from);
    const factor = stops > 0 ? 1 + (recipe.pushPct || 20) / 100 : 1 - (recipe.pullPct || 20) / 100;
    return known(from) * Math.pow(factor, extra);
}

// How much longer (>1) or shorter (<1) development takes at `actual` than at `ref`.
function tempFactor(recipe, ref, actual) {
    const coef = (recipe.tempCoef || 0) / 100;
    const points = Object.entries(recipe.tempTable || {})
        .map(([t, s]) => [Number(t), Number(s)])
        .filter(([t, s]) => Number.isFinite(t) && s > 0)
        .sort((a, b) => a[0] - b[0]);

    // Log of the time at temperature t, from the table where it covers t.
    const logTime = t => {
        if (points.length < 2) {
            return null;
        }

        const lo = points[0];
        const hi = points[points.length - 1];

        if (t <= lo[0]) {
            return Math.log(lo[1]) + (lo[0] - t) * Math.log(1 + coef);
        }

        if (t >= hi[0]) {
            return Math.log(hi[1]) - (t - hi[0]) * Math.log(1 + coef);
        }

        for (let i = 1; i < points.length; i++) {
            const [t0, s0] = points[i - 1];
            const [t1, s1] = points[i];

            if (t <= t1) {
                const f = (t - t0) / (t1 - t0);
                return Math.log(s0) + (Math.log(s1) - Math.log(s0)) * f;
            }
        }

        return null;
    };

    const a = logTime(actual);
    const b = logTime(ref);

    if (a !== null && b !== null) {
        return Math.exp(a - b);
    }

    return Math.pow(1 + coef, ref - actual);
}

// The time of one step after push/pull, temperature and reuse corrections.
function stepTime(recipe, step) {
    let t = Number(step.time) || 0;

    if (step.kind !== 'dev') {
        return Math.round(t);
    }

    const stops = Math.round(settings.stops);

    if (recipe.pushMode === 'table') {
        t = pushTableTime(recipe, t, stops);
    } else if (recipe.pushMode === 'percent') {
        t *= stops >= 0 ? Math.pow(1 + recipe.pushPct / 100, stops) : Math.pow(1 - recipe.pullPct / 100, -stops);
    } else {
        t += stops >= 0 ? stops * recipe.pushAdd : stops * recipe.pullAdd;
    }

    if (Number.isFinite(settings.devTemp) && step.temp && settings.devTemp !== step.temp) {
        // Colder developer works slower: the maker's table where there is one,
        // otherwise tempCoef % per degree.
        t *= tempFactor(recipe, step.temp, settings.devTemp);
    }

    const rolls = Math.max(0, settings.rollsUsed || 0);
    t *= 1 + ((recipe.reusePct || 0) / 100) * rolls;
    // Seconds are added per batch of rolls (Tetenal: +15 s every 4 films).
    t += (recipe.reuseAdd || 0) * Math.floor(rolls / Math.max(1, recipe.reuseBatch || 1));

    return Math.max(5, Math.round(t));
}

function buildPlan(recipe) {
    return recipe.steps.map(step => ({ ...step, base: Number(step.time) || 0, time: stepTime(recipe, step) }));
}

// What happens during a step, in seconds from its start.
function stepEvents(plan, index, T) {
    const step = plan[index];
    const next = plan[index + 1];
    const [initial, every, count] = step.agitation || [0, 0, 0];
    // Optional heads-up before the end; the drain itself starts when time is up.
    const drainAt = settings.drainLead > 0 && step.kind !== 'prep' && T > settings.drainLead + 10 ? T - settings.drainLead : null;
    const events = [{ at: 0, type: 'pour' }];

    if (initial > 0) {
        events.push({ at: 0, type: 'agitate', until: Math.min(initial, T) });
        events.push({ at: Math.min(initial, T), type: 'rest' });
    }

    if (every > 0 && count > 0) {
        // A round of inversions takes time; the rest is counted from its end,
        // and the last round finishes before the drain warning.
        const round = count * Math.max(0.5, settings.invertSeconds || 2.5);
        const limit = (drainAt ?? T) - 2;

        for (let t = initial + every; t + round <= limit; t += round + every) {
            events.push({ at: t, type: 'invert', count, until: t + round });
        }
    }

    if (next && settings.prepLead > 0 && T > settings.prepLead + 15) {
        events.push({ at: T - settings.prepLead, type: 'prep' });
    }

    if (drainAt !== null) {
        events.push({ at: drainAt, type: 'drainSoon' });
    }

    events.push({ at: T, type: 'end' });
    return events.sort((a, b) => a.at - b.at);
}

/* ------------------------------------------------------------ voice + beeps */

const PHRASES = {
    en: {
        pour: s => (s.kind === 'wash' ? 'Fill with water' : s.kind === 'prep' ? `${s.name}` : `Pour in ${s.name}${s.agitation?.[0] ? ' and agitate' : ''}`),
        agitate: () => 'Agitate',
        rest: () => 'Rest',
        invert: n => `Invert ${n} ${n === 1 ? 'time' : 'times'}`,
        prep: s => `Next: ${s.name}. Get it ready.`,
        drainSoon: () => 'Get ready to drain',
        end: () => 'Drain now.',
        endWait: () => 'Drain now. Press next when the tank is empty.',
        finish: () => 'Drain now. All done — hang the film to dry.'
    },
    uk: {
        pour: s => (s.kind === 'wash' ? 'Заливай воду' : s.kind === 'prep' ? `${s.name}` : `Заливай ${s.name}${s.agitation?.[0] ? ' і крути' : ''}`),
        agitate: () => 'Крути',
        rest: () => 'Стоп',
        invert: n => `Переверни ${n} ${n === 1 ? 'раз' : n < 5 ? 'рази' : 'разів'}`,
        prep: s => `Далі ${s.name}. Готуй.`,
        drainSoon: () => 'Готуйся зливати',
        end: () => 'Зливай.',
        endWait: () => 'Зливай. Тисни далі, коли зіллєш.',
        finish: () => 'Зливай. Все готово — вішай плівку сушитись.'
    }
};

let audio = null;

function unlockAudio() {
    if (!audio) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audio = Ctx ? new Ctx() : null;
    }

    audio?.resume?.();
}

function tone(freq, at, duration, gain = 0.25, type = 'sine') {
    if (!audio || !settings.beeps) {
        return;
    }

    const start = audio.currentTime + at;
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const amp = audio.createGain();
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
}

const BEEPS = {
    pour: () => { tone(660, 0, 0.18); tone(880, 0.2, 0.3); },
    agitate: () => { tone(880, 0, 0.12); tone(880, 0.16, 0.12); },
    rest: () => tone(520, 0, 0.2, 0.15),
    invert: count => { for (let i = 0; i < count; i++) tone(990, i * 0.22, 0.12, 0.22); },
    prep: () => tone(600, 0, 0.35, 0.15, 'triangle'),
    drainSoon: () => tone(700, 0, 0.3, 0.15, 'triangle'),
    end: () => { tone(880, 0, 0.18); tone(700, 0.22, 0.18); tone(520, 0.44, 0.35); },
    endWait: () => { tone(880, 0, 0.18); tone(700, 0.22, 0.18); tone(520, 0.44, 0.35); },
    finish: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.18, 0.5, 0.18)); }
};

function speak(text) {
    if (!settings.voice || !('speechSynthesis' in window) || !text) {
        return;
    }

    const lang = settings.voiceLang === 'uk' ? 'uk-UA' : 'en-US';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2)));

    if (voice) {
        utterance.voice = voice;
    }

    utterance.rate = 1.02;
    speechSynthesis.speak(utterance);
}

function announce(type, step, extra) {
    const phrases = PHRASES[settings.voiceLang] || PHRASES.en;
    BEEPS[type]?.(extra);
    // Let the beep land first.
    setTimeout(() => speak(phrases[type]?.(type === 'invert' ? extra : step)), settings.beeps ? 350 : 0);

    if (navigator.vibrate) {
        navigator.vibrate(['end', 'endWait', 'finish'].includes(type) ? [200, 100, 200] : 120);
    }
}

/* ---------------------------------------------------------------- wake lock */

let wakeLock = null;

async function keepAwake(on) {
    try {
        if (on && !wakeLock && 'wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        } else if (!on && wakeLock) {
            await wakeLock.release();
            wakeLock = null;
        }
    } catch (error) {
        // Not available (or the page is hidden); the timer still works.
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && run && run.phase !== 'done') {
        keepAwake(true);
    }
});

/* -------------------------------------------------------------------- timer */

const now = () => Date.now();

function stepDuration() {
    return run.plan[run.index].time + (run.extra || 0);
}

function elapsed() {
    return ((run.pausedAt ?? now()) - run.startedAt) / 1000;
}

function startRun() {
    unlockAudio();
    const recipe = currentRecipe();
    run = {
        recipe: recipe.name,
        plan: buildPlan(recipe),
        index: 0,
        phase: 'step',
        startedAt: now(),
        pausedAt: null,
        extra: 0,
        fired: [],
        betweenEndsAt: null
    };
    keepAwake(true);
    saveRun();
    render();
    tick();
}

function startStep(index) {
    run.index = index;
    run.phase = 'step';
    run.startedAt = now();
    run.pausedAt = null;
    run.extra = 0;
    run.fired = [];
    run.betweenEndsAt = null;
    saveRun();
    render();
    tick();
}

function endStep() {
    const step = run.plan[run.index];
    run.endedAt = now();

    if (run.index >= run.plan.length - 1) {
        run.phase = 'done';
        run.pausedAt = null;
        announce('finish', step);
        keepAwake(false);
    } else if (settings.pauseMode === 'auto') {
        run.phase = 'between';
        run.betweenEndsAt = now() + Math.max(0, settings.pauseSeconds) * 1000;
        announce('end', step);
    } else {
        run.phase = 'between';
        run.betweenEndsAt = null;
        announce('endWait', step);
    }

    saveRun();
    render();
}

function togglePause() {
    if (!run || run.phase === 'done') {
        return;
    }

    if (run.pausedAt) {
        const delta = now() - run.pausedAt;
        run.startedAt += delta;

        if (run.betweenEndsAt) {
            run.betweenEndsAt += delta;
        }

        run.pausedAt = null;
    } else {
        run.pausedAt = now();
        speechSynthesis?.cancel?.();
    }

    saveRun();
    render();
}

function stopRun() {
    run = null;
    saveRun();
    keepAwake(false);
    speechSynthesis?.cancel?.();
    render();
}

function tick() {
    if (!run) {
        return;
    }

    if (run.phase === 'step' && !run.pausedAt) {
        const T = stepDuration();
        const e = elapsed();
        const step = run.plan[run.index];

        for (const event of stepEvents(run.plan, run.index, T)) {
            const key = `${event.type}@${event.at}`;

            if (event.at > e || run.fired.includes(key)) {
                continue;
            }

            run.fired.push(key);

            if (event.type === 'end') {
                saveRun();
                endStep();
                return;
            }

            // Only speak what is happening now (not catch-up after a reload).
            if (e - event.at < 3) {
                if (event.type === 'prep') {
                    announce('prep', run.plan[run.index + 1]);
                } else if (event.type === 'invert') {
                    announce('invert', step, event.count);
                } else if (event.type === 'agitate' && event.at === 0) {
                    // Already said with the pour.
                } else if (event.type !== 'rest' || step.agitation?.[1]) {
                    announce(event.type, step);
                }
            }

            saveRun();
        }
    }

    if (run.phase === 'between' && !run.pausedAt && run.betweenEndsAt && now() >= run.betweenEndsAt) {
        startStep(run.index + 1);
        return;
    }

    renderClock();
}

setInterval(tick, 200);

/* ------------------------------------------------------------------- render */

// How long the "drain" picture stays up after a step's time runs out.
const DRAIN_SHOW_MS = 12000;

function currentAction(step, T, e, events) {
    const soon = events.find(ev => ev.type === 'drainSoon');

    if (soon && e >= soon.at) {
        return { text: 'Get ready to drain', cls: 'is-wait' };
    }

    const agitate = events.find(ev => ev.type === 'agitate');

    if (agitate && e < agitate.until) {
        return { text: 'Agitate', cls: 'is-alert' };
    }

    const invert = events.find(ev => ev.type === 'invert' && e >= ev.at && e < ev.until);

    if (invert) {
        return { text: `Invert ×${invert.count}`, cls: 'is-alert' };
    }

    if (step.kind === 'wash') {
        return { text: 'Washing', cls: '' };
    }

    if (step.kind === 'prep') {
        return { text: step.name, cls: '' };
    }

    return { text: 'Rest', cls: '' };
}

function nextText(step, T, e, events) {
    const agitate = events.find(ev => ev.type === 'agitate');

    if (agitate && e < agitate.until) {
        return `Keep agitating · ${fmt(Math.ceil(agitate.until - e))} left`;
    }

    const inverting = events.find(ev => ev.type === 'invert' && e >= ev.at && e < ev.until);

    if (inverting) {
        return `${Math.ceil(inverting.until - e)} s, then stand for ${step.agitation[1]} s`;
    }

    const upcoming = events.find(ev => ev.at > e && ['invert', 'end', 'agitate'].includes(ev.type));

    if (!upcoming) {
        return '';
    }

    const left = fmt(upcoming.at - e);
    const following = run.plan[run.index + 1];

    switch (upcoming.type) {
        case 'invert':
            return `Invert ×${upcoming.count} in ${left}`;
        default:
            return following ? `Drain in ${left}, then ${following.name}${following.bath ? ` (bath ${following.bath})` : ''}` : `Drain in ${left} — last step`;
    }
}

function drawMarks(events, T) {
    const box = $('marks');
    const pct = v => `${((v / T) * 100).toFixed(2)}%`;
    const html = T > 0 ? events.map(ev => {
        if (ev.type === 'agitate') {
            return `<span class="mark mark--agitate" style="left:0;width:${pct(ev.until)}"></span>`;
        }

        if (ev.type === 'invert') {
            return `<span class="mark mark--invert" style="left:${pct(ev.at)};width:${pct(ev.until - ev.at)}"></span>`;
        }

        if (ev.type === 'drainSoon') {
            return `<span class="mark mark--drain" style="left:${pct(ev.at)}"></span>`;
        }

        return '';
    }).join('') : '';

    if (box.dataset.html !== html) {
        box.innerHTML = html;
        box.dataset.html = html;
    }
}

function setProgress(fraction) {
    $('progress-fill').style.width = `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(2)}%`;
}

// The tank drawing: what to do with it right now.
function setTank(state, step, opts = {}) {
    const tank = $('tank');

    if (opts.art) {
        const src = `./art/${opts.art}.webp`;

        if (!$('tank-extra').src.endsWith(src.slice(1))) {
            $('tank-extra').src = src;
        }
    }

    const kind = step ? step.kind : 'chem';
    const key = `${state}|${opts.key ?? ''}`;

    tank.dataset.kind = kind;
    tank.style.setProperty('--inv', `${Math.max(0.5, settings.invertSeconds)}s`);
    tank.style.setProperty('--count', String(opts.count || 1));
    tank.style.animationPlayState = '';
    tank.querySelectorAll('*').forEach(node => { node.style.animationPlayState = run?.pausedAt ? 'paused' : ''; });

    if (tank.dataset.key !== key) {
        // Restart CSS animations for each new round of inversions.
        tank.dataset.state = 'none';
        void tank.getBoundingClientRect();
        tank.dataset.state = state;
        tank.dataset.key = key;
    }

    const label = step && step.bath ? step.bath : '';

    if ($('tank-label').textContent !== label) {
        $('tank-label').textContent = label;
    }

    $('tank-caption').textContent = opts.caption || '';
}

function renderClock() {
    const label = $('step-label');
    const time = $('time');
    const action = $('action');
    const next = $('next');
    const hint = $('hint');

    if (!run) {
        const plan = buildPlan(currentRecipe());
        label.textContent = currentRecipe().name;
        time.textContent = fmt(plan.reduce((sum, step) => sum + step.time, 0));
        action.textContent = 'Ready';
        action.className = 'action';
        next.textContent = `${plan.length} steps · push/pull ${fmtStops(settings.stops)}`;
        hint.textContent = 'Space starts, pauses and moves to the next step.';
        setProgress(0);
        drawMarks([], 1);
        setTank('extra', null, { art: 'loading', caption: 'Load the reel in the dark, close the lid' });
        return;
    }

    const step = run.plan[run.index];

    // Right after a step's time is up: pour it out.
    const draining = run.endedAt && (run.pausedAt ?? now()) - run.endedAt < DRAIN_SHOW_MS;

    if (draining && run.phase !== 'step') {
        const done = run.plan[run.index];
        label.textContent = `${run.index + 1}/${run.plan.length} · ${done.name}${done.bath ? ` · bath ${done.bath}` : ''}`;
        time.textContent = '0:00';
        action.textContent = 'Drain';
        action.className = 'action is-drain is-alert';
        next.textContent = run.phase === 'done' ? 'Last step — then hang the film to dry'
            : run.betweenEndsAt ? `Next: ${run.plan[run.index + 1].name} in ${fmt(Math.ceil((run.betweenEndsAt - (run.pausedAt ?? now())) / 1000))}`
            : `Next: ${run.plan[run.index + 1].name} — press Next when the tank is empty`;
        hint.textContent = '';
        setProgress(1);
        drawMarks([], 1);
        setTank('drain', done, { caption: 'Pour it out' });
        return;
    }

    if (run.phase === 'done') {
        label.textContent = 'Done';
        time.textContent = '0:00';
        action.textContent = 'Hang to dry';
        action.className = 'action';
        next.textContent = `${run.recipe} · finished`;
        hint.textContent = '';
        setProgress(1);
        drawMarks([], 1);
        setTank('extra', null, { art: 'drying', caption: 'Hang it to dry' });
        return;
    }

    if (run.phase === 'between') {
        const following = run.plan[run.index + 1];
        label.textContent = `Next · step ${run.index + 2} of ${run.plan.length}`;
        action.textContent = `Pour ${following.name}${following.bath ? ` · bath ${following.bath}` : ''}`;
        action.className = 'action is-wait';

        if (run.betweenEndsAt) {
            const left = ((run.pausedAt ?? now()) - run.betweenEndsAt) / -1000;
            time.textContent = fmt(Math.ceil(left));
            next.textContent = run.pausedAt ? 'Paused' : `Starts by itself in ${fmt(Math.ceil(left))} — or press Next`;
            setProgress(1 - left / Math.max(1, settings.pauseSeconds));
        } else {
            time.textContent = fmt(following.time);
            next.textContent = `${tempText(following)} · press Next as you start pouring`;
            setProgress(0);
        }

        hint.textContent = following.note || '';
        drawMarks([], 1);
        const art = stepArt(following);
        setTank(art === 'wash' ? 'wash' : 'extra', following, { art: art === 'wash' ? null : art, caption: following.kind === 'wash' ? 'Get the water ready' : `Get bath ${following.bath || ''} ready`.trim() });
        return;
    }

    const T = stepDuration();
    const e = Math.min(elapsed(), T);
    const events = stepEvents(run.plan, run.index, T);
    const current = currentAction(step, T, e, events);

    label.textContent = `${run.index + 1}/${run.plan.length} · ${step.name}${step.bath ? ` · bath ${step.bath}` : ''}`;
    time.textContent = fmt(Math.ceil(T - e));
    action.textContent = run.pausedAt ? 'Paused' : current.text;
    action.className = `action ${run.pausedAt ? 'is-wait' : current.cls}`;
    next.textContent = nextText(step, T, e, events);
    hint.textContent = [tempText(step), step.note].filter(Boolean).join(' · ');
    setProgress(e / T);
    drawMarks(events, T);

    const agitate = events.find(ev => ev.type === 'agitate');
    const invert = events.find(ev => ev.type === 'invert' && e >= ev.at && e < ev.until);
    const each = `${settings.invertSeconds} s each`;

    if (step.kind === 'wash' || step.kind === 'prep') {
        setTank('wash', step, { caption: step.kind === 'wash' ? 'Fresh water through the tank' : step.name });
    } else if (e < 4) {
        setTank('pour', step, { caption: 'Pour in' });
    } else if (agitate && e < agitate.until) {
        setTank('agitate', step, { caption: `Keep inverting · ${each}` });
    } else if (invert) {
        setTank('invert', step, { key: invert.at, count: invert.count, caption: `Invert ×${invert.count} · ${each}` });
    } else {
        setTank('rest', step, { caption: 'Stand still' });
    }
}

function renderControls() {
    const running = Boolean(run) && run.phase !== 'done';
    document.body.classList.toggle('is-running', running);
    document.body.classList.toggle('is-moving', Boolean(run) && run.phase === 'step' && !run.pausedAt);
    $('q-voice').classList.toggle('is-on', settings.voice);
    $('q-beeps').classList.toggle('is-on', settings.beeps);
    $('start').hidden = running;
    $('start').innerHTML = run && run.phase === 'done' ? '<i class="bi bi-arrow-repeat"></i> Start again' : '<i class="bi bi-play-fill"></i> Start';
    $('pause').hidden = !running;
    $('pause').innerHTML = run?.pausedAt ? '<i class="bi bi-play-fill"></i> Resume' : '<i class="bi bi-pause-fill"></i> Pause';
    $('go-next').hidden = !(running && run.phase === 'between');
    $('plus10').hidden = !(running && run.phase === 'step');
    $('skip').hidden = !(running && run.phase === 'step');
    $('stop').hidden = !run;
    boxDial?.setDisabled(running);
    shotDial?.setDisabled(running);
    document.querySelectorAll('.setup input, .setup select, .setup button').forEach(node => {
        node.disabled = running && !['voice', 'voice-lang', 'beeps'].includes(node.id);
    });
}

// Which illustration goes with a step.
function stepArt(step) {
    const name = step.name.toLowerCase();

    if (step.kind === 'prep') {
        return 'thermometer';
    }

    if (step.kind === 'wash' || /wash|rinse|промив/.test(name)) {
        return 'wash';
    }

    if (/bleach|blix|відбіл/.test(name)) {
        return 'bleach';
    }

    if (/fix|фікс|stop|стоп/.test(name)) {
        return 'fixer';
    }

    if (/stab|wetting|photo-?flo|стаб|змочув/.test(name)) {
        return 'stabilizer';
    }

    return 'developer';
}

function renderPlan() {
    const recipe = currentRecipe();
    const plan = run ? run.plan : buildPlan(recipe);

    $('steps').innerHTML = plan.map((step, i) => {
        const changed = step.kind === 'dev' && step.time !== step.base;
        const state = !run ? '' : run.phase === 'done' || i < run.index || (i === run.index && run.phase === 'between') ? 'is-done' : i === run.index ? 'is-current' : '';
        const meta = [tempText(step), agitationText(step), step.note].filter(Boolean).join(' · ');
        return `<li class="frame ${state}">
            <span class="frame-no">▸${i + 1}</span>
            ${step.bath ? `<span class="frame-bath">BATH ${escapeHtml(step.bath)}</span>` : ''}
            <div class="frame-name">${escapeHtml(step.name)}</div>
            <div class="frame-time">${changed ? `<s>${fmt(step.base)}</s> <span class="changed">${fmt(step.time)}</span>` : fmt(step.time)}</div>
            <div class="frame-meta">${escapeHtml(meta)}</div>
            <img class="frame-icon" src="./art/${stepArt(step)}.webp" alt="" loading="lazy" />
        </li>`;
    }).join('');

    $('total').textContent = `${fmt(plan.reduce((sum, step) => sum + step.time, 0))}`;

    const current = $('steps').querySelector('.is-current');

    if (current) {
        current.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }

    // Edge print, like the rebate of a roll of film.
    const name = (run ? run.recipe : recipe.name).toUpperCase();
    const top = `${name}   ▸ ISO ${settings.isoBox}   ▸ EI ${niceIso(settings.isoBox * Math.pow(2, settings.stops))}   ▸ ${fmtStops(settings.stops)}   `;
    // Two identical halves, so moving by -50% loops without a jump; the speed
    // matches the sprocket holes (26 px a second).
    const fill = (node, unit) => {
        const half = unit.repeat(Math.max(1, Math.ceil(2400 / Math.max(1, unit.length * 7))));
        node.textContent = half + half;
        node.style.setProperty('--print-dur', `${(node.scrollWidth / 2 / 26).toFixed(1)}s`);
    };
    fill($('edge-top'), top);
    fill($('edge-bottom'), plan.map((step, i) => `▸${i + 1}   ${i + 1}A   `).join(''));
}

function renderSetup() {
    const recipes = allRecipes();
    const select = $('recipe');
    select.innerHTML = recipes.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${isOverridden(item.id) ? ' (edited)' : ''}</option>`).join('');
    select.value = currentRecipe().id;

    const recipe = currentRecipe();
    $('recipe-note').textContent = recipe.note || '';
    $('recipe-delete').disabled = isPreset(recipe.id) && !isOverridden(recipe.id);
    $('recipe-delete').title = isOverridden(recipe.id) ? 'Reset to the original preset' : 'Delete this process';

    if (!BOX_SPEEDS.includes(settings.isoBox)) {
        settings.isoBox = BOX_SPEEDS.reduce((best, v) => (Math.abs(Math.log2(v / settings.isoBox)) < Math.abs(Math.log2(best / settings.isoBox)) ? v : best), 400);
    }

    if (!shotDial || shotDial.box !== settings.isoBox) {
        buildShotDial();
    }

    boxDial.setValue(settings.isoBox);
    shotDial.setValue(Math.max(-3, Math.min(3, Math.round(settings.stops))));
    $('stops-out').textContent = settings.stops === 0 ? 'Normal' : `${settings.stops > 0 ? 'Push' : 'Pull'} ${fmtStops(settings.stops)}`;
    $('stops-note').textContent = `ISO ${settings.isoBox} → EI ${niceIso(settings.isoBox * Math.pow(2, settings.stops))}`;

    const dev = recipe.steps.find(step => step.kind === 'dev');
    $('dev-temp').value = Number.isFinite(settings.devTemp) ? settings.devTemp : (dev?.temp ?? '');
    $('dev-temp').placeholder = dev ? String(dev.temp) : '';
    $('rolls-used').value = settings.rollsUsed;

    const off = dev && Number.isFinite(settings.devTemp) ? settings.devTemp - dev.temp : 0;
    $('temp-warn').textContent = recipe.colour && Math.abs(off) >= 1
        ? `Colour developers are made for ${dev.temp} °C; at ${settings.devTemp} °C expect some colour and contrast shift, and test first.`
        : '';

    document.querySelectorAll('input[name="pause"]').forEach(radio => { radio.checked = radio.value === settings.pauseMode; });
    $('pause-seconds').value = settings.pauseSeconds;
    $('drain-lead').value = settings.drainLead;
    $('invert-seconds').value = settings.invertSeconds;
    $('prep-lead').value = settings.prepLead;
    $('voice').checked = settings.voice;
    $('voice-lang').value = settings.voiceLang;
    $('beeps').checked = settings.beeps;
}

function render() {
    renderSetup();
    renderPlan();
    renderControls();
    renderClock();
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

/* ---------------------------------------------------------------- ISO dials */

const BOX_SPEEDS = [25, 50, 100, 200, 400, 800, 1600, 3200, 6400];
const ISO_SERIES = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 16000, 20000, 25600, 32000, 40000, 51200];

// Nearest standard speed on the 1/3-stop scale.
const niceIso = value => ISO_SERIES.reduce((best, iso) => (Math.abs(Math.log2(iso / value)) < Math.abs(Math.log2(best / value)) ? iso : best), ISO_SERIES[0]);

/*
 * A rotary dial: the knob turns so the chosen value sits under the orange index
 * at the top. Drag (mouse or finger), scroll, arrow keys, or click a number.
 */
function createDial(host, { values, labels, sub, onChange }) {
    // Like a real dial: the chosen value and a few neighbours show at the top.
    const step = values.length > 9 ? 24 : 30;
    const face = document.createElement('div');
    face.className = 'dial-face';
    face.tabIndex = 0;
    face.setAttribute('role', 'slider');
    host.prepend(face);

    const ticks = Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        return `<line x1="${(60 + Math.cos(a) * 56).toFixed(2)}" y1="${(60 + Math.sin(a) * 56).toFixed(2)}" x2="${(60 + Math.cos(a) * 60).toFixed(2)}" y2="${(60 + Math.sin(a) * 60).toFixed(2)}" />`;
    }).join('');
    const nums = values.map((_, i) => {
        const a = ((i * step - 90) * Math.PI) / 180;
        const x = 60 + Math.cos(a) * 45;
        const y = 60 + Math.sin(a) * 45;
        return `<text class="dial-num" data-i="${i}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${i * step} ${x.toFixed(2)} ${y.toFixed(2)})">${labels[i]}</text>`;
    }).join('');

    face.innerHTML = `<svg viewBox="-4 -10 128 134">
        <polygon class="dial-index" points="54,-9 66,-9 60,-1" />
        <g class="dial-knob">
            <circle class="dial-rim" cx="60" cy="60" r="60" />
            <g class="dial-knurl">${ticks}</g>
            ${nums}
            <circle class="dial-cap" cx="60" cy="60" r="30" />
        </g>
    </svg>
    <div class="dial-value"><b></b><small></small></div>`;

    const knob = face.querySelector('.dial-knob');
    let index = 0;

    const set = (i, notify = true) => {
        const next = Math.max(0, Math.min(values.length - 1, i));
        const changed = next !== index;
        index = next;
        knob.style.transform = `rotate(${-index * step}deg)`;
        knob.style.transformOrigin = '60px 60px';
        face.querySelectorAll('.dial-num').forEach(node => {
            const distance = Math.abs(Number(node.dataset.i) - index) * step;
            node.classList.toggle('is-on', distance === 0);
            node.style.opacity = distance > 75 ? '0' : distance > 50 ? '0.45' : '1';
        });
        face.querySelector('.dial-value b').textContent = labels[index];
        face.querySelector('.dial-value small').textContent = sub ? sub(index) : '';
        face.setAttribute('aria-valuenow', String(values[index]));
        face.setAttribute('aria-valuetext', `${labels[index]} ${sub ? sub(index) : ''}`.trim());

        if (changed && notify) {
            onChange(values[index]);
        }
    };

    // Dragging: the knob follows the pointer freely, then clicks into the
    // nearest value when released. A tap on a number selects it.
    let drag = null;
    const center = () => {
        const r = face.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const angleAt = event => {
        const c = center();
        return (Math.atan2(event.clientY - c.y, event.clientX - c.x) * 180) / Math.PI;
    };
    const turnTo = degrees => {
        knob.style.transition = 'none';
        knob.style.transform = `rotate(${degrees}deg)`;
    };

    face.addEventListener('pointerdown', event => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        face.focus();
        face.setPointerCapture(event.pointerId);
        drag = { last: angleAt(event), turned: 0, x: event.clientX, y: event.clientY, start: index, moved: false, target: event.target };
    });

    face.addEventListener('pointermove', event => {
        if (!drag) {
            return;
        }

        const angle = angleAt(event);
        let delta = angle - drag.last;
        delta = ((delta + 540) % 360) - 180;
        drag.last = angle;
        drag.turned += delta;

        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) {
            drag.moved = true;
        }

        // Turning the knob clockwise brings lower values to the index, like a camera dial.
        const raw = -drag.start * step + drag.turned;
        const clamped = Math.max(-(values.length - 1) * step, Math.min(0, raw));
        turnTo(clamped);
        const live = Math.round(-clamped / step);

        if (live !== index) {
            set(live);
            turnTo(clamped);
        }
    });

    const end = event => {
        if (!drag) {
            return;
        }

        const num = !drag.moved && drag.target.closest?.('.dial-num');
        drag = null;
        knob.style.transition = '';

        if (num) {
            set(Number(num.dataset.i));
        } else {
            set(index, false);
        }
    };

    face.addEventListener('pointerup', end);
    face.addEventListener('pointercancel', end);

    face.addEventListener('wheel', event => {
        event.preventDefault();
        set(index + (event.deltaY > 0 ? -1 : 1));
    }, { passive: false });

    face.addEventListener('keydown', event => {
        const keys = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };

        if (keys[event.key]) {
            event.preventDefault();
            set(index + keys[event.key]);
        }
    });

    return {
        setValue(value) {
            const i = values.indexOf(value);
            set(i >= 0 ? i : 0, false);
        },
        setDisabled(disabled) {
            face.style.pointerEvents = disabled ? 'none' : '';
            face.style.opacity = disabled ? '0.5' : '';
        }
    };
}

const STOP_STEPS = [-3, -2, -1, 0, 1, 2, 3];
let boxDial = null;
let shotDial = null;

function buildDials() {
    boxDial = createDial($('dial-box'), {
        values: BOX_SPEEDS,
        labels: BOX_SPEEDS.map(String),
        sub: () => 'ISO',
        onChange: value => setSettings({ isoBox: value, isoShot: niceIso(value * Math.pow(2, settings.stops)) })
    });
}

// The shot dial lists the box speed pushed or pulled by whole stops.
function buildShotDial() {
    const host = $('dial-shot');
    host.querySelector('.dial-face')?.remove();
    shotDial = createDial(host, {
        values: STOP_STEPS,
        labels: STOP_STEPS.map(n => String(niceIso(settings.isoBox * Math.pow(2, n)))),
        sub: i => (STOP_STEPS[i] === 0 ? 'EI · BOX' : `EI · ${fmtStops(STOP_STEPS[i])}`),
        onChange: stops => setSettings({ stops, isoShot: niceIso(settings.isoBox * Math.pow(2, stops)) })
    });
    shotDial.box = settings.isoBox;
}

/* ------------------------------------------------------------------- inputs */

function setSettings(patch) {
    settings = { ...settings, ...patch };
    saveSettings();
    render();
}

function bindSetup() {
    $('recipe').addEventListener('change', event => setSettings({ recipeId: event.target.value, devTemp: null }));

    $('dev-temp').addEventListener('change', event => {
        const value = parseFloat(event.target.value);
        setSettings({ devTemp: Number.isFinite(value) ? value : null });
    });
    $('dev-temp-reset').addEventListener('click', () => setSettings({ devTemp: null }));
    $('rolls-used').addEventListener('change', event => setSettings({ rollsUsed: Math.max(0, parseInt(event.target.value, 10) || 0) }));

    document.querySelectorAll('input[name="pause"]').forEach(radio => radio.addEventListener('change', () => setSettings({ pauseMode: radio.value })));
    $('pause-seconds').addEventListener('change', event => setSettings({ pauseSeconds: Math.max(0, parseInt(event.target.value, 10) || 0) }));
    $('invert-seconds').addEventListener('change', event => setSettings({ invertSeconds: Math.max(0.5, Math.min(10, parseFloat(event.target.value) || 2.5)) }));
    $('q-voice').addEventListener('click', () => setSettings({ voice: !settings.voice }));
    $('q-beeps').addEventListener('click', () => {
        unlockAudio();
        setSettings({ beeps: !settings.beeps });
    });
    $('drain-lead').addEventListener('change', event => setSettings({ drainLead: Math.max(0, parseInt(event.target.value, 10) || 0) }));
    $('prep-lead').addEventListener('change', event => setSettings({ prepLead: Math.max(0, parseInt(event.target.value, 10) || 0) }));
    $('voice').addEventListener('change', event => {
        setSettings({ voice: event.target.checked });

        if (event.target.checked) {
            speak(settings.voiceLang === 'uk' ? 'Голос увімкнено' : 'Voice on');
        }
    });
    $('voice-lang').addEventListener('change', event => {
        setSettings({ voiceLang: event.target.value });
        speak(settings.voiceLang === 'uk' ? 'Крути' : 'Agitate');
    });
    $('beeps').addEventListener('change', event => {
        unlockAudio();
        setSettings({ beeps: event.target.checked });
        BEEPS.agitate();
    });

    $('recipe-edit').addEventListener('click', () => Editor.open(currentRecipe(), false));
    $('recipe-copy').addEventListener('click', () => Editor.open({ ...structuredClone(currentRecipe()), name: `${currentRecipe().name} (copy)` }, true));
    $('recipe-new').addEventListener('click', () => Editor.open(structuredClone(BLANK_RECIPE), true));
    $('recipe-delete').addEventListener('click', () => {
        const recipe = currentRecipe();
        const button = $('recipe-delete');

        // Two clicks, no dialog: the first one arms it.
        if (!button.dataset.armed) {
            button.dataset.armed = '1';
            button.innerHTML = isOverridden(recipe.id) ? 'Reset?' : 'Delete?';
            setTimeout(() => {
                delete button.dataset.armed;
                button.innerHTML = '<i class="bi bi-trash3"></i>';
            }, 3000);
            return;
        }

        customRecipes = customRecipes.filter(item => item.id !== recipe.id);
        saveRecipes();
        delete button.dataset.armed;
        button.innerHTML = '<i class="bi bi-trash3"></i>';
        setSettings({ recipeId: isPreset(recipe.id) ? recipe.id : PRESETS[0].id });
    });

    $('start').addEventListener('click', startRun);
    $('pause').addEventListener('click', togglePause);
    $('go-next').addEventListener('click', () => {
        unlockAudio();
        startStep(run.index + 1);
    });
    $('plus10').addEventListener('click', () => {
        run.extra = (run.extra || 0) + 10;
        saveRun();
        renderClock();
    });
    $('skip').addEventListener('click', () => {
        run.fired.push(`end@${stepDuration()}`);
        endStep();
    });
    $('stop').addEventListener('click', () => {
        const button = $('stop');

        if (run.phase !== 'done' && !button.dataset.armed) {
            button.dataset.armed = '1';
            button.innerHTML = '<i class="bi bi-stop-fill"></i> Stop the run?';
            setTimeout(() => {
                delete button.dataset.armed;
                button.innerHTML = '<i class="bi bi-stop-fill"></i> Stop';
            }, 3000);
            return;
        }

        delete button.dataset.armed;
        button.innerHTML = '<i class="bi bi-stop-fill"></i> Stop';
        stopRun();
    });

    document.addEventListener('keydown', event => {
        if (event.target.closest('input, select, textarea, dialog') || event.code !== 'Space') {
            return;
        }

        event.preventDefault();

        if (!run || run.phase === 'done') {
            startRun();
        } else if (run.phase === 'between') {
            unlockAudio();
            startStep(run.index + 1);
        } else {
            togglePause();
        }
    });
}

/* ------------------------------------------------------------------- editor */

const Editor = {
    recipe: null,
    isNew: false,
    open(recipe, isNew) {
        this.recipe = structuredClone(recipe);
        this.isNew = isNew;
        $('ed-name').value = this.recipe.name;
        $('ed-push-mode').value = this.recipe.pushMode || 'add';
        $('ed-push-add').value = this.recipe.pushAdd ?? 30;
        $('ed-pull-add').value = this.recipe.pullAdd ?? 30;
        $('ed-push-pct').value = this.recipe.pushPct ?? 30;
        $('ed-pull-pct').value = this.recipe.pullPct ?? 20;
        $('ed-push-table').value = Object.entries(this.recipe.pushTable || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([stops, seconds]) => `${Number(stops) > 0 ? '+' : ''}${stops}: ${fmt(seconds)}`).join(', ');
        $('ed-temp-coef').value = this.recipe.tempCoef ?? 0;
        $('ed-temp-table').value = Object.entries(this.recipe.tempTable || {})
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([t, sec]) => `${t}: ${fmt(sec)}`).join(', ');
        $('ed-colour').checked = Boolean(this.recipe.colour);
        $('ed-reuse-pct').value = this.recipe.reusePct ?? 0;
        $('ed-reuse-add').value = this.recipe.reuseAdd ?? 0;
        $('ed-reuse-batch').value = this.recipe.reuseBatch ?? 1;
        $('ed-note').value = this.recipe.note || '';
        this.syncPushFields();
        this.renderSteps();
        $('editor').showModal();
    },
    syncPushFields() {
        const mode = $('ed-push-mode').value;
        document.querySelectorAll('[data-push]').forEach(node => { node.hidden = node.dataset.push !== mode; });
    },
    renderSteps() {
        $('ed-steps').innerHTML = this.recipe.steps.map((step, i) => {
            const [initial, every, count] = step.agitation || [0, 0, 0];
            return `<div class="ed-step" data-i="${i}">
                <input type="text" data-f="name" value="${escapeHtml(step.name)}" aria-label="Step name" />
                <input type="text" data-f="bath" value="${escapeHtml(step.bath || '')}" aria-label="Bath" />
                <input type="number" data-f="temp" step="0.1" value="${step.temp ?? ''}" aria-label="Temperature" />
                <input type="number" data-f="tempMax" step="0.1" value="${step.tempMax ?? ''}" aria-label="Up to" />
                <input type="text" data-f="time" value="${fmt(step.time)}" aria-label="Time" />
                <input type="checkbox" data-f="dev" ${step.kind === 'dev' ? 'checked' : ''} title="Developer: push/pull, temperature and reuse apply" />
                <input type="number" data-f="initial" min="0" value="${initial}" aria-label="Agitate first, s" />
                <input type="number" data-f="every" min="0" value="${every}" aria-label="Invert every, s" />
                <input type="number" data-f="count" min="0" value="${count}" aria-label="Inversions" />
                <input type="text" data-f="note" value="${escapeHtml(step.note || '')}" aria-label="Note" />
                <span class="ed-step-actions">
                    <button type="button" class="btn" data-act="up" title="Move up"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="btn" data-act="down" title="Move down"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="btn btn--danger" data-act="del" title="Remove"><i class="bi bi-x-lg"></i></button>
                </span>
            </div>`;
        }).join('');
    },
    readSteps() {
        const rows = [...$('ed-steps').querySelectorAll('.ed-step')];
        this.recipe.steps = rows.map((row, i) => {
            const get = f => row.querySelector(`[data-f="${f}"]`);
            const num = f => {
                const v = parseFloat(get(f).value);
                return Number.isFinite(v) ? v : null;
            };
            const old = this.recipe.steps[i] || {};
            const name = get('name').value.trim() || 'Step';
            const time = parseTime(get('time').value);
            const isDev = get('dev').checked;
            const kind = isDev ? 'dev' : (old.kind === 'dev' ? 'chem' : old.kind) || (/wash|rinse|промив/i.test(name) ? 'wash' : 'chem');
            return {
                name,
                bath: get('bath').value.trim(),
                kind,
                temp: num('temp'),
                tempMax: num('tempMax'),
                time: Number.isFinite(time) && time > 0 ? Math.round(time) : 60,
                agitation: [num('initial') || 0, num('every') || 0, num('count') || 0],
                note: get('note').value.trim()
            };
        });
    },
    parseTable(text, allowZero = false) {
        const table = {};
        text.split(',').forEach(part => {
            const [stops, time] = part.split(/:(.+)/).map(s => s && s.trim());
            const s = Number(stops);
            const t = parseTime(time || '');

            if (Number.isFinite(s) && (allowZero || s !== 0) && Number.isFinite(t) && t > 0) {
                table[s] = Math.round(t);
            }
        });
        return table;
    },
    save() {
        this.readSteps();
        const r = this.recipe;
        r.name = $('ed-name').value.trim() || 'My process';
        r.pushMode = $('ed-push-mode').value;
        r.pushAdd = Number($('ed-push-add').value) || 0;
        r.pullAdd = Number($('ed-pull-add').value) || 0;
        r.pushPct = Number($('ed-push-pct').value) || 0;
        r.pullPct = Number($('ed-pull-pct').value) || 0;
        r.pushTable = this.parseTable($('ed-push-table').value);
        r.tempCoef = Number($('ed-temp-coef').value) || 0;
        r.tempTable = this.parseTable($('ed-temp-table').value, true);
        r.colour = $('ed-colour').checked;
        r.reusePct = Number($('ed-reuse-pct').value) || 0;
        r.reuseAdd = Number($('ed-reuse-add').value) || 0;
        r.reuseBatch = Math.max(1, parseInt($('ed-reuse-batch').value, 10) || 1);
        r.note = $('ed-note').value.trim();

        if (this.isNew || !r.id) {
            r.id = `custom-${Date.now()}`;
        }

        customRecipes = customRecipes.filter(item => item.id !== r.id).concat([r]);
        saveRecipes();
        $('editor').close();
        setSettings({ recipeId: r.id });
    },
    bind() {
        $('ed-push-mode').addEventListener('change', () => this.syncPushFields());
        $('ed-close').addEventListener('click', () => $('editor').close());
        $('ed-cancel').addEventListener('click', () => $('editor').close());
        $('ed-save').addEventListener('click', () => this.save());
        $('ed-add-step').addEventListener('click', () => {
            this.readSteps();
            this.recipe.steps.push({ name: 'New step', bath: '', kind: 'chem', temp: 20, time: 60, agitation: [30, 30, 2] });
            this.renderSteps();
        });
        $('ed-steps').addEventListener('click', event => {
            const button = event.target.closest('[data-act]');

            if (!button) {
                return;
            }

            this.readSteps();
            const i = Number(button.closest('.ed-step').dataset.i);
            const steps = this.recipe.steps;

            if (button.dataset.act === 'del') {
                steps.splice(i, 1);
            } else {
                const j = button.dataset.act === 'up' ? i - 1 : i + 1;

                if (j >= 0 && j < steps.length) {
                    [steps[i], steps[j]] = [steps[j], steps[i]];
                }
            }

            this.renderSteps();
        });
    }
};

/* --------------------------------------------------------------------- init */

buildDials();
bindSetup();
Editor.bind();

if (run && run.phase !== 'done') {
    keepAwake(true);
}

if ('speechSynthesis' in window) {
    // Voices load asynchronously in Chrome.
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices());
}

render();

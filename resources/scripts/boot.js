// Boot sequence shown once per browser session, before the desktop is usable.
const BootSequence = {
    element: null,
    hintEl: null,
    timers: [],
    lines: [
        'UAVN//OS  v0.9.1   (c) ninety pines',
        '',
        'POST .................... <span class="ok">OK</span>',
        'cpu: 1 x 33MHz  mem: 8192K ... <span class="ok">OK</span>',
        'mounting /dev/pines ..... <span class="ok">OK</span>',
        'loading window manager .. <span class="ok">OK</span>',
        'scanning /apps .......... <span class="ok">6 FOUND</span>',
        'tape deck: TAPE_090 loaded, <span class="warn">2 SEGMENTS MISSING</span>',
        'counting trees .......... <span class="warn">91</span>',
        '',
        'login: <span class="ok">guest</span>',
        'welcome back.'
    ],
    init() {
        this.element = document.getElementById('boot');

        if (!this.element) {
            return;
        }

        if (sessionStorage.getItem('bootShown') === '1') {
            this.element.remove();
            return;
        }

        this.hintEl = document.createElement('div');
        this.hintEl.className = 'boot-hint';
        this.hintEl.textContent = 'press any key to skip';
        this.element.appendChild(this.hintEl);

        this.element.addEventListener('click', () => this.finish());
        this.keyHandler = () => this.finish();
        document.addEventListener('keydown', this.keyHandler);

        this.lines.forEach((line, index) => {
            this.timers.push(setTimeout(() => this.printLine(line), 90 + index * 130));
        });

        this.timers.push(setTimeout(() => this.finish(), 130 * this.lines.length + 600));
    },
    printLine(html) {
        if (!this.element) {
            return;
        }

        const lineEl = document.createElement('div');
        lineEl.className = 'boot-line';
        lineEl.innerHTML = html || '&nbsp;';
        this.element.insertBefore(lineEl, this.hintEl);
    },
    finish() {
        if (!this.element || this.element.classList.contains('is-done')) {
            return;
        }

        this.timers.forEach(clearTimeout);
        this.timers = [];
        document.removeEventListener('keydown', this.keyHandler);

        sessionStorage.setItem('bootShown', '1');
        this.element.classList.add('is-done');

        setTimeout(() => {
            if (this.element) {
                this.element.remove();
                this.element = null;
            }
        }, 400);
    }
};

document.addEventListener('DOMContentLoaded', () => BootSequence.init());

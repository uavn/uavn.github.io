Widgets = {
    init() {
        this.clock();
        this.timecode();
        this.log();
    },
    // Camcorder timecode, same readout as the Ninety Pines page.
    timecode() {
        const element = document.getElementById('hud-timecode');

        if (!element) {
            return;
        }

        const start = Date.now();
        const pad = value => String(value).padStart(2, '0');

        setInterval(() => {
            const elapsed = Date.now() - start;
            const seconds = Math.floor(elapsed / 1000);

            element.textContent = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(Math.floor((elapsed % 1000) / 40))}`;
        }, 40);
    },
    // Ambient background chatter, purely decorative.
    log() {
        const logElement = document.getElementById('hud-log');

        if (!logElement) {
            return;
        }

        const templates = [
            'tail /var/log/pines.log ... ok',
            'gc: reclaimed {n}K',
            'ping 10.0.0.{n} ... {n}ms',
            'sha256 verify block {n} ... ok',
            'fs: /dev/pines {n}% used',
            'socket {n} opened',
            'socket {n} closed',
            'trace: {n} hops masked',
            'render: {n} fps',
            'idle {n}%',
            'no signal on cam 0{n}',
            'unity build cached ({n}MB)'
        ];

        function push() {
            const line = document.createElement('div');
            line.textContent = templates[Math.floor(Math.random() * templates.length)]
                .replace(/\{n\}/g, () => Math.floor(Math.random() * 90) + 4);
            logElement.appendChild(line);

            while (logElement.childElementCount > 14) {
                logElement.removeChild(logElement.firstElementChild);
            }
        }

        for (let i = 0; i < 8; i += 1) {
            push();
        }

        setInterval(push, 1800);
    },
    clock() {
        const clockElement = document.getElementById('clock');

        function updateClock() {
            if (clockElement) {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const date = `${days[now.getDay()]} ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                clockElement.innerHTML = `<div class="clock-time">${hours}:${minutes}:${seconds}</div><div class="clock-date">${date}</div>`;
            }
        }

        // Update the clock immediately if the element exists
        if (clockElement) {
            updateClock();

            // And then update it every second
            setInterval(updateClock, 1000);
        }
    }
};
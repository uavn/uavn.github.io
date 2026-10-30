const Widgets = {
    init() {
        this.clock();
    },
    // Menu bar clock, "Tue Oct 27  14:05".
    clock() {
        const clockElement = document.getElementById('clock');

        if (!clockElement) {
            return;
        }

        const format = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        function updateClock() {
            const now = new Date();
            const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            clockElement.textContent = `${format.format(now).replace(',', '')}  ${time}`;
        }

        updateClock();
        setInterval(updateClock, 1000);
    }
};

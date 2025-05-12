Widgets = {
    init() {
        this.clock();
    },
    clock() {
        const clockElement = document.getElementById('clock');

        function updateClock() {
            if (clockElement) {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                clockElement.textContent = `${hours}:${minutes}:${seconds}`;
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
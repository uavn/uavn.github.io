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
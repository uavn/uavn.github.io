// Track the state of keys
const keysPressed = {};

export function initInput() {
    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();

        keysPressed[key] = true;
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();

        keysPressed[key] = false;
    });
}

// Check if a key is pressed
export function keyPressed(key) {
    return keysPressed[key.toLowerCase()] || false;
}

export class GameLoop {
    constructor({ update, render }) {
        this.update = update;
        this.render = render;
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.requestId = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    loop(currentTime) {
        if (!this.isRunning) return;

        this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        this.update(this.deltaTime);
        this.render();

        this.requestId = requestAnimationFrame(this.loop.bind(this));
    }
};

export class Text {
    constructor({ text, font, color, x, y, anchor = { x: 0, y: 0 }, textAlign = 'left', lineHeight = 1.3 }) {
        this.text = text;
        this.font = font;
        this.color = color;
        this.x = x;
        this.y = y;
        this.anchor = anchor;
        this.textAlign = textAlign;
        this.lineHeight = lineHeight;
        this.canvas = document.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
    }

    render() {
        const { context, text, font, color, x, y, anchor, textAlign, lineHeight } = this;

        context.font = font;
        context.fillStyle = color;
        context.textAlign = textAlign;
        context.textBaseline = 'top';

        const lines = text.split('\n');
        const lineHeightAdjusted = lineHeight * parseInt(font, 10);

        lines.forEach((line, index) => {
            context.fillText(line, x - (context.measureText(line).width * anchor.x), y + (index * lineHeightAdjusted) - (anchor.y * lineHeightAdjusted));
        });
    }
};
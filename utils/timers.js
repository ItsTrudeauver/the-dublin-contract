/**
 * timers.js
 * Handles countdown logic and formatting.
 */

export class MissionTimer {
    constructor(displayElement, onExpire) {
        this.displayElement = displayElement;
        this.onExpire = onExpire;
        this.intervalId = null;
        this.remainingSeconds = 0;
        this.isActive = false;
    }

    start(seconds) {
        this.stop(); // Clear any existing timer
        
        if (seconds === null || seconds <= 0) {
            this.displayElement.innerText = "NO TIME LIMIT";
            this.displayElement.classList.remove('danger');
            return;
        }

        this.remainingSeconds = seconds;
        this.isActive = true;
        this.updateDisplay();
        this.displayElement.classList.remove('hidden');

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isActive = false;
    }

    tick() {
        this.remainingSeconds--;
        this.updateDisplay();

        // Warning Visuals
        if (this.remainingSeconds <= 30) {
            this.displayElement.classList.add('danger'); // Make it red/pulsing via CSS
        } else {
            this.displayElement.classList.remove('danger');
        }

        if (this.remainingSeconds <= 0) {
            this.stop();
            if (this.onExpire) this.onExpire();
        }
    }

    updateDisplay() {
        const m = Math.floor(this.remainingSeconds / 60);
        const s = this.remainingSeconds % 60;
        // Pad with zeros (e.g., "04:05")
        const text = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        this.displayElement.innerText = text;
    }
}
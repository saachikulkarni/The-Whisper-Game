/* =========================================================
   SYNTHESIZED WEB AUDIO API SOUND SYSTEM
   Zero external asset dependencies - instant, crisp party audio
========================================================= */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playTone(frequency, type = "sine", duration = 0.2, gainValue = 0.15) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

            gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio context error fallback
        }
    }

    // Sound effect: Button Click / Pop
    click() {
        this.playTone(600, "sine", 0.08, 0.1);
    }

    // Sound effect: Player Joined room
    playerJoin() {
        if (!this.enabled) return;
        this.init();
        setTimeout(() => this.playTone(440, "triangle", 0.1, 0.12), 0);
        setTimeout(() => this.playTone(660, "triangle", 0.15, 0.12), 100);
    }

    // Sound effect: Game / Round Start Fanfare
    gameStart() {
        if (!this.enabled) return;
        this.init();
        const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, "triangle", 0.25, 0.15);
            }, idx * 120);
        });
    }

    // Sound effect: Your turn!
    yourTurn() {
        if (!this.enabled) return;
        this.init();
        this.playTone(523.25, "sine", 0.12, 0.2); // C5
        setTimeout(() => this.playTone(659.25, "sine", 0.2, 0.2), 120); // E5
        setTimeout(() => this.playTone(783.99, "sine", 0.35, 0.2), 240); // G5
    }

    // Sound effect: Word passed whoosh
    wordPass() {
        if (!this.enabled) return;
        this.init();
        this.playTone(350, "sine", 0.15, 0.1);
        setTimeout(() => this.playTone(700, "sine", 0.2, 0.1), 80);
    }

    // Sound effect: Question asked chime
    questionAsked() {
        if (!this.enabled) return;
        this.init();
        this.playTone(400, "triangle", 0.15, 0.15);
        setTimeout(() => this.playTone(600, "sine", 0.25, 0.15), 130);
    }

    // Sound effect: Dramatic Reveal Drumroll & Chord
    wordReveal() {
        if (!this.enabled) return;
        this.init();
        // Suspense hits
        this.playTone(200, "square", 0.1, 0.08);
        setTimeout(() => this.playTone(280, "square", 0.1, 0.08), 100);
        setTimeout(() => this.playTone(360, "triangle", 0.12, 0.1), 200);
        setTimeout(() => {
            // Big chord
            this.playTone(523.25, "triangle", 0.5, 0.2);
            this.playTone(659.25, "triangle", 0.5, 0.18);
            this.playTone(783.99, "sine", 0.5, 0.18);
        }, 320);
    }

    // Sound effect: Vote registered
    votePop() {
        this.playTone(500, "sine", 0.1, 0.15);
    }

    // Sound effect: Victory / High Points celebration
    celebrate() {
        if (!this.enabled) return;
        this.init();
        const fan = [392, 523.25, 659.25, 783.99, 1046.5];
        fan.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, "triangle", 0.3, 0.2);
            }, idx * 110);
        });
    }

    // Sound effect: Floating reaction pop
    reactionPop() {
        this.playTone(850 + Math.random() * 200, "sine", 0.1, 0.08);
    }
}

const sounds = new SoundSystem();
window.sounds = sounds;

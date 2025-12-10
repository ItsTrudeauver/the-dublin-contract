/**
 * audio-manager.js
 * FIXED: Unlocks audio immediately when initialized via button click.
 */
export class AudioManager {
    constructor() {
        this.enabled = false;
        this.isMuted = localStorage.getItem('dublin_mute') === 'true';
        this.currentTrack = null;
        
        // The BGM Player
        this.bgm = new Audio();
        this.bgm.loop = true;
        this.bgm.volume = 0.5;

        // Track Registry
        this.tracks = {
            'theme_calm': './assets/music/ambience_low.mp3',   
            'theme_tense': './assets/music/ambience_med.mp3', 
            'theme_action': './assets/music/ambience_high.mp3'
        };
    }

    init() {
        // 1. We are being called from the "Start Game" button, so we HAVE a user gesture.
        // Unlock immediately.
        this.enabled = true;

        // 2. If we were already trying to play something, play it now.
        if (this.currentTrack && !this.isMuted) {
            this.bgm.play().catch(e => {
                console.warn("Audio Auto-Start Blocked:", e);
                // Fallback: If browser is super strict, wait for next click
                this.enabled = false; 
                this.attachFallbackListener();
            });
        }
        
        this.updateMuteState();
    }

    attachFallbackListener() {
        const unlockHandler = () => {
            this.enabled = true;
            if (this.currentTrack && !this.isMuted) {
                this.bgm.play();
            }
            document.body.removeEventListener('click', unlockHandler);
            document.body.removeEventListener('keydown', unlockHandler);
        };
        document.body.addEventListener('click', unlockHandler);
        document.body.addEventListener('keydown', unlockHandler);
    }

    playTrack(trackId) {
        if (this.currentTrack === trackId) return; 

        const src = this.tracks[trackId];
        if (!src) return;

        this.currentTrack = trackId;
        this.bgm.src = src;
        
        if (this.enabled && !this.isMuted) {
            this.bgm.play().catch(e => console.log("Waiting for interaction..."));
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('dublin_mute', this.isMuted);
        this.updateMuteState();
    }

    updateMuteState() {
        if (this.isMuted) {
            this.bgm.pause();
        } else {
            if (this.enabled && this.currentTrack) this.bgm.play();
        }
        
        const btn = document.getElementById('btn-audio');
        if (btn) btn.innerText = this.isMuted ? "UNMUTE" : "MUTE";
    }
}
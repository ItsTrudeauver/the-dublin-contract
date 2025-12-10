import { LevelManager } from './engine/level-manager.js';
import { UIManager } from './engine/ui.js';
import { Graph } from './engine/graph.js';
import { BinManager } from './engine/bin-manager.js'; 
import { AudioManager } from './engine/audio-manager.js';
import { DevTools } from './engine/dev-tools.js'; 

const Game = {
    levelManager: null,
    ui: null,
    graph: null,
    binManager: null,
    audio: null,
    
    init: function() {
        console.log("SYSTEM BOOT SEQUENCE INITIATED...");
        
        // 1. Setup Architecture
        this.graph = new Graph();
        this.audio = new AudioManager();
        this.ui = new UIManager(this.graph);
        this.binManager = new BinManager(this.graph); 
        this.levelManager = new LevelManager(this.graph, this.ui, this.audio);
        
        this.ui.initInputListeners();

        // 2. Bind Landing Page Start
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const saved = this.levelManager.getSavedLevel();
                this.startGame(saved);
            });
        }

        // 3. Bind Mute
        const muteBtn = document.getElementById('btn-audio');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.audio.toggleMute());
        }

        // --- NEW: BIND MISSION SELECTOR (HUD) ---
        const missionsBtn = document.getElementById('btn-missions');
        const closeMissionsBtn = document.getElementById('btn-close-missions');
        
        if (missionsBtn) {
            missionsBtn.addEventListener('click', () => this.openMissionMenu());
        }
        if (closeMissionsBtn) {
            closeMissionsBtn.addEventListener('click', () => {
                document.getElementById('mission-overlay').classList.add('hidden');
            });
        }

        // 4. Debug Tools (Keep commented for production)
        // new DevTools(this.levelManager);
    },

    openMissionMenu: function() {
        const overlay = document.getElementById('mission-overlay');
        const grid = document.getElementById('mission-grid');
        const savedLevel = this.levelManager.getSavedLevel();

        // 1. Clear previous
        grid.innerHTML = '';

        // 2. Populate Grid
        for (let i = 1; i <= savedLevel; i++) {
            const btn = document.createElement('button');
            btn.innerText = i.toString().padStart(2, '0');
            
            // Mark the level we are currently playing
            if (i === this.levelManager.currentLevelId) {
                btn.classList.add('current-level');
            }

            btn.onclick = () => {
                // Load level and close menu
                this.startGame(i);
                overlay.classList.add('hidden');
            };

            grid.appendChild(btn);
        }

        // 3. Show Menu
        overlay.classList.remove('hidden');
    },

    startGame: async function(levelId) {
        // 1. Unlock Audio
        this.audio.init();

        // 2. Hide Landing / Show Game
        const landing = document.getElementById('landing-page');
        const game = document.getElementById('game-container');
        
        if (landing) landing.classList.add('hidden');
        if (game) game.classList.remove('hidden');

        // 3. Load Level
        console.log(`Loading Level ${levelId}`);
        await this.levelManager.loadLevel(levelId);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
import { LevelManager } from './engine/level-manager.js';
import { UIManager } from './engine/ui.js';
import { Graph } from './engine/graph.js';
import { BinManager } from './engine/bin-manager.js'; 
import { AudioManager } from './engine/audio-manager.js';
import { DevTools } from './engine/dev-tools.js'; // <--- ENABLED

const Game = {
    levelManager: null,
    ui: null,
    graph: null,
    binManager: null,
    audio: null,
    
    init: function() {
        console.log("SYSTEM BOOT SEQUENCE INITIATED...");
        
        // 1. Setup Architecture (But don't start level yet)
        this.graph = new Graph();
        this.audio = new AudioManager();
        this.ui = new UIManager(this.graph);
        this.binManager = new BinManager(this.graph); 
        this.levelManager = new LevelManager(this.graph, this.ui, this.audio);
        
        this.ui.initInputListeners();

        // 2. Bind Start Button
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        // 3. Bind Mute Button
        const muteBtn = document.getElementById('btn-audio');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.audio.toggleMute());
        }

        // 4. Debug Tools (ENABLED FOR DEV)
        new DevTools(this.levelManager);
    },

    startGame: async function() {
        // 1. Unlock Audio (User Gesture)
        this.audio.init();

        // 2. Hide Landing / Show Game
        const landing = document.getElementById('landing-page');
        const game = document.getElementById('game-container');
        
        if (landing) landing.classList.add('hidden');
        if (game) game.classList.remove('hidden');

        // 3. Load Save File
        const savedLevel = this.levelManager.getSavedLevel();
        console.log(`Resuming at Level ${savedLevel}`);
        await this.levelManager.loadLevel(savedLevel);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
/**
 * level-manager.js
 * COMPLETE VERSION: Includes SHA-256 Security + Developer Backdoor
 */
import { MissionTimer } from '../utils/timers.js';
import { InterferenceEngine } from './interference.js';
import { CaseLog } from './case-log.js'; 

export class LevelManager {
    constructor(graph, ui, audio) {
        this.graph = graph;
        this.ui = ui;
        this.audio = audio;
        this.currentLevelId = 1;
        this.currentLevelData = null;

        // UI References
        this.titleEl = document.getElementById('level-title');
        this.clueListEl = document.getElementById('clue-list');
        this.submitBtn = document.getElementById('btn-submit');
        this.resetBtn = document.getElementById('btn-reset');

        this.submitBtn.addEventListener('click', () => this.validateSolution());
        this.resetBtn.addEventListener('click', () => this.resetLevel());

        // Initialize Systems
        this.timer = new MissionTimer(document.getElementById('timer'), () => this.handleTimeOut());
        this.interference = new InterferenceEngine(this.graph);
        this.caseLog = new CaseLog();

        // Expose this instance to the window for console cheating
        window.Game = window.Game || {};
        window.Game.levelManager = this;
    }

    getSavedLevel() {
        const saved = localStorage.getItem('dublin_contract_save');
        return saved ? parseInt(saved, 10) : 1;
    }

    saveProgress(levelId) {
        localStorage.setItem('dublin_contract_save', levelId.toString());
    }

    async loadLevel(levelId) {
        this.currentLevelId = levelId;
        console.log(`Loading Level ${levelId}...`);
        this.titleEl.innerText = `LOADING CONTRACT #${levelId}...`;

        try {
            const response = await fetch(`./data/levels/level${levelId}.json`);
            if (!response.ok) {
                if (levelId > 1) {
                    this.showFeedback("ALL CONTRACTS FULFILLED.", "success");
                    return;
                }
                throw new Error("Failed to load level");
            }
            const data = await response.json();
            this.currentLevelData = data;
            this.setupLevel(data);
        } catch (error) {
            console.error(error);
            this.titleEl.innerText = "ERROR: CONNECTION LOST";
        }
    }

    setupLevel(data) {
        // 1. Reset State
        this.graph.clear();
        this.clueListEl.innerHTML = ''; 
        this.titleEl.innerText = data.meta.title.toUpperCase();

        // --- FIX: WIPE VISUAL ARTIFACTS ---
        // Force-clear the board and the sidebar so no "Ghost Nodes" remain
        document.getElementById('nodes-layer').innerHTML = '';
        document.getElementById('binned-layer').innerHTML = '';
        document.getElementById('connections-layer').innerHTML = ''; 
        // ----------------------------------

        // 3. Spawn Nodes
        data.nodes.forEach(node => {
            const posX = node.position ? node.position.x : 100 + Math.random() * 400;
            const posY = node.position ? node.position.y : 100 + Math.random() * 400;

            this.graph.addNode({
                id: node.id,
                text: node.text,
                type: node.type,
                position: { x: posX, y: posY }
            });

            if (node.morph) {
                this.interference.registerMorph(
                    node.id, 
                    node.morph.text, 
                    node.morph.minTime, 
                    node.morph.maxTime
                );
            }
        });

        // 4. Clues
        const descItem = document.createElement('li');
        descItem.innerText = `[MISSION]: ${data.meta.description}`;
        descItem.style.color = 'var(--accent)';
        this.clueListEl.appendChild(descItem);
        
        // 5. Start Engines
        this.ui.render();
        this.timer.start(data.meta.timerSeconds || null);
        this.interference.setLevelIntensity(data.meta.glitchIntensity || 0);
        
        // 6. Audio
        if (data.meta.id >= 26) {
            this.audio.playTrack('theme_action');
        } else if (data.meta.id >= 11) {
            this.audio.playTrack('theme_tense');
        } else {
            this.audio.playTrack('theme_calm');
        }
    }

    // --- SECURITY HELPERS ---

    serializeEdges(edges) {
        const simplified = edges.map(e => ({
            s: e.source,
            t: e.target,
            y: e.type 
        }));

        simplified.sort((a, b) => {
            if (a.s !== b.s) return a.s.localeCompare(b.s);
            if (a.t !== b.t) return a.t.localeCompare(b.t);
            return a.y.localeCompare(b.y);
        });

        return JSON.stringify(simplified);
    }

    async hashString(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- DEVELOPER BACKDOOR ---
    // To use: Open Console (F12) -> Type: Game.levelManager.dev_revealSolution()
    async dev_revealSolution() {
        try {
            // 1. Try to load the secret admin file
            const resp = await fetch('./data/admin-solutions.json');
            if (!resp.ok) {
                console.warn("Cheat file not found. You are likely in Production mode.");
                return;
            }
            const allSolutions = await resp.json();
            
            // 2. Get answers for current level
            const edges = allSolutions[this.currentLevelId];
            if (!edges) {
                console.warn("No solution stored for this level.");
                return;
            }

            // 3. DRAW THEM
            console.log("DEV: Drawing solution...");
            this.graph.edges = []; // Clear current board
            edges.forEach(e => {
                this.graph.addEdge(e.source, e.target, e.type);
            });
            
            // 4. Force Update
            this.ui.render();
            this.showFeedback("DEV: SOLUTION REVEALED", "success");

        } catch (e) {
            console.error(e);
        }
    }

    // --- VALIDATION LOGIC ---

    async validateSolution() {
        const playerEdges = this.graph.edges;
        const requiredBins = this.currentLevelData.solution.mustBin || [];
        const playerBins = this.graph.binnedNodes;

        // 1. Check Bins
        for (const badNodeId of requiredBins) {
            if (!playerBins.has(badNodeId)) {
                // OLD: this.showFeedback("FAILURE: CONTRADICTORY EVIDENCE REMAINS.", "fail");
                // NEW: Generic Error
                this.showFeedback("ANALYSIS FAILED: INSUFFICIENT DATA.", "fail");
                return;
            }
        }
        
        // 2. Check Edges via HASH
        const targetHash = this.currentLevelData.solution.hash; 

        if (!targetHash) {
            console.error("Level Data missing solution hash! Check your JSON.");
            this.showFeedback("SYSTEM ERROR: MISSING HASH", "fail");
            return;
        }

        const playerString = this.serializeEdges(playerEdges);
        const playerHash = await this.hashString(playerString);

        if (playerHash === targetHash) {
            // ... (Success logic remains the same) ...
            this.showFeedback("CONTRACT FULFILLED. UPLOADING...", "success");
            
            const journalText = this.currentLevelData.meta.journal || "Case resolved.";
            this.caseLog.saveEntry(this.currentLevelId, this.currentLevelData.meta.title, journalText);
            
            const nextId = this.currentLevelId + 1;
            this.saveProgress(nextId);
            if (nextId > 30) {
                this.saveProgress(nextId); 
                setTimeout(() => {
                    document.getElementById('modal-overlay').classList.add('hidden');
                    this.triggerVictorySequence(); 
                }, 2000);
                return;
            }

            setTimeout(() => {
                document.getElementById('modal-overlay').classList.add('hidden');
                this.loadLevel(nextId);
            }, 2000);
        } else {
            // OLD: this.showFeedback("ANALYSIS FAILED: LOGIC ERROR DETECTED.", "fail");
            // NEW: Generic Error (Same message as above so they don't know WHY it failed)
            this.showFeedback("ANALYSIS FAILED: INSUFFICIENT DATA.", "fail");
        }
    }

    resetLevel() {
        if (this.currentLevelData) this.setupLevel(this.currentLevelData);
    }

    handleTimeOut() {
        // Pass a callback to reset the level when they acknowledge the failure
        this.showFeedback("CONNECTION SEVERED. TIMEOUT.", "fail", () => {
            this.resetLevel();
        });
    }

    // Updated to accept an 'onClose' callback
    showFeedback(message, type, onClose = null) {
        const modal = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const btn = document.getElementById('modal-btn');

        modal.classList.remove('hidden');
        title.innerText = type === 'success' ? 'SUCCESS' : 'FAILURE';
        title.style.color = type === 'success' ? 'var(--accent)' : 'var(--danger)';
        body.innerText = message;

        // Reset the button (clone it to remove old event listeners)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.onclick = () => {
            modal.classList.add('hidden');
            if (onClose) onClose(); // Run the reset logic if provided
        };
    }
    triggerVictorySequence() {
        console.log("GAME COMPLETE");
        
        // 1. Stop the Music & play something final (or silence)
        // You can add a specific 'theme_victory' track later if you want
        
        // 2. Clear the Game Board
        this.graph.clear();
        document.getElementById('hud').style.display = 'none';
        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('clue-panel').style.display = 'none';
        
        // 3. Hijack the Landing Page for the Outro
        const landing = document.getElementById('landing-page');
        const content = landing.querySelector('.landing-content');
        
        // Update Content
        content.innerHTML = `
            <div class="logo-area">
                <h1 style="color: var(--accent);">CONTRACT FULFILLED</h1>
                <p class="subtitle">ALL TARGETS PROCESSED</p>
            </div>
            
            <div class="mission-brief" style="border-left-color: var(--accent);">
                <p><strong>FINAL STATUS:</strong> MISSION SUCCESS</p>
                <p><strong>PAYMENT:</strong> TRANSFERRED [$$$ REDACTED]</p>
                <p class="flavor-text" style="margin-top: 2rem;">
                    "The city is quiet. The data has been scrubbed. 
                    You were never here. The Dublin Contract is closed."
                </p>
            </div>

            <button id="btn-wipe-system">WIPE SYSTEM & REBOOT</button>
        `;
        
        // 4. Show it
        landing.classList.remove('hidden');
        
        // 5. Bind Reset Button
        document.getElementById('btn-wipe-system').onclick = () => {
            localStorage.removeItem('dublin_contract_save');
            localStorage.removeItem('dublin_contract_journal');
            location.reload();
        };
    }
}
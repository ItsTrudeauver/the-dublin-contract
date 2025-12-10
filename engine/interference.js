/**
 * interference.js
 * Handles visual glitches and NODE MORPHING (Gaslighting).
 */
export class InterferenceEngine {
    constructor(graph) {
        this.graph = graph;
        this.activeMorphs = new Map(); 
        this.triggeredMorphs = new Set(); 
        this.completedMorphs = new Set(); 
        
        // Listen to the graph to detect connections
        this.graph.subscribe(this.checkForTriggers.bind(this));
    }

    setLevelIntensity(val) {
        // Reset everything when a new level loads
        this.activeMorphs.clear();
        this.triggeredMorphs.clear();
        this.completedMorphs.clear();
    }

    // Called by LevelManager. This MUST exist or the game freezes on load.
    registerMorph(nodeId, newText, minTime, maxTime) {
        this.activeMorphs.set(nodeId, { 
            newText, 
            minTime: minTime || 60000, 
            maxTime: maxTime || 120000  
        });
    }

    checkForTriggers(graph) {
        // Check every node that is supposed to morph
        this.activeMorphs.forEach((config, nodeId) => {
            if (this.triggeredMorphs.has(nodeId)) return; // Already running

            // Check if this node has any edges connected to it
            const isConnected = graph.edges.some(e => e.source === nodeId || e.target === nodeId);

            if (isConnected) {
                this.triggerTimer(nodeId, config);
            }
        });
    }

    triggerTimer(nodeId, config) {
        console.log(`Morph timer started for ${nodeId}`);
        this.triggeredMorphs.add(nodeId);

        // Calculate Random Delay
        const delay = Math.floor(Math.random() * (config.maxTime - config.minTime + 1)) + config.minTime;
        
        setTimeout(() => {
            this.executeMorph(nodeId, config.newText);
        }, delay);
    }

    executeMorph(nodeId, newText) {
        const node = this.graph.nodes.get(nodeId);
        if (!node) return;

        // 1. Update Data (The new text is the REAL info)
        node.text = newText;
        this.completedMorphs.add(nodeId);
        
        // 2. Force UI Update (Silent switch)
        this.graph.notify(); 
        console.log(`MORPH EXECUTED: ${nodeId} text updated.`);
    }
}
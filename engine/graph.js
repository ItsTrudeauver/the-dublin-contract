/**
 * graph.js
 * FIXED: Prevents duplicate Simultaneity lines (stacking bug).
 */
export class Graph {
    constructor() {
        this.nodes = new Map();       
        this.binnedNodes = new Map(); 
        this.edges = [];
        this.subscribers = [];
    }

    clear() {
        this.nodes.clear();
        this.binnedNodes.clear();
        this.edges = [];
        this.notify();
    }

    addNode(nodeData) {
        this.nodes.set(nodeData.id, { ...nodeData });
    }

    // --- NEW HELPER: Checks direction-agnostic existence ---
    hasAnyConnection(idA, idB) {
        return this.edges.some(e => 
            (e.source === idA && e.target === idB) || 
            (e.source === idB && e.target === idA)
        );
    }
    // -------------------------------------------------------

    addEdge(sourceId, targetId, type) {
        const existing = this.getEdge(sourceId, targetId);

        // 1. If exact match exists, do nothing
        if (existing && existing.type === type) return;

        // 2. If different type exists (in this specific direction), overwrite it
        if (existing) {
            this.removeEdge(sourceId, targetId);
        }

        // 3. Add the requested edge
        this.edges.push({ source: sourceId, target: targetId, type });

        // 4. AUTO-LINK LOGIC
        if (type === 'simultaneity') {
            this.propagateSimultaneity(sourceId, targetId);
        }

        this.notify();
    }

    removeEdge(sourceId, targetId) {
        this.edges = this.edges.filter(e => !(e.source === sourceId && e.target === targetId));
        this.notify();
    }

    getEdge(sourceId, targetId) {
        return this.edges.find(e => e.source === sourceId && e.target === targetId);
    }

    // --- RECURSIVE PROPAGATION (FIXED) ---
    propagateSimultaneity(nodeA, nodeB) {
        // Find neighbors of A (excluding B)
        const neighborsA = this.edges
            .filter(e => e.type === 'simultaneity' && (e.source === nodeA || e.target === nodeA))
            .map(e => (e.source === nodeA ? e.target : e.source))
            .filter(id => id !== nodeB);

        // Find neighbors of B (excluding A)
        const neighborsB = this.edges
            .filter(e => e.type === 'simultaneity' && (e.source === nodeB || e.target === nodeB))
            .map(e => (e.source === nodeB ? e.target : e.source))
            .filter(id => id !== nodeA);

        // Link B to A's neighbors
        neighborsA.forEach(neighbor => {
            // FIX: Check BOTH directions before adding
            if (!this.hasAnyConnection(nodeB, neighbor)) {
                this.edges.push({ source: nodeB, target: neighbor, type: 'simultaneity' });
                this.propagateSimultaneity(nodeB, neighbor);
            }
        });

        // Link A to B's neighbors
        neighborsB.forEach(neighbor => {
            // FIX: Check BOTH directions before adding
            if (!this.hasAnyConnection(nodeA, neighbor)) {
                this.edges.push({ source: nodeA, target: neighbor, type: 'simultaneity' });
                this.propagateSimultaneity(nodeA, neighbor);
            }
        });
    }

    // --- BINNING ACTIONS ---

    binNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        this.binnedNodes.set(nodeId, node);
        this.nodes.delete(nodeId);

        this.notify(); 
    }

    restoreNode(nodeId) {
        const node = this.binnedNodes.get(nodeId);
        if (!node) return;

        this.nodes.set(nodeId, node);
        this.binnedNodes.delete(nodeId);

        this.notify();
    }
    
    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this));
    }
}
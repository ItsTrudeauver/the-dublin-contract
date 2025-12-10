/**
 * graph.js
 */
export class Graph {
    constructor() {
        this.nodes = new Map();       // Active Board Nodes
        this.binnedNodes = new Map(); // New: Archived Nodes
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

    addEdge(sourceId, targetId, type) {
        this.removeEdge(sourceId, targetId);
        this.edges.push({ source: sourceId, target: targetId, type });
        this.notify();
    }

    removeEdge(sourceId, targetId) {
        this.edges = this.edges.filter(e => !(e.source === sourceId && e.target === targetId));
        this.notify();
    }

    getEdge(sourceId, targetId) {
        return this.edges.find(e => e.source === sourceId && e.target === targetId);
    }

    // --- BINNING ACTIONS ---

    binNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // 1. Remove associated edges
        this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

        // 2. Move data from Active -> Binned
        this.binnedNodes.set(nodeId, node);
        this.nodes.delete(nodeId);

        this.notify(); 
    }

    restoreNode(nodeId) {
        const node = this.binnedNodes.get(nodeId);
        if (!node) return;

        // 1. Move data from Binned -> Active
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
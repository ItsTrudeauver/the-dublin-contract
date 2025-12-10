/**
 * bin-manager.js
 * FIXED: Re-parents nodes to the sidebar so they don't move with the camera.
 */
export class BinManager {
    constructor(graph) {
        this.graph = graph;
        // Loop purely to handle the Sidebar visuals
        setInterval(() => this.updateLoop(), 500);
    }

    updateLoop() {
        this.handleRestorationClicks();
        this.stackArchivedNodes();
    }

    handleRestorationClicks() {
        const archivedNodes = document.querySelectorAll('.node.archived');
        
        archivedNodes.forEach(nodeEl => {
            if (nodeEl.querySelector('.restore-overlay')) return;

            // 1. CREATE A PROTECTIVE OVERLAY
            const overlay = document.createElement('div');
            overlay.className = 'restore-overlay';
            
            overlay.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                z-index: 100;
                cursor: pointer;
                background: transparent;
            `;

            // 2. ATTACH LISTENER
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();

                const id = nodeEl.id;

                // 3. DESTROY THE GHOST NODE
                nodeEl.remove();

                // 4. RESTORE LOGIC
                this.graph.restoreNode(id);
            });

            nodeEl.appendChild(overlay);
        });
    }

    stackArchivedNodes() {
        // Force archived nodes to stack neatly on the left
        const archived = document.querySelectorAll('.node.archived');
        const binnedLayer = document.getElementById('binned-layer'); // The static container
        
        let index = 0;
        
        archived.forEach(el => {
            // --- NEW: RE-PARENTING LOGIC ---
            // If the node is still floating in the game world, grab it and
            // put it into the static sidebar layer.
            if (el.parentElement !== binnedLayer && binnedLayer) {
                binnedLayer.appendChild(el);
            }
            // -------------------------------

            // Position calculation
            el.style.top = `${110 + (index * 60)}px`;
            // Force left alignment relative to screen/sidebar
            el.style.left = '10px'; 
            index++;
        });
    }
}
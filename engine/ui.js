/**
 * ui.js
 * Manages the DOM, Mouse Inputs, and SVG Rendering.
 */

export class UIManager {
    constructor(graph) {
        this.graph = graph;
        
        // DOM References
        this.gameContainer = document.getElementById('game-container');
        this.worldLayer = document.getElementById('world-layer'); // <--- NEW REF
        this.nodesLayer = document.getElementById('nodes-layer');
        this.connectionsLayer = document.getElementById('connections-layer');
        this.edgeControls = document.getElementById('edge-controls');
        
        // Fix pointer events for SVG
        if (this.connectionsLayer) this.connectionsLayer.style.pointerEvents = "none";
        
        // Viewport State
        this.pan = { x: 0, y: 0 };
        this.zoom = 1;
        this.isPanning = false;
        this.lastMouse = { x: 0, y: 0 };

        // Selection / Drag State
        this.selectedNodeId = null;
        this.selectedEdge = null;
        this.dragState = {
            active: false,
            nodeId: null,
            startX: 0,
            startY: 0,
            initialLeft: 0,
            initialTop: 0
        };

        // Bind Context
        this.render = this.render.bind(this);
        this.handleNodeClick = this.handleNodeClick.bind(this);
        this.handleBackgroundClick = this.handleBackgroundClick.bind(this);
        
        this.graph.subscribe(this.render);
    }

    initInputListeners() {
        // 1. GLOBAL KEYBOARD INPUTS
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.selectedEdge) {
                e.preventDefault();
                this.cycleArrowType(this.selectedEdge);
            }
            if (e.code === 'Escape') {
                this.deselectAll();
            }
        });

        // 2. MOUSE WHEEL (ZOOM)
        this.gameContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newZoom = Math.min(Math.max(0.2, this.zoom + delta), 3); // Limit 0.2x to 3x

            // Zoom towards mouse pointer logic
            const rect = this.worldLayer.getBoundingClientRect();
            // Calculate mouse position relative to world
            const mouseX = (e.clientX - this.pan.x) / this.zoom;
            const mouseY = (e.clientY - this.pan.y) / this.zoom;

            // Apply new zoom
            this.zoom = newZoom;

            // Adjust pan so mouse point stays stable
            this.pan.x = e.clientX - mouseX * this.zoom;
            this.pan.y = e.clientY - mouseY * this.zoom;

            this.updateTransform();
        }, { passive: false });

        // 3. MOUSE DOWN (PANNING OR DRAGGING)
        this.gameContainer.addEventListener('mousedown', (e) => {
            // Ignore clicks on UI elements (HUD, Sidebar, etc)
            if (e.target.closest('#hud, #sidebar, #bin-zone, #clue-panel')) return;

            // Check if clicking a node (Node Drag)
            if (e.target.closest('.node')) {
                // Handled by node event listener below
                return; 
            }
            
            // Check if clicking Edge Controls
            if (e.target.closest('#edge-controls')) return;

            // Otherwise -> Start Panning
            this.isPanning = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.gameContainer.style.cursor = 'grabbing';
        });

        // 4. MOUSE MOVE (GLOBAL HANDLER)
        document.addEventListener('mousemove', (e) => {
            // A. Handle Viewport Panning
            if (this.isPanning) {
                const dx = e.clientX - this.lastMouse.x;
                const dy = e.clientY - this.lastMouse.y;
                
                this.pan.x += dx;
                this.pan.y += dy;
                this.lastMouse = { x: e.clientX, y: e.clientY };
                
                this.updateTransform();
                return;
            }

            // B. Handle Node Dragging
            if (this.dragState.active) {
                // IMPORTANT: Scale the mouse movement delta by the inverse of zoom
                // If zoomed in (2x), moving mouse 10px should only move node 5px relative to screen
                const dx = (e.clientX - this.dragState.startX) / this.zoom;
                const dy = (e.clientY - this.dragState.startY) / this.zoom;
                
                const nodeEl = document.getElementById(this.dragState.nodeId);
                if (nodeEl) {
                    const newX = this.dragState.initialLeft + dx;
                    const newY = this.dragState.initialTop + dy;
                    nodeEl.style.left = `${newX}px`;
                    nodeEl.style.top = `${newY}px`;
                    
                    // Update Data Model
                    const nodeData = this.graph.nodes.get(this.dragState.nodeId);
                    if (nodeData) {
                        nodeData.position = { x: newX, y: newY };
                        this.renderArrows(); 
                        this.updateEdgeControlsPosition(); 
                    }
                }
            }
        });

        // 5. MOUSE UP
        document.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.gameContainer.style.cursor = 'grab';
            
            if (this.dragState.active) {
                this.dragState.active = false;
                this.dragState.nodeId = null;
            }
        });

        // 6. CLICK (Background Deselect)
        this.gameContainer.addEventListener('click', (e) => this.handleBackgroundClick(e));
    }

    updateTransform() {
        this.worldLayer.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    }

    deselectAll() {
        this.selectedNodeId = null;
        this.selectedEdge = null;
        this.renderNodes();
        this.renderEdgeControls(); 
        this.renderArrows(); 
    }

    handleBackgroundClick(e) {
        // If we moved significantly (panned), don't treat it as a click
        if (this.isPanning) return;
        
        const isControlClick = e.target.closest('#edge-controls');
        const isNodeClick = e.target.closest('.node');
        
        if (!isControlClick && !isNodeClick) {
            this.deselectAll();
        }
    }

    handleNodeClick(id) {
        if (this.selectedNodeId === id) {
            this.selectedNodeId = null;
            this.renderNodes();
            return;
        }

        if (!this.selectedNodeId) {
            this.selectedNodeId = id;
            this.renderNodes();
            return;
        }

        const source = this.selectedNodeId;
        const target = id;

        // Create link if new
        if (!this.graph.getEdge(source, target)) {
            this.graph.addEdge(source, target, 'sequence');
        }

        this.selectedNodeId = null;
        this.selectedEdge = { source, target };
        
        this.render(); 
    }

    handleEdgeClick(e, sourceId, targetId) {
        e.stopPropagation(); 
        this.selectedNodeId = null; 
        this.selectedEdge = { source: sourceId, target: targetId };
        this.render(); 
    }

    cycleArrowType(edgeRef) {
        const edge = this.graph.getEdge(edgeRef.source, edgeRef.target);
        if (!edge) return;

        const types = ['sequence', 'consequence', 'simultaneity'];
        const currentIndex = types.indexOf(edge.type);
        const nextType = types[(currentIndex + 1) % types.length];

        this.graph.addEdge(edgeRef.source, edgeRef.target, nextType);
    }

    /* --- RENDERING --- */

    render() {
        this.renderNodes();
        setTimeout(() => {
            this.renderArrows();
            this.renderEdgeControls();
        }, 0);
    }

    renderNodes() {
        this.graph.nodes.forEach(node => {
            let el = document.getElementById(node.id);
            
            // 1. Create Node if missing
            if (!el) {
                el = document.createElement('div');
                el.id = node.id;
                el.className = 'node'; 
                
                el.innerHTML = `${node.text}<div class="min-btn" title="Archive"></div>`;
                el.style.left = `${node.position.x}px`;
                el.style.top = `${node.position.y}px`;
                
                this.nodesLayer.appendChild(el);
                
                // A. Drag Start
                el.addEventListener('mousedown', (e) => {
                    if (e.target.classList.contains('min-btn')) return;
                    if (e.button !== 0) return; 
                    e.stopPropagation();

                    this.dragState = {
                        active: true,
                        nodeId: node.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initialLeft: el.offsetLeft,
                        initialTop: el.offsetTop
                    };
                });

                // B. Selection Click
                el.addEventListener('click', (e) => {
                    if (e.target.classList.contains('min-btn')) return;
                    e.stopPropagation(); 
                    if (Math.abs(e.clientX - this.dragState.startX) > 5) return;
                    this.handleNodeClick(node.id);
                });

                // C. BINNING ACTION
                const btn = el.querySelector('.min-btn');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        
                        // --- FIX: DESELECT TO PREVENT GHOST LINKS ---
                        if (this.selectedNodeId === node.id) {
                            this.deselectAll();
                        }
                        // --------------------------------------------

                        this.graph.binNode(node.id); 
                        el.classList.add('archived'); 
                    });
                }
            } 
            // 2. Update Existing Node
            else {
                el.classList.remove('binned', 'archived', 'being-binned'); 
                
                if (!el.innerHTML.includes(node.text)) {
                     el.innerHTML = `${node.text}<div class="min-btn" title="Archive"></div>`;
                     
                     const btn = el.querySelector('.min-btn');
                     if(btn) {
                         btn.addEventListener('click', (e) => {
                            e.stopPropagation();

                            // --- FIX: DESELECT HERE TOO ---
                            if (this.selectedNodeId === node.id) {
                                this.deselectAll();
                            }
                            // ------------------------------

                            this.graph.binNode(node.id);
                            el.classList.add('archived');
                         });
                     }
                }
                
                el.style.left = `${node.position.x}px`;
                el.style.top = `${node.position.y}px`;
            }
            
            if (this.selectedNodeId === node.id) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    // --- REPLACED ARROW RENDERER (Double Lines, Double Heads) ---
// --- REPLACED ARROW RENDERER (Double Heads, No Selection Visuals) ---
    // --- REPLACED ARROW RENDERER (Center-to-Edge) ---
    renderArrows() {
        this.connectionsLayer.innerHTML = '';
        
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
            <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
                <path d="M0,0 L12,6 L0,12" fill="#ff2a2a" />
            </marker>
        `;
        this.connectionsLayer.appendChild(defs);

        this.graph.edges.forEach(edge => {
            const sourceEl = document.getElementById(edge.source);
            const targetEl = document.getElementById(edge.target);
            if (!sourceEl || !targetEl) return;

            const w = 240; 
            const hSource = sourceEl.offsetHeight;
            const hTarget = targetEl.offsetHeight;

            // == COORDINATES ==
            // Centers (We start drawing FROM here to hide the gap)
            const sx = parseFloat(sourceEl.style.left) + w/2;
            const sy = parseFloat(sourceEl.style.top) + hSource/2;
            
            // Target Center (Used for calculating the angle)
            const tx = parseFloat(targetEl.style.left) + w/2;
            const ty = parseFloat(targetEl.style.top) + hTarget/2;

            // Target Edge (We stop drawing HERE so the arrow head is visible)
            const endP = this.getRectIntersection(sx, sy, tx, ty, w, hTarget);

            const isSelected = this.selectedEdge && 
                               this.selectedEdge.source === edge.source && 
                               this.selectedEdge.target === edge.target;

            // --- STYLING ---
            const globalColor = "#ff2a2a";
            const baseWidth = "2"; 

            if (edge.type === 'consequence') {
                // == DOUBLE PARALLEL LINES ==
                // Calculate Vector from Source Center to Target Edge
                const dx = endP.x - sx;
                const dy = endP.y - sy;
                const len = Math.sqrt(dx*dx + dy*dy);
                
                // Normal Vector for offsetting lines
                let nx = 0, ny = 0;
                if (len > 0) { nx = -dy / len; ny = dx / len; }

                const offset = 4; 

                [offset, -offset].forEach(off => {
                    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    // START: sx (Center) + offset
                    // END: endP.x (Edge) + offset
                    p.setAttribute("d", `M ${sx + nx*off} ${sy + ny*off} L ${endP.x + nx*off} ${endP.y + ny*off}`);
                    p.setAttribute("stroke", globalColor);
                    p.setAttribute("stroke-width", baseWidth);
                    p.setAttribute("fill", "none");
                    p.setAttribute("marker-end", "url(#arrowhead)"); 
                    this.connectionsLayer.appendChild(p);
                });

            } else {
                // == SINGLE LINE ==
                let dashArray = "";
                let marker = "url(#arrowhead)";

                if (edge.type === 'simultaneity') {
                    dashArray = "5, 5";
                    marker = ""; 
                }

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                // START: sx, sy (Center) -> HIDDEN UNDER SOURCE NODE
                // END: endP.x, endP.y (Edge) -> VISIBLE AT TARGET
                path.setAttribute("d", `M ${sx} ${sy} L ${endP.x} ${endP.y}`);
                path.setAttribute("stroke", globalColor);
                path.setAttribute("stroke-width", baseWidth);
                path.setAttribute("stroke-dasharray", dashArray);
                path.setAttribute("fill", "none");
                if (marker) path.setAttribute("marker-end", marker);

                this.connectionsLayer.appendChild(path);
            }

            // == HITBOX (Universal) ==
            const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            // Hitbox spans full center-to-edge length
            hitPath.setAttribute("d", `M ${sx} ${sy} L ${endP.x} ${endP.y}`);
            hitPath.setAttribute("stroke", "transparent");
            hitPath.setAttribute("stroke-width", "20");
            hitPath.setAttribute("fill", "none");
            hitPath.style.cursor = "pointer";
            hitPath.style.pointerEvents = "stroke";

            hitPath.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedNodeId = null;
                this.selectedEdge = { source: edge.source, target: edge.target };
                this.render(); 
            });
            this.connectionsLayer.appendChild(hitPath);
        });
    }

    renderEdgeControls() {
        if (!this.selectedEdge) {
            this.edgeControls.classList.add('hidden');
            return;
        }

        const edge = this.graph.getEdge(this.selectedEdge.source, this.selectedEdge.target);
        if (!edge) {
            this.selectedEdge = null;
            this.edgeControls.classList.add('hidden');
            return;
        }

        const sourceEl = document.getElementById(edge.source);
        const targetEl = document.getElementById(edge.target);
        if (!sourceEl || !targetEl) return;

        const w = 240; 
        const sx = parseFloat(sourceEl.style.left) + w/2;
        const sy = parseFloat(sourceEl.style.top) + sourceEl.offsetHeight/2;
        const tx = parseFloat(targetEl.style.left) + w/2;
        const ty = parseFloat(targetEl.style.top) + targetEl.offsetHeight/2;

        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;

        this.edgeControls.style.left = `${midX}px`;
        this.edgeControls.style.top = `${midY}px`;
        this.edgeControls.classList.remove('hidden');

        // Render Buttons
        this.edgeControls.innerHTML = '';

        const types = [
            { id: 'sequence', label: 'SEQ (->)' },
            { id: 'consequence', label: 'CSQ (=>)' },
            { id: 'simultaneity', label: 'SIM (==)' }
        ];

        types.forEach(t => {
            const btn = document.createElement('button');
            btn.innerText = t.label;
            if (edge.type === t.id) btn.classList.add('active');
            btn.onclick = () => {
                this.graph.addEdge(edge.source, edge.target, t.id);
            };
            this.edgeControls.appendChild(btn);
        });

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.innerText = '×';
        delBtn.className = 'btn-delete';
        delBtn.onclick = () => {
            this.graph.removeEdge(edge.source, edge.target);
            this.deselectAll();
        };
        this.edgeControls.appendChild(delBtn);
    }
    
    updateEdgeControlsPosition() {
        if (this.selectedEdge) this.renderEdgeControls();
    }

    getRectIntersection(x1, y1, x2, y2, w, h) {
        const vToSourceX = x1 - x2;
        const vToSourceY = y1 - y2;

        if (vToSourceX === 0 && vToSourceY === 0) return { x: x2, y: y2 };

        const halfW = w / 2;
        const halfH = h / 2;

        const t_v = halfW / Math.abs(vToSourceX);
        const t_h = halfH / Math.abs(vToSourceY);
        const t_final = Math.min(t_v, t_h);

        return {
            x: x2 + vToSourceX * t_final,
            y: y2 + vToSourceY * t_final
        };
    }
}
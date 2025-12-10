// engine/arrows.js - Arrow type cycling and rendering logic

import { ArrowType } from './graph.js';

export class ArrowManager {
    constructor() {
        this.arrowTypes = [
            ArrowType.SEQUENCE,
            ArrowType.CONSEQUENCE,
            ArrowType.SIMULTANEITY
        ];
        this.currentTypeIndex = 0;
    }

    getCurrentType() {
        return this.arrowTypes[this.currentTypeIndex];
    }

    cycleType() {
        this.currentTypeIndex = (this.currentTypeIndex + 1) % this.arrowTypes.length;
        return this.getCurrentType();
    }

    reset() {
        this.currentTypeIndex = 0;
    }

    getTypeInfo(type) {
        const info = {
            [ArrowType.SEQUENCE]: {
                symbol: '→',
                label: 'Sequence',
                description: 'A happens before B',
                color: '#4a9eff'
            },
            [ArrowType.CONSEQUENCE]: {
                symbol: '⇒',
                label: 'Consequence',
                description: 'A causes B',
                color: '#00d68f'
            },
            [ArrowType.SIMULTANEITY]: {
                symbol: '↔',
                label: 'Simultaneity',
                description: 'A and B happen at the same time',
                color: '#ffa502'
            }
        };
        return info[type];
    }
}

export class ArrowRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        this.arrows = new Map(); // arrowKey -> SVG group element
    }

    /**
     * Render all arrows from graph
     */
    renderArrows(graph) {
        // Clear existing arrows
        this.clear();

        // Render each arrow
        graph.arrows.forEach(arrow => {
            const fromNode = graph.getNode(arrow.fromId);
            const toNode = graph.getNode(arrow.toId);

            if (fromNode && !fromNode.binned && toNode && !toNode.binned) {
                this.drawArrow(fromNode, toNode, arrow.type);
            }
        });
    }

    /**
     * Draw a single arrow between two nodes
     */
    drawArrow(fromNode, toNode, type) {
        const key = this.getArrowKey(fromNode.id, toNode.id, type);

        // Calculate positions (center of nodes)
        const x1 = fromNode.x + 140; // node width/2
        const y1 = fromNode.y + 60;  // node height/2
        const x2 = toNode.x + 140;
        const y2 = toNode.y + 60;

        // Create arrow group
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `arrow arrow-${type}`);

        if (type === ArrowType.SIMULTANEITY) {
            // Bidirectional arrow
            this.drawSimultaneityArrow(group, x1, y1, x2, y2);
        } else {
            // Directional arrow
            this.drawDirectionalArrow(group, x1, y1, x2, y2, type);
        }

        this.svg.appendChild(group);
        this.arrows.set(key, group);
    }

    drawDirectionalArrow(group, x1, y1, x2, y2, type) {
        // Calculate arrow angle and shorten line to not overlap nodes
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const nodeRadius = 60; // approximate
        const arrowHeadSize = 10;

        const startX = x1 + Math.cos(angle) * nodeRadius;
        const startY = y1 + Math.sin(angle) * nodeRadius;
        const endX = x2 - Math.cos(angle) * (nodeRadius + arrowHeadSize);
        const endY = y2 - Math.sin(angle) * (nodeRadius + arrowHeadSize);

        // Draw line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('class', `arrow-line ${type}`);
        group.appendChild(line);

        // Draw arrowhead
        this.drawArrowhead(group, endX, endY, angle, type);
    }

    drawArrowhead(group, x, y, angle, type) {
        const size = 10;
        const points = [
            [x, y],
            [x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6)],
            [x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6)]
        ];

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.map(p => p.join(',')).join(' '));
        polygon.setAttribute('class', `arrow-head ${type}`);
        group.appendChild(polygon);
    }

    drawSimultaneityArrow(group, x1, y1, x2, y2) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const nodeRadius = 60;
        const arrowHeadSize = 8;

        const startX = x1 + Math.cos(angle) * nodeRadius;
        const startY = y1 + Math.sin(angle) * nodeRadius;
        const endX = x2 - Math.cos(angle) * nodeRadius;
        const endY = y2 - Math.sin(angle) * nodeRadius;

        // Draw line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('class', 'arrow-line simultaneity');
        group.appendChild(line);

        // Draw arrowheads on both ends
        this.drawArrowhead(group, startX, startY, angle + Math.PI, ArrowType.SIMULTANEITY);
        this.drawArrowhead(group, endX, endY, angle, ArrowType.SIMULTANEITY);
    }

    clear() {
        this.arrows.forEach(arrow => arrow.remove());
        this.arrows.clear();
    }

    getArrowKey(fromId, toId, type) {
        if (type === ArrowType.SIMULTANEITY) {
            // Normalize for simultaneity (order doesn't matter)
            return `${Math.min(fromId, toId)}-${Math.max(fromId, toId)}-${type}`;
        }
        return `${fromId}-${toId}-${type}`;
    }
}

/**
 * Arrow highlighting during creation
 */
export class ArrowPreview {
    constructor(svgElement) {
        this.svg = svgElement;
        this.previewLine = null;
    }

    show(fromNode, mouseX, mouseY, type) {
        this.clear();

        const x1 = fromNode.x + 140;
        const y1 = fromNode.y + 60;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', mouseX);
        line.setAttribute('y2', mouseY);
        line.setAttribute('class', `arrow-line ${type}`);
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.5');

        this.svg.appendChild(line);
        this.previewLine = line;
    }

    clear() {
        if (this.previewLine) {
            this.previewLine.remove();
            this.previewLine = null;
        }
    }
}
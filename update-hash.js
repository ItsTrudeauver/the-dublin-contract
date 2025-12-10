const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- PATHS ---
const levelsDir = path.join(__dirname, '/data/levels');
const solutionsPath = path.join(__dirname, '/data/admin-solutions.json');

// --- 1. LOAD GOD KEYS ---
let masterSolutions = {};
try {
    masterSolutions = JSON.parse(fs.readFileSync(solutionsPath, 'utf8'));
    console.log("Loaded Master Solutions.");
} catch (e) {
    console.error("CRITICAL: Could not load admin-solutions.json");
    process.exit(1);
}

// --- 2. LOGIC: SIMULTANEITY EXPANSION ---
// This matches the new logic you added to graph.js
function expandEdges(edges) {
    // Clone to avoid mutating original
    let currentEdges = JSON.parse(JSON.stringify(edges));
    let changed = true;

    while (changed) {
        changed = false;
        const sims = currentEdges.filter(e => e.type === 'simultaneity');
        
        for (let i = 0; i < sims.length; i++) {
            const e1 = sims[i];
            const nodes = [e1.source, e1.target];

            // Check against all other sim edges
            for (let j = 0; j < sims.length; j++) {
                if (i === j) continue;
                const e2 = sims[j];

                // Find a common node (A-B and B-C)
                let common = null;
                let target = null;

                if (nodes.includes(e2.source)) { common = e2.source; target = e2.target; }
                else if (nodes.includes(e2.target)) { common = e2.target; target = e2.source; }

                if (common && target) {
                    // Identify the other node from e1
                    const start = (e1.source === common) ? e1.target : e1.source;
                    
                    // We have Start-Common and Common-Target.
                    // Do we have Start-Target?
                    const exists = currentEdges.find(e => 
                        e.type === 'simultaneity' && 
                        ((e.source === start && e.target === target) || 
                         (e.source === target && e.target === start))
                    );

                    if (!exists && start !== target) {
                        currentEdges.push({ source: start, target: target, type: 'simultaneity' });
                        changed = true; // We added a line, restart loop to propagate
                    }
                }
            }
        }
    }
    return currentEdges;
}

// --- 3. STANDARD HASHING UTILS ---
function serializeEdges(edges) {
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

function hashString(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
}

// --- 4. MAIN PROCESSOR ---
fs.readdir(levelsDir, (err, files) => {
    if (err) return console.error("Could not read levels directory.", err);

    let updatedCount = 0;

    files.forEach(file => {
        if (!file.endsWith('.json')) return;

        const levelId = parseInt(file.replace('level', '').replace('.json', ''));
        const filePath = path.join(levelsDir, file);
        
        // 1. Get Clean Edges from Admin File
        const sourceEdges = masterSolutions[levelId.toString()];
        
        if (!sourceEdges) {
            console.log(`Skipping Level ${levelId} (No solution in admin file)`);
            return;
        }

        try {
            // 2. Expand them (Auto-Link Logic)
            const expandedEdges = expandEdges(sourceEdges);
            
            // 3. Calculate New Hash
            const edgeString = serializeEdges(expandedEdges);
            const newHash = hashString(edgeString);

            // 4. Inject into Level File
            const levelContent = fs.readFileSync(filePath, 'utf8');
            const levelData = JSON.parse(levelContent);

            if (levelData.solution.hash !== newHash) {
                console.log(`Updating Level ${levelId}...`);
                levelData.solution.hash = newHash;
                // Ensure 'edges' are removed if they snuck back in
                if (levelData.solution.edges) delete levelData.solution.edges; 
                
                fs.writeFileSync(filePath, JSON.stringify(levelData, null, 2));
                updatedCount++;
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    });

    console.log(`\nOperation Complete. Updated ${updatedCount} levels.`);
    console.log("Run 'git diff' to see the changes.");
});
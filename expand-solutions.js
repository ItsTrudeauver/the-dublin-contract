const fs = require('fs');
const path = require('path');

const solutionsPath = path.join(__dirname, '/data/admin-solutions.json');

// --- LOAD ---
let solutions = {};
try {
    solutions = JSON.parse(fs.readFileSync(solutionsPath, 'utf8'));
    console.log("Loaded admin-solutions.json");
} catch (e) {
    console.error("Error loading file:", e);
    process.exit(1);
}

// --- LOGIC ---
function expandSimultaneity(edges) {
    // Clone array
    let currentEdges = JSON.parse(JSON.stringify(edges));
    let changed = true;

    while (changed) {
        changed = false;
        const sims = currentEdges.filter(e => e.type === 'simultaneity');
        
        for (let i = 0; i < sims.length; i++) {
            const e1 = sims[i];
            
            for (let j = 0; j < sims.length; j++) {
                if (i === j) continue;
                const e2 = sims[j];

                // Check for shared node (A-B + B-C)
                let common = null, target = null, start = null;

                if (e1.source === e2.source) { common = e1.source; start = e1.target; target = e2.target; }
                else if (e1.source === e2.target) { common = e1.source; start = e1.target; target = e2.source; }
                else if (e1.target === e2.source) { common = e1.target; start = e1.source; target = e2.target; }
                else if (e1.target === e2.target) { common = e1.target; start = e1.source; target = e2.source; }

                if (common && start !== target) {
                    // Check if connection exists
                    const exists = currentEdges.find(e => 
                        e.type === 'simultaneity' && 
                        ((e.source === start && e.target === target) || 
                         (e.source === target && e.target === start))
                    );

                    if (!exists) {
                        // Add implied line
                        currentEdges.push({ source: start, target: target, type: 'simultaneity' });
                        changed = true;
                    }
                }
            }
        }
    }
    return currentEdges;
}

// --- PROCESS ---
let updatedCount = 0;

for (const levelId in solutions) {
    const original = solutions[levelId];
    const expanded = expandSimultaneity(original);

    if (expanded.length > original.length) {
        console.log(`Level ${levelId}: Expanded edges from ${original.length} to ${expanded.length}`);
        solutions[levelId] = expanded;
        updatedCount++;
    }
}

// --- SAVE ---
fs.writeFileSync(solutionsPath, JSON.stringify(solutions, null, 2));
console.log(`\nSuccess! Updated ${updatedCount} levels in admin-solutions.json`);
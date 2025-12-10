/**
 * dev-tools.js
 * A floating cheat menu for playtesting.
 * TO DISABLE: Comment out the import in main.js
 */
export class DevTools {
    constructor(levelManager) {
        this.levelManager = levelManager;
        this.createUI();
    }

    createUI() {
        // Container
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed; bottom: 10px; right: 10px;
            background: #111; border: 1px solid #444;
            padding: 10px; z-index: 10000;
            font-family: monospace; color: #0f0;
            display: flex; gap: 10px; align-items: center;
            box-shadow: 0 0 10px rgba(0,0,0,0.8);
        `;

        // Label
        const label = document.createElement('span');
        label.innerText = "DEV_JUMP:";
        container.appendChild(label);

        // Dropdown
        const select = document.createElement('select');
        select.style.cssText = `
            background: #000; color: #fff; border: 1px solid #666;
            padding: 2px 5px; font-family: monospace;
        `;

        // Populate Levels 1-30
        for (let i = 1; i <= 30; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.innerText = `Level ${i}`;
            select.appendChild(opt);
        }
        
        // Set current value to whatever loaded
        select.value = this.levelManager.currentLevelId;
        container.appendChild(select);

        // Go Button
        const btn = document.createElement('button');
        btn.innerText = "LOAD";
        btn.style.cssText = `
            background: #222; color: #0f0; border: 1px solid #0f0;
            cursor: pointer; font-family: monospace;
        `;
        btn.onclick = () => {
            const lvl = parseInt(select.value);
            this.levelManager.loadLevel(lvl);
            // Also force-close any modals blocking the view
            document.getElementById('modal-overlay').classList.add('hidden');
        };
        container.appendChild(btn);

        // Clear Save Button
        const btnReset = document.createElement('button');
        btnReset.innerText = "WIPE SAVE";
        btnReset.style.cssText = `
            background: #300; color: #f55; border: 1px solid #f00;
            cursor: pointer; font-family: monospace;
        `;
        btnReset.onclick = () => {
            localStorage.removeItem('dublin_contract_save');
            localStorage.removeItem('dublin_contract_journal');
            location.reload();
        };
        container.appendChild(btnReset);

        document.body.appendChild(container);
    }
}
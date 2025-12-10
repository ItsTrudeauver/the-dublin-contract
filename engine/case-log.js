/**
 * case-log.js
 * Manages the persistent narrative history (The Casebook).
 */
export class CaseLog {
    constructor() {
        this.storageKey = 'dublin_contract_journal';
        this.entries = this.loadEntries();
        
        this.initUI();
    }

    loadEntries() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveEntry(levelId, title, text) {
        // Prevent duplicates
        if (this.entries.find(e => e.id === levelId)) return;

        this.entries.push({
            id: levelId,
            title: title,
            text: text,
            timestamp: new Date().toLocaleString()
        });

        localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
        this.render(); // Refresh if open
    }

    initUI() {
        // 1. Create the Button in HUD (if missing)
        const hudRight = document.querySelector('.hud-right');
        if (hudRight && !document.getElementById('btn-casebook')) {
            const btn = document.createElement('button');
            btn.id = 'btn-casebook';
            btn.innerText = "CASEBOOK";
            btn.onclick = () => this.toggleModal();
            // Insert before the Reset button
            hudRight.insertBefore(btn, hudRight.firstChild);
        }

        // 2. Create the Modal (Hidden)
        if (!document.getElementById('casebook-modal')) {
            const modal = document.createElement('div');
            modal.id = 'casebook-modal';
            modal.className = 'hidden';
            modal.innerHTML = `
                <div class="casebook-content">
                    <h2>INVESTIGATION LOG</h2>
                    <div id="casebook-list"></div>
                    <button id="btn-close-casebook">CLOSE ARCHIVE</button>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-close-casebook').onclick = () => this.toggleModal();
        }
    }

    toggleModal() {
        const modal = document.getElementById('casebook-modal');
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            this.render();
        }
    }

    render() {
        const list = document.getElementById('casebook-list');
        list.innerHTML = '';

        if (this.entries.length === 0) {
            list.innerHTML = '<div class="empty-log">NO CASES RESOLVED.</div>';
            return;
        }

        // Sort by ID descending (newest first)
        const sorted = [...this.entries].sort((a, b) => b.id - a.id);

        sorted.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'log-entry';
            item.innerHTML = `
                <div class="log-header">
                    <span class="log-title">${entry.title}</span>
                    <span class="log-id">#${entry.id.toString().padStart(3, '0')}</span>
                </div>
                <div class="log-body">${entry.text}</div>
            `;
            list.appendChild(item);
        });
    }
}
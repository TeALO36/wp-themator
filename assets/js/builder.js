document.addEventListener('DOMContentLoaded', () => {
    // Guard: only run if the builder button exists
    const launchBtn = document.getElementById('launch-themator-builder');
    if (!launchBtn) return;

    // =====================================
    // DOM References
    // =====================================
    const overlay       = document.getElementById('themator-builder-overlay');
    const closeBtn      = document.getElementById('tm-close-builder');
    const fabMainToggle = document.getElementById('tm-fab-main-toggle');
    const fabMenu       = document.getElementById('tm-fab-menu');
    const applyBtn      = document.getElementById('tm-apply-builder');
    const canvas        = document.getElementById('tm-canvas');
    const dataInput     = document.getElementById('themator_data_input');
    const htmlInput     = document.getElementById('themator_html_input');
    const modal         = document.getElementById('tm-settings-modal');
    const modalTitle    = document.getElementById('tm-modal-title');
    const modalBody     = document.getElementById('tm-modal-body');
    const modalSaveBtn  = document.getElementById('tm-modal-save');
    const modalCloseBtn = document.getElementById('tm-modal-cancel');

    // =====================================
    // jQuery UI Draggable for Modal
    // =====================================
    if (typeof jQuery !== 'undefined' && jQuery.fn.draggable) {
        jQuery(modal).draggable({ handle: '.tm-modal-header' });
    }

    // =====================================
    // State
    // =====================================
    let state = { sections: [] };
    let currentEditingNode = null;

    try {
        const raw = thematorData.saved_data;
        if (raw && raw.trim() !== '') {
            state = JSON.parse(raw);
        }
    } catch(e) {
        console.warn('[Themator] Could not parse saved data:', e);
    }

    const uid = () => Date.now() + Math.floor(Math.random() * 1000);

    // =====================================
    // Launch / Close Builder
    // =====================================
    launchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        render();
    });

    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    });

    // =====================================
    // FAB Circle Toggle
    // =====================================
    if (fabMainToggle) {
        fabMainToggle.addEventListener('click', () => {
            const isActive = fabMenu.classList.toggle('active');
            fabMainToggle.textContent = isActive ? '✕' : '⋯';
        });
    }

    // =====================================
    // Save / Apply
    // =====================================
    applyBtn.addEventListener('click', () => {
        syncContentFromDOM();
        dataInput.value = JSON.stringify(state);
        htmlInput.value = generateFrontendHTML(state);

        applyBtn.textContent = '✓ Sauvegardé';
        setTimeout(() => {
            applyBtn.textContent = 'Enregistrer';
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 1200);
    });

    // =====================================
    // RENDER
    // =====================================
    function render() {
        canvas.querySelectorAll('.tm-section, .tm-section-add-wrapper').forEach(el => el.remove());

        if (state.sections.length === 0) {
            renderEmptyState();
        } else {
            const empty = canvas.querySelector('.tm-empty-state');
            if (empty) empty.remove();

            state.sections.forEach((section) => {
                canvas.appendChild(createSectionElement(section));
            });
        }
        renderGlobalAddBtn();
    }

    function renderEmptyState() {
        const existing = canvas.querySelector('.tm-empty-state');
        if (existing) return;

        const div = document.createElement('div');
        div.className = 'tm-empty-state';
        div.innerHTML = `
            <p>Commencez à construire avec Themator</p>
            <button type="button" class="tm-add-section-btn tm-initial-add-btn" style="opacity:1; transform:scale(1);">
                <span>+</span> Ajouter une Section
            </button>
        `;
        div.querySelector('.tm-initial-add-btn').addEventListener('click', () => addSection());
        canvas.appendChild(div);
    }

    function renderGlobalAddBtn() {
        const existing = canvas.querySelector('.tm-add-section-btn-global');
        if (existing) existing.remove();

        if (state.sections.length > 0) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tm-add-section-btn-global';
            btn.innerHTML = '<span>+</span> Section';
            btn.addEventListener('click', () => addSection());
            canvas.appendChild(btn);
        }
    }

    // =====================================
    // Element Creators
    // =====================================
    function createSectionElement(section) {
        const el = document.createElement('section');
        el.className = 'tm-section';
        el.dataset.id = section.id;
        applyStyles(el, section);

        el.appendChild(createPill('section', section.id, null, 'section-pill', 'Section'));

        const rowsContainer = document.createElement('div');
        rowsContainer.className = 'tm-rows-container';
        (section.rows || []).forEach(row => {
            rowsContainer.appendChild(createRowElement(row, section.id));
        });
        el.appendChild(rowsContainer);

        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'tm-row-add-btn';
        addRowBtn.textContent = '+';
        addRowBtn.onclick = (e) => { e.stopPropagation(); addRow(section.id); };
        el.appendChild(addRowBtn);

        return el;
    }

    function createRowElement(row, sectionId) {
        const el = document.createElement('div');
        el.className = 'tm-row';
        el.dataset.id = row.id;
        applyStyles(el, row);

        el.appendChild(createPill('row', row.id, sectionId, 'row-pill', 'Ligne'));

        const modulesContainer = document.createElement('div');
        modulesContainer.className = 'tm-modules-container';
        modulesContainer.style.cssText = 'display:flex; flex-wrap:wrap; width:100%;';
        (row.modules || []).forEach(module => {
            modulesContainer.appendChild(createModuleElement(module, row.id));
        });
        el.appendChild(modulesContainer);

        const addModBtn = document.createElement('button');
        addModBtn.className = 'tm-module-add-btn';
        addModBtn.textContent = '+';
        addModBtn.onclick = (e) => { e.stopPropagation(); addModule(row.id); };
        el.appendChild(addModBtn);

        return el;
    }

    function createModuleElement(module, rowId) {
        const el = document.createElement('div');
        el.className = 'tm-module';
        el.dataset.id = module.id;
        applyStyles(el, module);

        el.appendChild(createPill('module', module.id, rowId, 'module-pill', 'Module Texte'));

        const content = document.createElement('div');
        content.className = 'tm-module-content';
        content.contentEditable = 'true';
        content.innerHTML = module.content || '<p>Texte Themator...</p>';
        content.onblur = () => { module.content = content.innerHTML; };
        el.appendChild(content);

        return el;
    }

    function createPill(type, id, parentId, pillClass, labelText) {
        const pill = document.createElement('div');
        pill.className = `tm-controls-pill ${pillClass}`;
        pill.innerHTML = `<span class="tm-pill-label">${labelText}</span>`;
        
        const actions = [
            { icon: '⚙', cls: 'tm-action-settings', title: 'Paramètres' },
            { icon: '⎘', cls: 'tm-action-clone', title: 'Dupliquer' },
            { icon: '✕', cls: 'tm-action-delete', title: 'Supprimer' }
        ];

        actions.forEach(a => {
            const btn = document.createElement('button');
            btn.className = `tm-control-btn ${a.cls}`;
            btn.innerHTML = a.icon;
            btn.title = a.title;
            btn.dataset.type = type;
            btn.dataset.id = id;
            if (parentId) btn.dataset.parent = parentId;
            pill.appendChild(btn);
        });
        return pill;
    }

    function applyStyles(el, node) {
        if (node.bgColor && node.bgColor !== '#ffffff') el.style.backgroundColor = node.bgColor;
        if (node.padding) el.style.padding = node.padding;
    }

    // =====================================
    // Event Delegation
    // =====================================
    canvas.addEventListener('click', (e) => {
        const settingsBtn = e.target.closest('.tm-action-settings');
        const cloneBtn    = e.target.closest('.tm-action-clone');
        const deleteBtn   = e.target.closest('.tm-action-delete');

        if (settingsBtn) {
            const d = settingsBtn.dataset;
            openSettings(d.type, d.id, d.parent || null);
        } else if (cloneBtn) {
            const d = cloneBtn.dataset;
            cloneNode(d.type, d.id, d.parent || null);
        } else if (deleteBtn) {
            const d = deleteBtn.dataset;
            deleteNode(d.type, d.id, d.parent || null);
        }
    });

    // =====================================
    // Functions (Add, Clone, Delete)
    // =====================================
    function addSection() {
        state.sections.push({
            id: 'sec-' + uid(),
            bgColor: '#ffffff',
            padding: '50px 20px',
            rows: [{ id: 'row-' + uid(), modules: [] }]
        });
        render();
    }

    function addRow(secId) {
        const sec = state.sections.find(s => s.id === secId);
        if (sec) {
            sec.rows.push({ id: 'row-' + uid(), modules: [] });
            render();
        }
    }

    function addModule(rowId) {
        for (const s of state.sections) {
            const r = s.rows.find(row => row.id === rowId);
            if (r) {
                r.modules.push({ id: 'mod-' + uid(), content: '<p>Nouveau module Themator</p>' });
                render();
                return;
            }
        }
    }

    function cloneNode(type, id, parentId) {
        // ... (clone logic stays same as diviclone but updated for state)
        if (type === 'section') {
            const idx = state.sections.findIndex(s => s.id === id);
            if (idx > -1) {
                const copy = JSON.parse(JSON.stringify(state.sections[idx]));
                copy.id = 'sec-' + uid();
                state.sections.splice(idx + 1, 0, copy);
            }
        } else if (type === 'row') {
            const sec = state.sections.find(s => s.id === parentId);
            if (sec) {
                const idx = sec.rows.findIndex(r => r.id === id);
                if (idx > -1) {
                    const copy = JSON.parse(JSON.stringify(sec.rows[idx]));
                    copy.id = 'row-' + uid();
                    sec.rows.splice(idx + 1, 0, copy);
                }
            }
        }
        render();
    }

    function deleteNode(type, id, parentId) {
        if (type === 'section') state.sections = state.sections.filter(s => s.id !== id);
        else if (type === 'row') {
            const sec = state.sections.find(s => s.id === parentId);
            if (sec) sec.rows = sec.rows.filter(r => r.id !== id);
        }
        render();
    }

    // =====================================
    // Modal
    // =====================================
    function openSettings(type, id, parentId) {
        currentEditingNode = { type, id, parentId };
        modal.style.display = 'flex';
        modalTitle.textContent = 'Paramètres ' + type.charAt(0).toUpperCase() + type.slice(1);
        // ... (settings injection)
    }

    modalCloseBtn.onclick = () => { modal.style.display = 'none'; };
    modalSaveBtn.onclick = () => {
        // save logic...
        modal.style.display = 'none';
        render();
    };

    function syncContentFromDOM() {
        // ...
    }

    function generateFrontendHTML(data) {
        let html = '<div class="themator-frontend-wrapper">';
        (data.sections || []).forEach(sec => {
            html += `<section class="tm-front-section" style="background:${sec.bgColor}; padding:${sec.padding};">`;
            (sec.rows || []).forEach(row => {
                html += `<div class="tm-front-row">`;
                (row.modules || []).forEach(mod => {
                    html += `<div class="tm-front-module">${mod.content}</div>`;
                });
                html += `</div>`;
            });
            html += `</section>`;
        });
        html += '</div>';
        return html;
    }
});

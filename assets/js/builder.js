document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('launch-themator-builder');
    if (!launchBtn) return;

    // ── DOM refs ──────────────────────────────────────────────────────────────
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

    if (typeof jQuery !== 'undefined' && jQuery.fn.draggable) {
        jQuery(modal).draggable({ handle: '.tm-modal-header' });
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let state = { sections: [] };
    let currentEditingNode = null;

    try {
        const raw = (typeof thematorData !== 'undefined') ? thematorData.saved_data : '';
        if (raw && raw.trim() !== '') state = JSON.parse(raw);
    } catch(e) { console.warn('[Themator] parse error:', e); }

    const uid = () => 'tm' + Date.now() + Math.floor(Math.random() * 9999);

    // ── Launch / Close ────────────────────────────────────────────────────────
    launchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
        overlay.style.display = 'flex';
        document.body.classList.add('themator-fullscreen');
        render();
    });

    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        document.body.classList.remove('themator-fullscreen');
    });

    if (fabMainToggle) {
        fabMainToggle.addEventListener('click', () => {
            const isActive = fabMenu.classList.toggle('active');
            fabMainToggle.textContent = isActive ? '✕' : '⋯';
        });
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    applyBtn.addEventListener('click', () => {
        syncContentFromDOM();
        dataInput.value = JSON.stringify(state);
        htmlInput.value = generateFrontendHTML(state);
        applyBtn.textContent = '✓ Sauvegardé';
        setTimeout(() => {
            applyBtn.textContent = 'Enregistrer';
            overlay.style.display = 'none';
            document.body.classList.remove('themator-fullscreen');
        }, 1200);
    });

    // ── Render ────────────────────────────────────────────────────────────────
    function render() {
        canvas.querySelectorAll('.tm-section, .tm-empty-state').forEach(el => el.remove());
        const globalBtn = canvas.querySelector('.tm-add-section-btn-global');
        if (globalBtn) globalBtn.remove();

        if (state.sections.length === 0) {
            renderEmptyState();
        } else {
            state.sections.forEach(section => canvas.appendChild(createSectionElement(section)));
        }
        renderGlobalAddBtn();
    }

    function renderEmptyState() {
        const div = document.createElement('div');
        div.className = 'tm-empty-state';
        div.innerHTML = `
            <p>Commencez à construire avec Themator</p>
            <button type="button" class="tm-add-section-btn tm-initial-add-btn" style="opacity:1;transform:scale(1);">
                <span>+</span> Ajouter une Section
            </button>
        `;
        div.querySelector('.tm-initial-add-btn').addEventListener('click', () => addSection());
        canvas.appendChild(div);
    }

    function renderGlobalAddBtn() {
        if (state.sections.length > 0) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tm-add-section-btn-global';
            btn.innerHTML = '<span>+</span> Section';
            btn.addEventListener('click', () => addSection());
            canvas.appendChild(btn);
        }
    }

    // ── Section ───────────────────────────────────────────────────────────────
    function createSectionElement(section) {
        const el = document.createElement('section');
        el.className = 'tm-section';
        el.dataset.id = section.id;
        applyStyles(el, section);

        el.appendChild(createPill('section', section.id, null, 'section-pill', 'Section'));

        const rowsContainer = document.createElement('div');
        rowsContainer.className = 'tm-rows-container';
        (section.rows || []).forEach(row => rowsContainer.appendChild(createRowElement(row, section.id)));
        el.appendChild(rowsContainer);

        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'tm-row-add-btn';
        addRowBtn.title = 'Ajouter une ligne';
        addRowBtn.textContent = '+';
        addRowBtn.onclick = (e) => { e.stopPropagation(); showColumnPicker(section.id); };
        el.appendChild(addRowBtn);

        return el;
    }

    // ── Row ───────────────────────────────────────────────────────────────────
    function createRowElement(row, sectionId) {
        const el = document.createElement('div');
        el.className = 'tm-row';
        el.dataset.id = row.id;
        applyStyles(el, row);

        el.appendChild(createPill('row', row.id, sectionId, 'row-pill', 'Ligne'));

        const modulesContainer = document.createElement('div');
        modulesContainer.className = 'tm-modules-container';
        modulesContainer.style.cssText = 'display:flex;flex-wrap:wrap;width:100%;';
        (row.modules || []).forEach(mod => modulesContainer.appendChild(createModuleElement(mod, row.id)));
        el.appendChild(modulesContainer);

        const addModBtn = document.createElement('button');
        addModBtn.className = 'tm-module-add-btn';
        addModBtn.title = 'Ajouter un module';
        addModBtn.textContent = '+';
        addModBtn.onclick = (e) => { e.stopPropagation(); showModulePicker(row.id); };
        el.appendChild(addModBtn);

        return el;
    }

    // ── Module ────────────────────────────────────────────────────────────────
    function createModuleElement(mod, rowId) {
        const el = document.createElement('div');
        el.className = 'tm-module';
        el.dataset.id = mod.id;
        el.dataset.type = mod.type || 'text';
        applyStyles(el, mod);

        if (mod.width) el.style.flex = '0 0 ' + mod.width;

        const typeLabel = { text: 'Texte', image: 'Image', button: 'Bouton', title: 'Titre' }[mod.type] || 'Module';
        el.appendChild(createPill('module', mod.id, rowId, 'module-pill', typeLabel));

        const content = document.createElement('div');
        content.className = 'tm-module-content';

        if (mod.type === 'image') {
            content.contentEditable = 'false';
            content.style.cssText = 'text-align:center;padding:8px;';
            if (mod.src) {
                content.innerHTML = `<img src="${mod.src}" alt="${mod.alt || ''}" style="max-width:100%;display:block;margin:0 auto;${mod.imgStyle || ''}">`;
                if (mod.caption) content.innerHTML += `<p style="font-size:13px;color:#888;margin:6px 0 0;">${mod.caption}</p>`;
            } else {
                content.innerHTML = `<div style="background:#f0f0f0;padding:40px;text-align:center;color:#aaa;border:2px dashed #ccc;border-radius:4px;">🖼️<br>Cliquez ⚙ pour ajouter une image</div>`;
            }
        } else if (mod.type === 'button') {
            content.contentEditable = 'false';
            const bg    = mod.btnBg    || '#8f43ee';
            const color = mod.btnColor || '#ffffff';
            const align = mod.align    || 'center';
            const url   = mod.url      || '#';
            content.style.textAlign = align;
            content.innerHTML = `<a href="${url}" style="display:inline-block;background:${bg};color:${color};padding:12px 28px;border-radius:4px;font-weight:700;text-decoration:none;font-size:15px;">${mod.content || 'Cliquez ici'}</a>`;
        } else if (mod.type === 'title') {
            content.contentEditable = 'true';
            const level    = mod.level    || 'h2';
            const align    = mod.align    || 'left';
            const color    = mod.txtColor || '#333';
            const fontSize = mod.fontSize || '';
            content.innerHTML = `<${level} style="margin:0;text-align:${align};color:${color};${fontSize ? 'font-size:'+fontSize+';' : ''}">${mod.content || 'Titre'}</${level}>`;
            content.onblur = () => {
                const tag = content.querySelector(level);
                if (tag) mod.content = tag.innerHTML;
            };
        } else {
            // text
            content.contentEditable = 'true';
            const align    = mod.align    || 'left';
            const color    = mod.txtColor || '#333';
            const fontSize = mod.fontSize || '16px';
            content.style.cssText = `text-align:${align};color:${color};font-size:${fontSize};`;
            content.innerHTML = mod.content || '<p>Texte Themator...</p>';
            content.onblur = () => { mod.content = content.innerHTML; };
        }

        el.appendChild(content);
        return el;
    }

    // ── Pill controls ─────────────────────────────────────────────────────────
    function createPill(type, id, parentId, pillClass, labelText) {
        const pill = document.createElement('div');
        pill.className = `tm-controls-pill ${pillClass}`;
        pill.innerHTML = `<span class="tm-pill-label">${labelText}</span>`;

        const actions = [
            { icon: '⚙', cls: 'tm-action-settings', title: 'Paramètres' },
            { icon: '⎘', cls: 'tm-action-clone',    title: 'Dupliquer' },
            { icon: '✕', cls: 'tm-action-delete',   title: 'Supprimer' },
        ];
        // Up/Down for sections
        if (type === 'section') {
            actions.unshift({ icon: '↑', cls: 'tm-action-up', title: 'Monter' });
            actions.splice(1, 0, { icon: '↓', cls: 'tm-action-down', title: 'Descendre' });
        }

        actions.forEach(a => {
            const btn = document.createElement('button');
            btn.type = 'button';
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
        if (node.bgImage) el.style.backgroundImage = `url(${node.bgImage})`;
        if (node.bgImage) el.style.backgroundSize = 'cover';
        if (node.bgImage) el.style.backgroundPosition = 'center';
        if (node.padding) el.style.padding = node.padding;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    canvas.addEventListener('click', (e) => {
        const btn = e.target.closest('[class*="tm-action-"]');
        if (!btn) return;
        const d = btn.dataset;
        if      (btn.classList.contains('tm-action-settings')) openSettings(d.type, d.id, d.parent || null);
        else if (btn.classList.contains('tm-action-clone'))    cloneNode(d.type, d.id, d.parent || null);
        else if (btn.classList.contains('tm-action-delete'))   deleteNode(d.type, d.id, d.parent || null);
        else if (btn.classList.contains('tm-action-up'))       moveSection(d.id, -1);
        else if (btn.classList.contains('tm-action-down'))     moveSection(d.id, +1);
    });

    // ── Column picker ─────────────────────────────────────────────────────────
    function showColumnPicker(sectionId) {
        const picker = document.createElement('div');
        picker.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:6px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,0.25);z-index:1000001;min-width:380px;';

        const layouts = [
            { label: '1 col', cols: ['1/1'],             widths: ['100%'] },
            { label: '1/2 + 1/2', cols: ['1/2','1/2'],   widths: ['50%','50%'] },
            { label: '1/3 + 2/3', cols: ['1/3','2/3'],   widths: ['33.33%','66.66%'] },
            { label: '2/3 + 1/3', cols: ['2/3','1/3'],   widths: ['66.66%','33.33%'] },
            { label: '1/3 × 3',   cols: ['1/3','1/3','1/3'], widths: ['33.33%','33.33%','33.33%'] },
            { label: '1/4 × 4',   cols: ['1/4','1/4','1/4','1/4'], widths: ['25%','25%','25%','25%'] },
        ];

        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000000;';
        backdrop.onclick = () => { picker.remove(); backdrop.remove(); };
        document.body.appendChild(backdrop);

        picker.innerHTML = `<h3 style="margin:0 0 18px;font-size:15px;font-weight:700;">Choisir une disposition</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
            ${layouts.map((l,i) => `
                <button type="button" data-idx="${i}" style="border:2px solid #e0e0e0;border-radius:4px;padding:12px 8px;cursor:pointer;background:#fff;display:flex;flex-direction:column;align-items:center;gap:6px;transition:border-color .15s;">
                    <div style="display:flex;gap:3px;width:100%;height:28px;">
                        ${l.widths.map(w=>`<div style="flex:0 0 ${w};height:100%;background:#e8e8e8;border-radius:2px;"></div>`).join('')}
                    </div>
                    <span style="font-size:11px;color:#888;">${l.label}</span>
                </button>
            `).join('')}
            </div>`;

        picker.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => btn.style.borderColor = '#8f43ee');
            btn.addEventListener('mouseleave', () => btn.style.borderColor = '#e0e0e0');
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const layout = layouts[idx];
                const sec = state.sections.find(s => s.id === sectionId);
                if (sec) {
                    sec.rows.push({
                        id: 'row-' + uid(),
                        modules: layout.widths.map(w => ({ id: 'mod-' + uid(), type: 'text', content: '<p>Votre texte...</p>', width: w }))
                    });
                    render();
                }
                picker.remove();
                backdrop.remove();
            });
        });

        document.body.appendChild(picker);
    }

    // ── Module picker ─────────────────────────────────────────────────────────
    function showModulePicker(rowId) {
        const types = [
            { type: 'text',   icon: '📝', label: 'Texte' },
            { type: 'title',  icon: '🔤', label: 'Titre' },
            { type: 'image',  icon: '🖼️', label: 'Image' },
            { type: 'button', icon: '🔘', label: 'Bouton' },
        ];

        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000000;';

        const picker = document.createElement('div');
        picker.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:6px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,0.25);z-index:1000001;min-width:320px;';
        picker.innerHTML = `<h3 style="margin:0 0 18px;font-size:15px;font-weight:700;">Choisir un module</h3>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                ${types.map(t => `
                    <button type="button" data-mtype="${t.type}" style="border:2px solid #e0e0e0;border-radius:6px;padding:20px;cursor:pointer;background:#fff;display:flex;flex-direction:column;align-items:center;gap:8px;transition:all .15s;">
                        <span style="font-size:28px;">${t.icon}</span>
                        <span style="font-size:13px;font-weight:600;color:#555;">${t.label}</span>
                    </button>
                `).join('')}
            </div>`;

        backdrop.onclick = () => { picker.remove(); backdrop.remove(); };

        picker.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#8f43ee'; btn.style.background = '#f9f6ff'; });
            btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#e0e0e0'; btn.style.background = '#fff'; });
            btn.addEventListener('click', () => {
                const mtype = btn.dataset.mtype;
                addModuleOfType(rowId, mtype);
                picker.remove();
                backdrop.remove();
            });
        });

        document.body.appendChild(backdrop);
        document.body.appendChild(picker);
    }

    // ── Add / Clone / Delete ──────────────────────────────────────────────────
    function addSection() {
        state.sections.push({
            id: 'sec-' + uid(),
            bgColor: '#ffffff',
            padding: '60px 20px',
            rows: []
        });
        render();
    }

    function addModuleOfType(rowId, mtype) {
        for (const s of state.sections) {
            const r = s.rows.find(row => row.id === rowId);
            if (r) {
                const defaults = {
                    text:   { type: 'text',   content: '<p>Votre texte ici...</p>', txtColor: '#333', fontSize: '16px', align: 'left' },
                    title:  { type: 'title',  content: 'Votre titre', level: 'h2', align: 'left', txtColor: '#1a1a1a' },
                    image:  { type: 'image',  src: '', alt: '', caption: '' },
                    button: { type: 'button', content: 'Cliquez ici', url: '#', btnBg: '#8f43ee', btnColor: '#ffffff', align: 'center' },
                };
                r.modules.push({ id: 'mod-' + uid(), ...defaults[mtype] });
                render();
                return;
            }
        }
    }

    function cloneNode(type, id, parentId) {
        if (type === 'section') {
            const idx = state.sections.findIndex(s => s.id === id);
            if (idx > -1) {
                const copy = JSON.parse(JSON.stringify(state.sections[idx]));
                copy.id = 'sec-' + uid();
                (copy.rows || []).forEach(r => { r.id = 'row-' + uid(); (r.modules || []).forEach(m => m.id = 'mod-' + uid()); });
                state.sections.splice(idx + 1, 0, copy);
            }
        } else if (type === 'row') {
            const sec = state.sections.find(s => s.id === parentId);
            if (sec) {
                const idx = sec.rows.findIndex(r => r.id === id);
                if (idx > -1) {
                    const copy = JSON.parse(JSON.stringify(sec.rows[idx]));
                    copy.id = 'row-' + uid();
                    (copy.modules || []).forEach(m => m.id = 'mod-' + uid());
                    sec.rows.splice(idx + 1, 0, copy);
                }
            }
        } else if (type === 'module') {
            for (const s of state.sections) {
                const r = s.rows.find(row => row.id === parentId);
                if (r) {
                    const idx = r.modules.findIndex(m => m.id === id);
                    if (idx > -1) {
                        const copy = JSON.parse(JSON.stringify(r.modules[idx]));
                        copy.id = 'mod-' + uid();
                        r.modules.splice(idx + 1, 0, copy);
                    }
                    break;
                }
            }
        }
        render();
    }

    function deleteNode(type, id, parentId) {
        if (type === 'section') {
            state.sections = state.sections.filter(s => s.id !== id);
        } else if (type === 'row') {
            const sec = state.sections.find(s => s.id === parentId);
            if (sec) sec.rows = sec.rows.filter(r => r.id !== id);
        } else if (type === 'module') {
            for (const s of state.sections) {
                const r = s.rows.find(row => row.id === parentId);
                if (r) { r.modules = r.modules.filter(m => m.id !== id); break; }
            }
        }
        render();
    }

    function moveSection(id, dir) {
        const idx = state.sections.findIndex(s => s.id === id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= state.sections.length) return;
        [state.sections[idx], state.sections[newIdx]] = [state.sections[newIdx], state.sections[idx]];
        render();
    }

    // ── Settings Modal (with real fields) ─────────────────────────────────────
    function findNode(type, id, parentId) {
        if (type === 'section') return state.sections.find(s => s.id === id);
        if (type === 'row') {
            const sec = state.sections.find(s => s.id === parentId);
            return sec ? sec.rows.find(r => r.id === id) : null;
        }
        if (type === 'module') {
            for (const s of state.sections) {
                const r = s.rows.find(row => row.id === parentId);
                if (r) return r.modules.find(m => m.id === id) || null;
            }
        }
        return null;
    }

    function openSettings(type, id, parentId) {
        syncContentFromDOM();
        currentEditingNode = { type, id, parentId };
        const node = findNode(type, id, parentId);
        if (!node) return;

        modal.style.display = 'flex';
        modalTitle.textContent = { section: 'Section', row: 'Ligne', module: 'Module' }[type] + ' — Paramètres';

        // Build tabs
        const tabs = modal.querySelectorAll('.tm-modal-tab');
        tabs.forEach((t, i) => {
            t.classList.toggle('active', i === 0);
            t.onclick = () => { tabs.forEach(x => x.classList.remove('active')); t.classList.add('active'); renderModalBody(node, type, i); };
        });
        renderModalBody(node, type, 0);
    }

    function field(label, key, node, type = 'text', opts = {}) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'margin-bottom:16px;';
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:6px;';
        lbl.textContent = label;
        wrap.appendChild(lbl);

        let input;
        if (type === 'textarea') {
            input = document.createElement('textarea');
            input.style.cssText = 'width:100%;padding:8px;border:1px solid #d5d9dd;border-radius:3px;font-size:13px;resize:vertical;min-height:80px;font-family:inherit;';
            input.value = node[key] || '';
        } else if (type === 'select') {
            input = document.createElement('select');
            input.style.cssText = 'width:100%;padding:8px;border:1px solid #d5d9dd;border-radius:3px;font-size:13px;';
            (opts.options || []).forEach(([v,l]) => {
                const o = document.createElement('option');
                o.value = v; o.textContent = l;
                if (node[key] === v) o.selected = true;
                input.appendChild(o);
            });
        } else if (type === 'color') {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;';
            input = document.createElement('input');
            input.type = 'color';
            input.style.cssText = 'width:44px;height:36px;padding:2px;border:1px solid #d5d9dd;border-radius:3px;cursor:pointer;';
            input.value = node[key] || '#ffffff';
            const txt = document.createElement('input');
            txt.type = 'text';
            txt.style.cssText = 'flex:1;padding:8px;border:1px solid #d5d9dd;border-radius:3px;font-size:13px;font-family:monospace;';
            txt.value = node[key] || '#ffffff';
            input.oninput = () => { txt.value = input.value; node[key] = input.value; };
            txt.oninput  = () => { if (/^#[0-9a-f]{6}$/i.test(txt.value)) { input.value = txt.value; node[key] = txt.value; } };
            row.appendChild(input); row.appendChild(txt);
            wrap.appendChild(lbl); wrap.appendChild(row);
            return wrap;
        } else if (type === 'image-picker') {
            const preview = document.createElement('img');
            preview.style.cssText = 'max-width:100%;max-height:120px;border-radius:4px;display:block;margin-bottom:8px;' + (node[key] ? '' : 'display:none;');
            if (node[key]) preview.src = node[key];
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.placeholder = 'https://... ou URL de votre image';
            urlInput.style.cssText = 'width:100%;padding:8px;border:1px solid #d5d9dd;border-radius:3px;font-size:13px;';
            urlInput.value = node[key] || '';
            urlInput.oninput = () => { node[key] = urlInput.value; if (urlInput.value) { preview.src = urlInput.value; preview.style.display='block'; } else preview.style.display='none'; };

            // WP Media button
            let wpBtn = null;
            if (typeof wp !== 'undefined' && wp.media) {
                wpBtn = document.createElement('button');
                wpBtn.type = 'button';
                wpBtn.textContent = '📂 Bibliothèque média WP';
                wpBtn.style.cssText = 'margin-top:8px;padding:7px 14px;background:#f0f0f1;border:1px solid #c3c4c7;border-radius:3px;cursor:pointer;font-size:12px;font-weight:600;';
                wpBtn.onclick = () => {
                    const frame = wp.media({ title: 'Choisir une image', button: { text: 'Utiliser cette image' }, multiple: false });
                    frame.on('select', () => {
                        const att = frame.state().get('selection').first().toJSON();
                        urlInput.value = att.url;
                        node[key] = att.url;
                        preview.src = att.url;
                        preview.style.display = 'block';
                    });
                    frame.open();
                };
            }

            wrap.appendChild(lbl);
            wrap.appendChild(preview);
            wrap.appendChild(urlInput);
            if (wpBtn) wrap.appendChild(wpBtn);
            return wrap;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.style.cssText = 'width:100%;padding:8px;border:1px solid #d5d9dd;border-radius:3px;font-size:13px;';
            input.value = node[key] || (opts.default || '');
            input.placeholder = opts.placeholder || '';
        }

        if (input) {
            input.addEventListener('input', () => { node[key] = input.value; });
            input.addEventListener('change', () => { node[key] = input.value; });
        }
        wrap.appendChild(input);
        return wrap;
    }

    function renderModalBody(node, type, tabIdx) {
        modalBody.innerHTML = '';
        const isContent = tabIdx === 0;

        if (isContent) {
            // Content tab
            if (type === 'section') {
                modalBody.appendChild(field('Couleur de fond', 'bgColor', node, 'color'));
                modalBody.appendChild(field('Image de fond (URL)', 'bgImage', node, 'image-picker'));
                modalBody.appendChild(field('Padding', 'padding', node, 'text', { default: '60px 20px', placeholder: 'ex: 60px 20px' }));
            } else if (type === 'row') {
                modalBody.appendChild(field('Couleur de fond', 'bgColor', node, 'color'));
                modalBody.appendChild(field('Padding', 'padding', node, 'text', { placeholder: 'ex: 20px 0' }));
            } else if (type === 'module') {
                if (node.type === 'image') {
                    modalBody.appendChild(field('Image', 'src', node, 'image-picker'));
                    modalBody.appendChild(field('Texte alternatif', 'alt', node, 'text', { placeholder: 'Description de l\'image' }));
                    modalBody.appendChild(field('Légende', 'caption', node, 'text', { placeholder: 'Légende optionnelle' }));
                } else if (node.type === 'button') {
                    modalBody.appendChild(field('Texte du bouton', 'content', node, 'text', { placeholder: 'Cliquez ici' }));
                    modalBody.appendChild(field('Lien URL', 'url', node, 'text', { placeholder: 'https://...' }));
                    modalBody.appendChild(field('Couleur fond', 'btnBg', node, 'color'));
                    modalBody.appendChild(field('Couleur texte', 'btnColor', node, 'color'));
                    modalBody.appendChild(field('Alignement', 'align', node, 'select', { options: [['left','Gauche'],['center','Centre'],['right','Droite']] }));
                } else if (node.type === 'title') {
                    modalBody.appendChild(field('Niveau HTML', 'level', node, 'select', { options: [['h1','H1'],['h2','H2'],['h3','H3'],['h4','H4']] }));
                    modalBody.appendChild(field('Alignement', 'align', node, 'select', { options: [['left','Gauche'],['center','Centre'],['right','Droite']] }));
                } else {
                    // text
                    modalBody.appendChild(field('Contenu HTML', 'content', node, 'textarea'));
                    modalBody.appendChild(field('Alignement', 'align', node, 'select', { options: [['left','Gauche'],['center','Centre'],['right','Droite']] }));
                }
            }
        } else {
            // Style tab
            if (type === 'module') {
                if (node.type !== 'image' && node.type !== 'button') {
                    modalBody.appendChild(field('Couleur du texte', 'txtColor', node, 'color'));
                    modalBody.appendChild(field('Taille de police', 'fontSize', node, 'text', { default: '16px', placeholder: 'ex: 16px' }));
                }
                modalBody.appendChild(field('Couleur de fond', 'bgColor', node, 'color'));
                modalBody.appendChild(field('Padding', 'padding', node, 'text', { placeholder: 'ex: 15px' }));
                if (node.type === 'image') {
                    modalBody.appendChild(field('Style img (CSS)', 'imgStyle', node, 'text', { placeholder: 'ex: border-radius:8px;' }));
                    modalBody.appendChild(field('Largeur du module', 'width', node, 'select', { options: [['','Auto'],['100%','100%'],['50%','50%'],['33.33%','1/3'],['66.66%','2/3'],['25%','25%']] }));
                }
            } else if (type === 'section') {
                modalBody.appendChild(field('Couleur superposition', 'bgColor', node, 'color'));
            }
        }
    }

    // Save modal → re-render
    modalCloseBtn.onclick = () => { modal.style.display = 'none'; };
    modalSaveBtn.onclick = () => {
        modal.style.display = 'none';
        render();
    };

    // ── Sync inline edits back to state ───────────────────────────────────────
    function syncContentFromDOM() {
        canvas.querySelectorAll('.tm-module').forEach(el => {
            const modId  = el.dataset.id;
            const modEl  = el.querySelector('.tm-module-content');
            if (!modEl) return;
            for (const s of state.sections) {
                for (const r of s.rows) {
                    const mod = r.modules.find(m => m.id === modId);
                    if (mod && mod.type !== 'image' && mod.type !== 'button') {
                        mod.content = modEl.innerHTML;
                    }
                }
            }
        });
    }

    // ── Frontend HTML generation ──────────────────────────────────────────────
    function generateFrontendHTML(data) {
        let html = '<div class="themator-frontend-wrapper">';
        (data.sections || []).forEach(sec => {
            const bgImg = sec.bgImage ? `background-image:url(${sec.bgImage});background-size:cover;background-position:center;` : '';
            html += `<section class="tm-front-section" style="background-color:${sec.bgColor || '#fff'};${bgImg}padding:${sec.padding || '60px 20px'};">`;
            (sec.rows || []).forEach(row => {
                html += `<div class="tm-front-row" style="display:flex;flex-wrap:wrap;max-width:1080px;margin:0 auto;">`;
                (row.modules || []).forEach(mod => {
                    const w = mod.width ? `flex:0 0 ${mod.width};` : 'flex:1;';
                    html += `<div class="tm-front-module" style="${w}padding:${mod.padding||'15px'};box-sizing:border-box;">`;
                    if (mod.type === 'image' && mod.src) {
                        html += `<img src="${mod.src}" alt="${mod.alt||''}" style="max-width:100%;height:auto;${mod.imgStyle||''}">`;
                        if (mod.caption) html += `<p style="text-align:center;font-size:13px;color:#888;">${mod.caption}</p>`;
                    } else if (mod.type === 'button') {
                        html += `<div style="text-align:${mod.align||'center'};"><a href="${mod.url||'#'}" style="display:inline-block;background:${mod.btnBg||'#8f43ee'};color:${mod.btnColor||'#fff'};padding:12px 28px;border-radius:4px;font-weight:700;text-decoration:none;">${mod.content||'Cliquez ici'}</a></div>`;
                    } else {
                        const color = mod.txtColor ? `color:${mod.txtColor};` : '';
                        const size  = mod.fontSize  ? `font-size:${mod.fontSize};` : '';
                        const align = mod.align     ? `text-align:${mod.align};` : '';
                        html += `<div style="${color}${size}${align}">${mod.content||''}</div>`;
                    }
                    html += '</div>';
                });
                html += '</div>';
            });
            html += '</section>';
        });
        html += '</div>';
        return html;
    }
});

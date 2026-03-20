document.addEventListener('DOMContentLoaded', () => {
    // ── Detect mode ───────────────────────────────────────────────────────────
    // standalone: loaded from builder-page.php (tmatorFullscreen = true)
    // overlay:    loaded from the meta box inside post.php
    const isStandalone = (typeof tmatorFullscreen !== 'undefined' && tmatorFullscreen === true);
    const launchBtn = document.getElementById('launch-themator-builder');

    // In overlay mode we need the launch button; in standalone we don't.
    if (!isStandalone && !launchBtn) return;

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
        if (isStandalone && typeof tmatorConfig !== 'undefined' && tmatorConfig.savedState) {
            state = (typeof tmatorConfig.savedState === 'string')
                ? JSON.parse(tmatorConfig.savedState)
                : tmatorConfig.savedState;
        } else {
            const raw = (typeof thematorData !== 'undefined') ? thematorData.saved_data : '';
            if (raw && raw.trim() !== '') state = JSON.parse(raw);
        }
    } catch(e) { console.warn('[Themator] parse error:', e); }

    const uid = () => 'tm' + Date.now() + Math.floor(Math.random() * 9999);

    // ── History (undo/redo) ───────────────────────────────────────────────────
    const history = [];
    let historyIdx = -1;
    function pushHistory() {
        history.splice(historyIdx + 1);
        history.push(JSON.stringify(state));
        if (history.length > 50) history.shift();
        historyIdx = history.length - 1;
    }
    function undo() { if (historyIdx > 0) { historyIdx--; state = JSON.parse(history[historyIdx]); render(); } }
    function redo() { if (historyIdx < history.length - 1) { historyIdx++; state = JSON.parse(history[historyIdx]); render(); } }
    document.addEventListener('keydown', (e) => {
        if (!isStandalone && overlay && overlay.style.display === 'none') return;
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) { e.preventDefault(); redo(); }
    });

    // ── Clipboard (copy/paste styles) ─────────────────────────────────────────
    let copiedStyles = null;

    // ── Launch / Close ────────────────────────────────────────────────────────
    if (isStandalone) {
        // Standalone: builder is always visible, no overlay toggling needed
        pushHistory();
        render();
        updateResponsiveButtons();
    } else {
        // Overlay mode (legacy: inside the post editor)
        launchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
            overlay.style.display = 'flex';
            document.body.classList.add('themator-fullscreen');
            pushHistory();
            render();
            updateResponsiveButtons();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.style.display = 'none';
                document.body.classList.remove('themator-fullscreen');
            });
        }
    }

    if (fabMainToggle) {
        fabMainToggle.addEventListener('click', () => {
            const isActive = fabMenu.classList.toggle('active');
            fabMainToggle.textContent = isActive ? '✕' : '⋯';
        });
    }

    // ── Responsive preview ────────────────────────────────────────────────────
    const previewSizes = { desktop: '100%', tablet: '768px', mobile: '375px' };
    let currentPreview = 'desktop';

    // Wire up resp + undo/redo buttons embedded in themator.php HTML
    const respBar = overlay ? overlay.querySelector('#tm-resp-bar') : null;
    const undoBtnEl = overlay ? overlay.querySelector('#tm-undo-btn') : null;
    const redoBtnEl = overlay ? overlay.querySelector('#tm-redo-btn') : null;
    if (undoBtnEl) undoBtnEl.onclick = undo;
    if (redoBtnEl) redoBtnEl.onclick = redo;
    if (respBar) {
        respBar.querySelectorAll('button[data-resp]').forEach(b => {
            b.addEventListener('click', () => setResponsiveMode(b.dataset.resp));
        });
    }

    function setResponsiveMode(mode) {
        currentPreview = mode;
        canvas.style.maxWidth = previewSizes[mode];
        canvas.style.margin = '0 auto';
        updateResponsiveButtons();
    }
    function updateResponsiveButtons() {
        respBar.querySelectorAll('button[data-resp]').forEach(b => {
            b.style.background = b.dataset.resp === currentPreview ? 'rgba(255,255,255,0.2)' : 'transparent';
        });
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    applyBtn.addEventListener('click', () => {
        syncContentFromDOM();
        const stateJson = JSON.stringify(state);
        const frontendHtml = generateFrontendHTML(state);

        if (isStandalone) {
            // Standalone mode: save via AJAX to WordPress
            const cfg = (typeof tmatorConfig !== 'undefined') ? tmatorConfig : {};
            applyBtn.textContent = '⏳ Sauvegarde...';
            applyBtn.disabled = true;
            fetch(cfg.ajaxUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action:   'themator_save',
                    nonce:    cfg.nonce,
                    post_id:  cfg.postId,
                    state:    stateJson,
                    html:     frontendHtml
                })
            })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    applyBtn.textContent = '✓ Sauvegardé !';
                    applyBtn.style.background = '#00e263';
                } else {
                    applyBtn.textContent = '✕ Erreur';
                    applyBtn.style.background = '#e74c3c';
                }
                applyBtn.disabled = false;
                setTimeout(() => {
                    applyBtn.textContent = 'Enregistrer';
                    applyBtn.style.background = '';
                }, 2000);
            })
            .catch(() => {
                applyBtn.textContent = '✕ Erreur réseau';
                applyBtn.disabled = false;
                applyBtn.style.background = '#e74c3c';
                setTimeout(() => { applyBtn.textContent = 'Enregistrer'; applyBtn.style.background = ''; }, 2000);
            });
        } else {
            // Overlay mode: write to hidden form fields and close
            if (dataInput) dataInput.value = stateJson;
            if (htmlInput) htmlInput.value = frontendHtml;
            applyBtn.textContent = '✓ Sauvegardé';
            setTimeout(() => {
                applyBtn.textContent = 'Enregistrer';
                overlay.style.display = 'none';
                document.body.classList.remove('themator-fullscreen');
            }, 1200);
        }
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

    // ── Hover delay helper: keeps pill visible for 250ms after mouseleave ─────────
    function addHoverDelay(el, pill) {
        let leaveTimer = null;
        const cancel = () => { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; } };
        el.addEventListener('mouseenter', () => { cancel(); });
        el.addEventListener('mouseleave', () => {
            cancel();
            leaveTimer = setTimeout(() => { /* CSS handles visibility - no action needed */ }, 250);
        });
        if (pill) {
            pill.addEventListener('mouseenter', cancel);
            pill.addEventListener('mouseleave', () => {
                cancel();
                // Force a re-check: if mouse left both el and pill, hide naturally via CSS
            });
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

        // Belt-and-suspenders: keep section active while hovering add-row btn or pill
        [addRowBtn, el.querySelector('.section-pill')].forEach(child => {
            if (!child) return;
            child.addEventListener('mouseenter', () => el.classList.add('tm-force-hover'));
            child.addEventListener('mouseleave', (e) => {
                if (!el.contains(e.relatedTarget)) el.classList.remove('tm-force-hover');
            });
        });

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

        // Keep row active while hovering add-module btn or row-pill
        [addModBtn, el.querySelector('.row-pill')].forEach(child => {
            if (!child) return;
            child.addEventListener('mouseenter', () => el.classList.add('tm-force-hover'));
            child.addEventListener('mouseleave', (e) => {
                if (!el.contains(e.relatedTarget)) el.classList.remove('tm-force-hover');
            });
        });

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

        const typeLabel = { text:'Texte', image:'Image', button:'Bouton', title:'Titre', cta:'CTA', divider:'Séparateur', spacer:'Espace', gallery:'Galerie', testimonial:'Témoignage', accordion:'Accordéon', video:'Vidéo' }[mod.type] || 'Module';
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
        } else if (mod.type === 'cta') {
            content.contentEditable = 'false';
            const align  = mod.align  || 'center';
            const bg     = mod.bgColor || '#f8f4ff';
            const btnBg  = mod.btnBg  || '#8f43ee';
            const btnClr = mod.btnColor|| '#ffffff';
            content.style.cssText = `background:${bg};padding:40px 30px;text-align:${align};border-radius:4px;`;
            content.innerHTML = `
                <h2 style="margin:0 0 10px;font-size:28px;color:#1a1a1a;">${mod.title || 'Titre accrocheur'}</h2>
                <p style="margin:0 0 24px;font-size:16px;color:#555;">${mod.subtitle || 'Description de votre offre'}</p>
                <a href="${mod.btnUrl || '#'}" style="display:inline-block;background:${btnBg};color:${btnClr};padding:14px 32px;border-radius:4px;font-weight:700;text-decoration:none;font-size:15px;">${mod.btnText || 'Découvrir'}</a>`;
        } else if (mod.type === 'divider') {
            content.contentEditable = 'false';
            const dc = mod.dividerColor  || '#dddddd';
            const dh = mod.dividerHeight || '2px';
            const ds = mod.dividerStyle  || 'solid';
            const dw = mod.dividerWidth  || '100%';
            content.style.cssText = `text-align:${mod.align || 'center'};padding:10px 0;`;
            content.innerHTML = `<hr style="border:none;border-top:${dh} ${ds} ${dc};width:${dw};margin:0 auto;">`;
        } else if (mod.type === 'spacer') {
            content.contentEditable = 'false';
            const h = mod.height || '40px';
            content.style.cssText = `height:${h};display:flex;align-items:center;justify-content:center;`;
            content.innerHTML = `<span style="color:#ccc;font-size:11px;border:1px dashed #ddd;padding:4px 12px;border-radius:3px;">Espace : ${h}</span>`;
        } else if (mod.type === 'gallery') {
            content.contentEditable = 'false';
            const cols = mod.columns || '3';
            const gap  = mod.gap     || '10px';
            const imgs = mod.images  || [];
            if (imgs.length > 0) {
                content.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap};padding:8px;`;
                content.innerHTML = imgs.map(src => `<img src="${src}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;">`).join('');
            } else {
                content.style.cssText = 'padding:8px;';
                content.innerHTML = `<div style="background:#f0f0f0;padding:30px;text-align:center;color:#aaa;border:2px dashed #ccc;border-radius:4px;">🖼️ Galerie : cliquez ⚙ pour ajouter des images</div>`;
            }
        } else if (mod.type === 'testimonial') {
            content.contentEditable = 'false';
            const stars = '★'.repeat(parseInt(mod.starRating || '5')) + '☆'.repeat(5 - parseInt(mod.starRating || '5'));
            content.style.cssText = 'padding:24px;background:#fafafa;border-radius:6px;border-left:4px solid #8f43ee;';
            content.innerHTML = `
                <div style="color:#f39c12;font-size:18px;margin-bottom:12px;">${stars}</div>
                <blockquote style="margin:0 0 16px;font-style:italic;font-size:15px;color:#444;line-height:1.6;">"${mod.quote || 'Témoignage client...'}"</blockquote>
                <div style="display:flex;align-items:center;gap:12px;">
                    ${mod.avatar ? `<img src="${mod.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">` : ''}
                    <div>
                        <div style="font-weight:700;font-size:14px;color:#222;">${mod.author || 'Auteur'}</div>
                        <div style="font-size:12px;color:#999;">${mod.role || ''}</div>
                    </div>
                </div>`;
        } else if (mod.type === 'accordion') {
            content.contentEditable = 'false';
            const items = mod.items || [];
            content.style.cssText = 'padding:8px;';
            content.innerHTML = items.map((item, i) => `
                <div style="border:1px solid #e0e0e0;border-radius:4px;margin-bottom:8px;overflow:hidden;">
                    <button type="button" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"
                        style="width:100%;background:#f8f8f8;border:none;padding:14px 18px;text-align:left;font-size:14px;font-weight:600;cursor:pointer;color:#333;">
                        ${item.title || 'Question ' + (i+1)}
                    </button>
                    <div style="display:${i===0?'block':'none'};padding:14px 18px;font-size:14px;color:#555;line-height:1.6;">
                        ${item.content || 'Réponse...'}
                    </div>
                </div>`).join('');
        } else if (mod.type === 'video') {
            content.contentEditable = 'false';
            content.style.cssText = 'padding:8px;';
            if (mod.url) {
                // Convert YouTube/Vimeo URLs to embed URLs
                let embedUrl = mod.url;
                const ytMatch = mod.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                const vmMatch = mod.url.match(/vimeo\.com\/(\d+)/);
                if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}${mod.autoplay ? '?autoplay=1' : ''}`;
                if (vmMatch) embedUrl = `https://player.vimeo.com/video/${vmMatch[1]}`;
                content.innerHTML = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:4px;">
                    <iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
            } else {
                content.innerHTML = `<div style="background:#1a1a1a;padding:60px;text-align:center;color:#555;border-radius:4px;">▶️ Cliquez ⚙ pour ajouter un lien vidéo YouTube ou Vimeo</div>`;
            }
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
        // Background
        if (node.bgColor && node.bgColor !== '#ffffff') el.style.backgroundColor = node.bgColor;
        if (node.bgImage) { el.style.backgroundImage = `url(${node.bgImage})`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
        // Spacing (shorthand or per-side)
        if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
            el.style.paddingTop    = node.paddingTop    || '0';
            el.style.paddingRight  = node.paddingRight  || '0';
            el.style.paddingBottom = node.paddingBottom || '0';
            el.style.paddingLeft   = node.paddingLeft   || '0';
        } else if (node.padding) { el.style.padding = node.padding; }
        if (node.marginTop || node.marginRight || node.marginBottom || node.marginLeft) {
            el.style.marginTop    = node.marginTop    || '0';
            el.style.marginRight  = node.marginRight  || 'auto';
            el.style.marginBottom = node.marginBottom || '0';
            el.style.marginLeft   = node.marginLeft   || 'auto';
        }
        // Border
        if (node.borderWidth) {
            el.style.borderStyle = node.borderStyle || 'solid';
            el.style.borderWidth = node.borderWidth;
            el.style.borderColor = node.borderColor || '#000000';
        }
        if (node.borderRadius) el.style.borderRadius = node.borderRadius;
        // Box shadow
        if (node.boxShadow) el.style.boxShadow = node.boxShadow;
        // Opacity
        if (node.opacity && node.opacity !== '1') el.style.opacity = node.opacity;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    canvas.addEventListener('click', (e) => {
        const btn = e.target.closest('[class*="tm-action-"]');
        if (!btn) return;
        const d = btn.dataset;
        if      (btn.classList.contains('tm-action-settings'))    { openSettings(d.type, d.id, d.parent || null); }
        else if (btn.classList.contains('tm-action-clone'))        { cloneNode(d.type, d.id, d.parent || null); pushHistory(); }
        else if (btn.classList.contains('tm-action-delete'))       { deleteNode(d.type, d.id, d.parent || null); pushHistory(); }
        else if (btn.classList.contains('tm-action-up'))           { moveSection(d.id, -1); pushHistory(); }
        else if (btn.classList.contains('tm-action-down'))         { moveSection(d.id, +1); pushHistory(); }
        else if (btn.classList.contains('tm-action-copy-style'))   { copyStyle(d.type, d.id, d.parent || null); }
        else if (btn.classList.contains('tm-action-paste-style'))  { pasteStyle(d.type, d.id, d.parent || null); }
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
            { type: 'text',        icon: '📝', label: 'Texte' },
            { type: 'title',       icon: '🔤', label: 'Titre' },
            { type: 'image',       icon: '🖼️', label: 'Image' },
            { type: 'button',      icon: '🔘', label: 'Bouton' },
            { type: 'cta',         icon: '📢', label: 'Call To Action' },
            { type: 'divider',     icon: '➖', label: 'Séparateur' },
            { type: 'spacer',      icon: '↕️', label: 'Espace' },
            { type: 'gallery',     icon: '🖼️', label: 'Galerie' },
            { type: 'testimonial', icon: '💬', label: 'Témoignage' },
            { type: 'accordion',   icon: '📋', label: 'Accordéon' },
            { type: 'video',       icon: '▶️', label: 'Vidéo' },
        ];

        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000000;';

        const picker = document.createElement('div');
        picker.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:6px;padding:24px;box-shadow:0 8px 40px rgba(0,0,0,0.25);z-index:1000001;min-width:320px;';
        picker.innerHTML = `<h3 style="margin:0 0 18px;font-size:15px;font-weight:700;">Choisir un module</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:420px;">
                ${types.map(t => `
                    <button type="button" data-mtype="${t.type}" style="border:2px solid #e0e0e0;border-radius:6px;padding:14px 10px;cursor:pointer;background:#fff;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .15s;">
                        <span style="font-size:24px;">${t.icon}</span>
                        <span style="font-size:11px;font-weight:600;color:#555;text-align:center;">${t.label}</span>
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

    // ── Copy/Paste styles ────────────────────────────────────────────────────
    const styleKeys = ['bgColor','bgImage','padding','paddingTop','paddingRight','paddingBottom','paddingLeft',
        'marginTop','marginRight','marginBottom','marginLeft','borderWidth','borderStyle','borderColor',
        'borderRadius','boxShadow','opacity','txtColor','fontSize','fontFamily','fontWeight',
        'lineHeight','letterSpacing'];
    function copyStyle(type, id, parentId) {
        const node = findNode(type, id, parentId);
        if (!node) return;
        copiedStyles = {};
        styleKeys.forEach(k => { if (node[k] !== undefined) copiedStyles[k] = node[k]; });
        // Brief flash
        const el = canvas.querySelector(`[data-id="${id}"]`);
        if (el) { el.style.outline = '2px solid #8f43ee'; setTimeout(() => el.style.outline = '', 700); }
    }
    function pasteStyle(type, id, parentId) {
        if (!copiedStyles) return;
        const node = findNode(type, id, parentId);
        if (!node) return;
        Object.assign(node, copiedStyles);
        pushHistory();
        render();
    }

    // ── Add / Clone / Delete ──────────────────────────────────────────────────
    function addSection() {
        state.sections.push({
            id: 'sec-' + uid(),
            bgColor: '#ffffff',
            padding: '60px 20px',
            rows: []
        });
        pushHistory();
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
                    cta:    { type: 'cta',    title: 'Titre accrocheur', subtitle: 'Sous-titre de description', btnText: 'En savoir plus', btnUrl: '#', btnBg: '#8f43ee', btnColor: '#ffffff', bgColor: '#f8f4ff', align: 'center' },
                    divider:{ type: 'divider', dividerColor: '#dddddd', dividerWidth: '100%', dividerHeight: '2px', dividerStyle: 'solid', align: 'center' },
                    spacer: { type: 'spacer', height: '40px' },
                    gallery:{ type: 'gallery', images: [], columns: '3', gap: '10px' },
                    testimonial: { type: 'testimonial', quote: 'Un excellent service, je recommande vivement !', author: 'Jean Dupont', role: 'Patient', avatar: '', starRating: '5' },
                    accordion:   { type: 'accordion', items: [ { title: 'Question 1', content: 'Réponse à la question 1...' }, { title: 'Question 2', content: 'Réponse à la question 2...' } ] },
                    video:  { type: 'video', url: '', autoplay: false, loop: false, muted: true },
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

    // ── Helper: section header ─────────────────────────────────────────────────
    function sectionHeader(label) {
        const h = document.createElement('div');
        h.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8f43ee;margin:18px 0 10px;padding-bottom:4px;border-bottom:1px solid #f0eeff;';
        h.textContent = label;
        return h;
    }

    // ── Helper: spacing row (4 inputs: top/right/bottom/left) ─────────────────
    function spacingGroup(label, prefix, node) {
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '16px';
        const lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#888;margin-bottom:8px;';
        lbl.textContent = label;
        wrap.appendChild(lbl);
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;';
        ['Top','Right','Bottom','Left'].forEach(side => {
            const col = document.createElement('div');
            const sideLbl = document.createElement('div');
            sideLbl.style.cssText = 'font-size:10px;color:#aaa;text-align:center;margin-bottom:3px;';
            sideLbl.textContent = side;
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = '0';
            inp.style.cssText = 'width:100%;padding:6px 4px;text-align:center;border:1px solid #d5d9dd;border-radius:3px;font-size:12px;box-sizing:border-box;';
            const key = prefix + side.toLowerCase().replace('bottom','Bottom').replace('right','Right').replace('left','Left');
            const realKey = prefix.toLowerCase() + side;
            const storeKey = prefix + side;
            inp.value = node[storeKey] || '';
            inp.addEventListener('input', () => { node[storeKey] = inp.value; });
            col.appendChild(sideLbl); col.appendChild(inp);
            grid.appendChild(col);
        });
        wrap.appendChild(grid);
        return wrap;
    }

    function renderModalBody(node, type, tabIdx) {
        modalBody.innerHTML = '';
        const isContent = tabIdx === 0;
        const isDesign  = tabIdx === 1;
        const isAdvanced = tabIdx === 2;

        if (isContent) {
            // ── Content tab ──────────────────────────────────────────────────
            if (type === 'section') {
                modalBody.appendChild(field('Couleur de fond', 'bgColor', node, 'color'));
                modalBody.appendChild(field('Image de fond (URL)', 'bgImage', node, 'image-picker'));
                modalBody.appendChild(field('Padding global', 'padding', node, 'text', { default: '60px 20px', placeholder: 'ex: 60px 20px' }));
            } else if (type === 'row') {
                modalBody.appendChild(field('Couleur de fond', 'bgColor', node, 'color'));
                modalBody.appendChild(field('Padding global', 'padding', node, 'text', { placeholder: 'ex: 20px 0' }));
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
                    modalBody.appendChild(field('Ouvrir dans', 'target', node, 'select', { options: [['_self','Même onglet'],['_blank','Nouvel onglet']] }));
                } else if (node.type === 'title') {
                    modalBody.appendChild(field('Niveau HTML', 'level', node, 'select', { options: [['h1','H1 — Titre principal'],['h2','H2'],['h3','H3'],['h4','H4']] }));
                    modalBody.appendChild(field('Alignement', 'align', node, 'select', { options: [['left','Gauche'],['center','Centre'],['right','Droite']] }));
                } else {
                    modalBody.appendChild(field('Contenu HTML', 'content', node, 'textarea'));
                    modalBody.appendChild(field('Alignement', 'align', node, 'select', { options: [['left','Gauche'],['center','Centre'],['right','Droite']] }));
                }
            }
        } else if (isDesign) {
            // ── Design tab (NEW) ─────────────────────────────────────────────

            // ▸ Background
            modalBody.appendChild(sectionHeader('🎨 Arrière-plan'));
            modalBody.appendChild(field('Couleur de fond', 'bgColor', node, 'color'));
            if (type !== 'module' || node.type === 'image') {
                // nothing extra
            }
            if (type === 'section') {
                modalBody.appendChild(field('Image de fond', 'bgImage', node, 'image-picker'));
            }

            // ▸ Typography (not for image modules)
            if (type === 'module' && node.type !== 'image') {
                modalBody.appendChild(sectionHeader('🔤 Typographie'));
                modalBody.appendChild(field('Famille de police', 'fontFamily', node, 'select', {
                    options: [
                        ['','Hérité'],['Arial, sans-serif','Arial'],['Georgia, serif','Georgia'],
                        ["'Times New Roman', serif",'Times New Roman'],["'Open Sans', sans-serif",'Open Sans'],
                        ["'Roboto', sans-serif",'Roboto'],["'Lato', sans-serif",'Lato'],
                        ["'Montserrat', sans-serif",'Montserrat'],["'Playfair Display', serif",'Playfair Display'],
                        ["'Raleway', sans-serif",'Raleway'],
                    ]
                }));
                modalBody.appendChild(field('Taille de police', 'fontSize', node, 'text', { placeholder: 'ex: 16px ou 1.2rem' }));
                modalBody.appendChild(field('Graisse', 'fontWeight', node, 'select', {
                    options: [['','Normal'],['300','Light (300)'],['400','Regular (400)'],['500','Medium (500)'],['600','Semi-bold (600)'],['700','Bold (700)'],['800','Extra-bold (800)'],['900','Black (900)']]
                }));
                modalBody.appendChild(field('Style', 'fontStyle', node, 'select', { options: [['','Normal'],['italic','Italique']] }));
                modalBody.appendChild(field('Hauteur de ligne', 'lineHeight', node, 'text', { placeholder: 'ex: 1.5 ou 24px' }));
                modalBody.appendChild(field('Espacement lettres', 'letterSpacing', node, 'text', { placeholder: 'ex: 0.05em' }));
                modalBody.appendChild(field('Transformation', 'textTransform', node, 'select', { options: [['','Aucune'],['uppercase','MAJUSCULES'],['lowercase','minuscules'],['capitalize','Capitalize']] }));
                if (node.type !== 'button') {
                    modalBody.appendChild(field('Couleur du texte', 'txtColor', node, 'color'));
                }
            }

            // ▸ Spacing
            modalBody.appendChild(sectionHeader('📐 Espacement'));
            modalBody.appendChild(spacingGroup('Padding', 'padding', node));
            modalBody.appendChild(spacingGroup('Margin', 'margin', node));

            // ▸ Border
            modalBody.appendChild(sectionHeader('▭ Bordure'));
            modalBody.appendChild(field('Épaisseur', 'borderWidth', node, 'text', { placeholder: 'ex: 1px ou 0 0 2px 0' }));
            modalBody.appendChild(field('Style', 'borderStyle', node, 'select', { options: [['none','Aucune'],['solid','Solide'],['dashed','Pointillés'],['dotted','Points'],['double','Double']] }));
            modalBody.appendChild(field('Couleur', 'borderColor', node, 'color'));
            modalBody.appendChild(field('Rayon (arrondi)', 'borderRadius', node, 'text', { placeholder: 'ex: 8px ou 50%' }));

            // ▸ Shadow
            modalBody.appendChild(sectionHeader('💫 Ombre'));
            // Box shadow presets
            const shadowPresets = document.createElement('div');
            shadowPresets.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;';
            [
                { label: 'Aucune',    value: '' },
                { label: 'Légère',    value: '0 2px 8px rgba(0,0,0,0.08)' },
                { label: 'Moyenne',   value: '0 4px 20px rgba(0,0,0,0.15)' },
                { label: 'Forte',     value: '0 8px 40px rgba(0,0,0,0.25)' },
                { label: 'Colorée',   value: '0 4px 20px rgba(143,67,238,0.3)' },
            ].forEach(preset => {
                const pb = document.createElement('button');
                pb.type = 'button';
                pb.textContent = preset.label;
                pb.style.cssText = 'padding:5px 10px;font-size:11px;border:1px solid #e0e0e0;border-radius:3px;cursor:pointer;background:#f9f9f9;';
                pb.onclick = () => { node.boxShadow = preset.value; shadowInp.value = preset.value; };
                shadowPresets.appendChild(pb);
            });
            modalBody.appendChild(shadowPresets);
            const shadowInp = document.createElement('input');
            shadowInp.type = 'text';
            shadowInp.placeholder = 'ex: 0 4px 20px rgba(0,0,0,0.15)';
            shadowInp.style.cssText = 'width:100%;padding:8px;border:1px solid #d5d9dd;border-radius:3px;font-size:13px;box-sizing:border-box;';
            shadowInp.value = node.boxShadow || '';
            shadowInp.addEventListener('input', () => { node.boxShadow = shadowInp.value; });
            modalBody.appendChild(shadowInp);

            // ▸ Filters
            modalBody.appendChild(sectionHeader('🔆 Filtres'));
            modalBody.appendChild(field('Opacité (0–1)', 'opacity', node, 'text', { placeholder: 'ex: 0.8', default: '1' }));
            if (type === 'module' && node.type === 'image') {
                modalBody.appendChild(field('Filtre CSS', 'imgStyle', node, 'text', { placeholder: 'ex: grayscale(100%) brightness(1.2)' }));
            }

            // ▸ Animation (Divi-style)
            modalBody.appendChild(sectionHeader('🎬 Animation'));
            const animPresets = document.createElement('div');
            animPresets.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;';
            [
                { label: '🚫 Aucune',       value: '' },
                { label: '✨ Fade In',       value: 'tm-anim-fade' },
                { label: '⬆️ Slide Haut',   value: 'tm-anim-slide-up' },
                { label: '⬅️ Slide Gauche', value: 'tm-anim-slide-left' },
                { label: '➡️ Slide Droite', value: 'tm-anim-slide-right' },
                { label: '🔍 Zoom In',       value: 'tm-anim-zoom' },
                { label: '↩️ Bounce',        value: 'tm-anim-bounce' },
                { label: '🌀 Flip',          value: 'tm-anim-flip' },
                { label: '🔄 Rotation',      value: 'tm-anim-rotate' },
            ].forEach(preset => {
                const pb = document.createElement('button');
                pb.type = 'button';
                pb.textContent = preset.label;
                const isActive = (node.animation || '') === preset.value;
                pb.style.cssText = `padding:6px 4px;font-size:11px;border:1px solid ${isActive?'#8f43ee':'#e0e0e0'};border-radius:3px;cursor:pointer;background:${isActive?'#f0eeff':'#f9f9f9'};font-weight:${isActive?'700':'400'};`;
                pb.onclick = () => {
                    node.animation = preset.value;
                    // Refresh the animation section
                    animPresets.querySelectorAll('button').forEach(b => { b.style.borderColor='#e0e0e0'; b.style.background='#f9f9f9'; b.style.fontWeight='400'; });
                    pb.style.borderColor = '#8f43ee'; pb.style.background = '#f0eeff'; pb.style.fontWeight = '700';
                };
                animPresets.appendChild(pb);
            });
            modalBody.appendChild(animPresets);
            modalBody.appendChild(field('Durée (ms)', 'animDuration', node, 'text', { placeholder: '600', default: '600' }));
            modalBody.appendChild(field('Délai (ms)', 'animDelay', node, 'text', { placeholder: '0', default: '0' }));
            modalBody.appendChild(field('Intensité (1–3)', 'animIntensity', node, 'select', { options: [['1','1 — Léger'],['2','2 — Moyen'],['3','3 — Fort']] }));

            // ── Advanced tab ─────────────────────────────────────────────────
            modalBody.appendChild(sectionHeader('🔧 CSS Personnalisé'));
            modalBody.appendChild(field('ID CSS', 'cssId', node, 'text', { placeholder: 'mon-element' }));
            modalBody.appendChild(field('Classes CSS', 'cssClass', node, 'text', { placeholder: 'ma-classe autre-classe' }));
            modalBody.appendChild(field('CSS personnalisé (Main Element)', 'customCss', node, 'textarea'));

            modalBody.appendChild(sectionHeader('👁️ Visibilité'));
            modalBody.appendChild(field('Masquer sur Desktop', 'hideDesktop', node, 'select', { options: [['','Non'],['1','Oui']] }));
            modalBody.appendChild(field('Masquer sur Tablette', 'hideTablet', node, 'select', { options: [['','Non'],['1','Oui']] }));
            modalBody.appendChild(field('Masquer sur Mobile', 'hideMobile', node, 'select', { options: [['','Non'],['1','Oui']] }));

            // Copy/Paste styles buttons
            modalBody.appendChild(sectionHeader('📋 Copier / Coller'));
            const cpRow = document.createElement('div');
            cpRow.style.cssText = 'display:flex;gap:8px;';
            const copyBtn2 = document.createElement('button');
            copyBtn2.type = 'button'; copyBtn2.textContent = '📋 Copier les styles'; 
            copyBtn2.style.cssText = 'padding:8px 14px;background:#f0f0f1;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:12px;';
            copyBtn2.onclick = () => { const n = currentEditingNode; copyStyle(n.type, n.id, n.parentId); copyBtn2.textContent = '✅ Copié !'; setTimeout(() => copyBtn2.textContent = '📋 Copier les styles', 1500); };
            const pasteBtn2 = document.createElement('button');
            pasteBtn2.type = 'button'; pasteBtn2.textContent = '📌 Coller les styles';
            pasteBtn2.style.cssText = 'padding:8px 14px;background:#f0eeff;border:1px solid #8f43ee;border-radius:3px;cursor:pointer;font-size:12px;color:#8f43ee;font-weight:600;';
            pasteBtn2.onclick = () => { const n = currentEditingNode; pasteStyle(n.type, n.id, n.parentId); modal.style.display='none'; };
            cpRow.appendChild(copyBtn2); cpRow.appendChild(pasteBtn2);
            modalBody.appendChild(cpRow);
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

    // ── Helpers: build CSS strings from node ──────────────────────────────────
    function nodeToInlineCSS(node) {
        let css = '';
        if (node.bgColor && node.bgColor !== '#ffffff') css += `background-color:${node.bgColor};`;
        if (node.bgImage) css += `background-image:url(${node.bgImage});background-size:cover;background-position:center;`;
        if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
            css += `padding:${node.paddingTop||'0'} ${node.paddingRight||'0'} ${node.paddingBottom||'0'} ${node.paddingLeft||'0'};`;
        } else if (node.padding) { css += `padding:${node.padding};`; }
        if (node.marginTop || node.marginRight || node.marginBottom || node.marginLeft) {
            css += `margin:${node.marginTop||'0'} ${node.marginRight||'auto'} ${node.marginBottom||'0'} ${node.marginLeft||'auto'};`;
        }
        if (node.borderWidth && node.borderStyle && node.borderStyle !== 'none') {
            css += `border:${node.borderWidth} ${node.borderStyle} ${node.borderColor||'#000'};`;
        }
        if (node.borderRadius) css += `border-radius:${node.borderRadius};`;
        if (node.boxShadow) css += `box-shadow:${node.boxShadow};`;
        if (node.opacity && node.opacity !== '1') css += `opacity:${node.opacity};`;
        if (node.fontFamily)    css += `font-family:${node.fontFamily};`;
        if (node.fontSize)      css += `font-size:${node.fontSize};`;
        if (node.fontWeight)    css += `font-weight:${node.fontWeight};`;
        if (node.fontStyle)     css += `font-style:${node.fontStyle};`;
        if (node.lineHeight)    css += `line-height:${node.lineHeight};`;
        if (node.letterSpacing) css += `letter-spacing:${node.letterSpacing};`;
        if (node.textTransform) css += `text-transform:${node.textTransform};`;
        if (node.txtColor)      css += `color:${node.txtColor};`;
        if (node.align)         css += `text-align:${node.align};`;
        if (node.customCss)     css += node.customCss;
        return css;
    }

    // ── Frontend HTML generation ──────────────────────────────────────────────
    function generateFrontendHTML(data) {
        let html = '<div class="themator-frontend-wrapper">';
        (data.sections || []).forEach(sec => {
            const secCss = nodeToInlineCSS(sec) || 'background-color:#fff;padding:60px 20px;';
            const secId  = sec.cssId   ? ` id="${sec.cssId}"` : '';
            const secCls = sec.cssClass ? ` ${sec.cssClass}` : '';
            const secAnim = sec.animation ? ` data-tm-animation="${sec.animation}" data-tm-duration="${sec.animDuration||600}" data-tm-delay="${sec.animDelay||0}"` : '';
            html += `<section class="tm-front-section${secCls}"${secId}${secAnim} style="${secCss}">`;
            (sec.rows || []).forEach(row => {
                const rowCss = nodeToInlineCSS(row);
                const rowId  = row.cssId   ? ` id="${row.cssId}"` : '';
                const rowCls = row.cssClass ? ` ${row.cssClass}` : '';
                const rowAnim = row.animation ? ` data-tm-animation="${row.animation}" data-tm-duration="${row.animDuration||600}" data-tm-delay="${row.animDelay||0}"` : '';
                html += `<div class="tm-front-row${rowCls}"${rowId}${rowAnim} style="display:flex;flex-wrap:wrap;max-width:1080px;margin:0 auto;${rowCss}">`;
                (row.modules || []).forEach(mod => {
                    const w      = mod.width  ? `flex:0 0 ${mod.width};` : 'flex:1;';
                    const modCss = nodeToInlineCSS(mod);
                    const modId  = mod.cssId   ? ` id="${mod.cssId}"` : '';
                    const modCls = mod.cssClass ? ` ${mod.cssClass}` : '';
                    const animCls = mod.animation ? ` ${mod.animation}` : '';
                    const animAttr = mod.animation ? ` data-tm-animation="${mod.animation}" data-tm-duration="${mod.animDuration||600}" data-tm-delay="${mod.animDelay||0}"` : '';
                    const respCls = [
                        mod.hideDesktop ? 'tm-hide-desktop' : '',
                        mod.hideTablet  ? 'tm-hide-tablet'  : '',
                        mod.hideMobile  ? 'tm-hide-mobile'  : '',
                    ].filter(Boolean).join(' ');
                    html += `<div class="tm-front-module${modCls?' '+modCls:''}${animCls}${respCls?' '+respCls:''}"${modId}${animAttr} style="${w}box-sizing:border-box;${modCss}">`;
                    if (mod.type === 'image' && mod.src) {
                        html += `<img src="${mod.src}" alt="${mod.alt||""}" style="max-width:100%;height:auto;${mod.imgStyle||""}">`;
                        if (mod.caption) html += `<p style="text-align:center;font-size:13px;color:#888;">${mod.caption}</p>`;
                    } else if (mod.type === 'button') {
                        const tgt = mod.target ? ` target="${mod.target}"` : '';
                        const btnRadius = mod.borderRadius ? `border-radius:${mod.borderRadius};` : 'border-radius:4px;';
                        html += `<div style="text-align:${mod.align||'center'};"><a href="${mod.url||'#'}"${tgt} style="display:inline-block;background:${mod.btnBg||'#8f43ee'};color:${mod.btnColor||'#fff'};padding:12px 28px;${btnRadius}font-weight:700;text-decoration:none;font-size:${mod.fontSize||'15px'};"> ${mod.content||'Cliquez ici'}</a></div>`;
                    } else if (mod.type === 'cta') {
                        const btnBg  = mod.btnBg  || '#8f43ee';
                        const btnClr = mod.btnColor|| '#ffffff';
                        html += `<div style="background:${mod.bgColor||'#f8f4ff'};padding:40px 30px;text-align:${mod.align||'center'};border-radius:4px;"><h2 style="margin:0 0 10px;font-size:28px;color:#1a1a1a;">${mod.title||''}</h2><p style="margin:0 0 24px;font-size:16px;color:#555;">${mod.subtitle||''}</p><a href="${mod.btnUrl||'#'}" style="display:inline-block;background:${btnBg};color:${btnClr};padding:14px 32px;border-radius:4px;font-weight:700;text-decoration:none;font-size:15px;">${mod.btnText||'Découvrir'}</a></div>`;
                    } else if (mod.type === 'divider') {
                        const dc = mod.dividerColor||'#ddd'; const dh = mod.dividerHeight||'2px'; const ds = mod.dividerStyle||'solid'; const dw = mod.dividerWidth||'100%';
                        html += `<div style="text-align:${mod.align||'center'};padding:10px 0;"><hr style="border:none;border-top:${dh} ${ds} ${dc};width:${dw};margin:0 auto;"></div>`;
                    } else if (mod.type === 'spacer') {
                        html += `<div style="height:${mod.height||'40px'};"></div>`;
                    } else if (mod.type === 'gallery') {
                        const cols = mod.columns||'3'; const gap = mod.gap||'10px'; const imgs = mod.images||[];
                        html += `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap};padding:8px;">${imgs.map(src=>`<img src="${src}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;">`).join('')}</div>`;
                    } else if (mod.type === 'testimonial') {
                        const stars = '★'.repeat(parseInt(mod.starRating||'5'))+'☆'.repeat(5-parseInt(mod.starRating||'5'));
                        html += `<div style="padding:24px;background:#fafafa;border-radius:6px;border-left:4px solid #8f43ee;"><div style="color:#f39c12;font-size:18px;margin-bottom:12px;">${stars}</div><blockquote style="margin:0 0 16px;font-style:italic;font-size:15px;color:#444;line-height:1.6;">&ldquo;${mod.quote||''}&rdquo;</blockquote><div style="display:flex;align-items:center;gap:12px;">${mod.avatar?`<img src="${mod.avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`:''}<div><div style="font-weight:700;font-size:14px;color:#222;">${mod.author||''}</div><div style="font-size:12px;color:#999;">${mod.role||''}</div></div></div></div>`;
                    } else if (mod.type === 'accordion') {
                        const items = mod.items||[]; let accHtml = `<div class="tm-accordion">`;
                        items.forEach((item,i) => { accHtml += `<div class="tm-accordion-item"><button class="tm-accordion-btn" onclick="var p=this.nextElementSibling;p.style.display=p.style.display==='none'?'block':'none'">${item.title||''}</button><div class="tm-accordion-body" style="display:${i===0?'block':'none'}">${item.content||''}</div></div>`; });
                        html += accHtml + `</div>`;
                    } else if (mod.type === 'video') {
                        if (mod.url) { let eu=mod.url; const yt=mod.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/); const vm=mod.url.match(/vimeo\.com\/(\d+)/); if(yt)eu=`https://www.youtube.com/embed/${yt[1]}`; if(vm)eu=`https://player.vimeo.com/video/${vm[1]}`; html+=`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${eu}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`; }
                    } else {
                        html += `<div>${mod.content||''}</div>`;
                    }
                    html += '</div>';
                });
                html += '</div>';
            });
            html += '</section>';
        });
        // Scroll-animation observer script
        html += `<script>
(function(){
    const els = document.querySelectorAll('[data-tm-animation]');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target;
                const anim = el.dataset.tmAnimation;
                const dur = el.dataset.tmDuration || 600;
                const delay = el.dataset.tmDelay || 0;
                setTimeout(() => { el.classList.add(anim, 'tm-anim-visible'); }, parseInt(delay));
                el.style.animationDuration = dur + 'ms';
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.15 });
    els.forEach(el => {
        el.classList.add('tm-anim-hidden');
        obs.observe(el);
    });
})();
<\/script>`;
        html += '</div>';
        return html;
    }
});

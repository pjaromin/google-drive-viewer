/* GDV single-file build — stable breadcrumbs + root label + hover + theming */
(function(){
  // ---------- tiny DOM helpers ----------
  function el(tag, attrs={}, text){
    const e = document.createElement(tag);
    for (const k in attrs){
      if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (text) e.textContent = text;
    return e;
  }

  // ---------- icons (inline SVG; color is via CSS currentColor) ----------
  function svg(pathD){
    const s = document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24');
    s.setAttribute('aria-hidden','true');
    s.innerHTML = `<path fill="currentColor" d="${pathD}"/>`;
    return s;
  }
  const ICON = {
    folder:  () => svg('M10 4l2 2h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h5z'),
    home:    () => svg('M12 3l9 8h-3v10h-5V15H11v6H6V11H3l9-8z'),
    pdf:     () => svg('M6 2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1v4h4'),
    sheet:   () => svg('M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 4h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z'),
    image:   () => svg('M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14h18zM7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12 6l-4-5-3 4-2-3-5 7h14z'),
    audio:   () => svg('M12 3v10.55A4 4 0 1 1 10 14V7h4V3h-2z'),
    video:   () => svg('M17 10.5V6H3v12h14v-4.5l4 4v-11l-4 4z'),
    doc:     () => svg('M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1v4h4'),
    view:    () => svg('M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z'),
    download:() => svg('M5 20h14v-2H5v2zm7-18l-5.5 6h4v6h3v-6h4L12 2z')
  };
  function iconFor(mime){
    if (!mime) return ICON.doc();
    if (mime === 'application/vnd.google-apps.folder') return ICON.folder();
    if (mime.startsWith('image/'))  return ICON.image();
    if (mime.startsWith('audio/'))  return ICON.audio();
    if (mime.startsWith('video/'))  return ICON.video();
    if (mime === 'application/pdf') return ICON.pdf();
    if (mime.includes('spreadsheet') || mime.includes('sheet')) return ICON.sheet();
    return ICON.doc();
  }

  // ---------- API ----------
  async function apiFetch(url){
    const u = (url instanceof URL) ? url : new URL(url, location.origin);
    const res = await fetch(u.toString(), {
      headers: {'X-WP-Nonce': GDV.restNonce}
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  async function apiList(folderId, pageToken=''){
    const url = new URL(GDV.rest, location.origin);
    url.searchParams.set('folderId', folderId);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    return apiFetch(url);
  }
  async function apiDebug(){ try{ return apiFetch(new URL(GDV.restDebug, location.origin)); }catch(_){ return {log:[]}; } }
  async function apiPing(){  return apiFetch(new URL(GDV.restPing,  location.origin)); }

  // ---------- UI render ----------
  function render(container, state){
    container.innerHTML = '';
    const root = el('div', {class:'gdv'});

    // Breadcrumbs
    const bar = el('div', {class:'bar'});
    (function(){
      const n = state.crumbs.length;
      for (let i=0; i<n; i++){
        const c = state.crumbs[i];
        const isLast = (i === n - 1);
        if (isLast){
          const span = el('span', {class:'crumb current'});
          if (i===0){
            const home = ICON.home();
            home.classList.add('crumb-icon');
            span.appendChild(home);
            span.appendChild(document.createTextNode(' ' + c.name));
          }else{
            span.textContent = c.name;
          }
          bar.appendChild(span);
        }else{
          const a = el('a', {href:'#', class:'crumb'}, c.name);
          a.addEventListener('click', e=>{
            e.preventDefault();
            state.nav(c.id, false, c.name);
          });
          if (i===0){
            const home = ICON.home();
            home.classList.add('crumb-icon');
            a.prepend(home);
          }
          bar.appendChild(a);
          bar.appendChild(el('span', {class:'sep'}, '›'));
        }
      }
    })();
    root.appendChild(bar);

    // Table
    const panel = el('div', {class:'panel'});
    const table = el('table');
    table.innerHTML = '<thead><tr><th>Name</th><th>Last updated</th><th>Actions</th></tr></thead>';
    const tbody = el('tbody');

    // Up one level ".."
    if (state.crumbs.length > 1){
      const tr = el('tr');
      const nameTd = el('td'); nameTd.className = 'name-cell';
      const upLink = el('a', {href:'#', class:'row-link'});
      const icon = ICON.folder(); icon.classList.add('mime','folder');
      upLink.appendChild(icon);
      upLink.appendChild(document.createTextNode('..'));
      upLink.addEventListener('click', e=>{
        e.preventDefault();
        state.crumbs.pop();
        const parent = state.crumbs[state.crumbs.length-1];
        state.nav(parent.id, false, parent.name);
      });
      nameTd.appendChild(upLink);
      tr.appendChild(nameTd);
      tr.appendChild(el('td', {}, ''));
      tr.appendChild(el('td', {}, ''));
      tbody.appendChild(tr);
    }

    // Folders
    state.folders.forEach(f=>{
      const tr = el('tr');
      const nameTd = el('td'); nameTd.className = 'name-cell';
      const link = el('a', {href:'#', class:'row-link'});
      const icon = ICON.folder(); icon.classList.add('mime','folder');
      link.appendChild(icon);
      link.appendChild(document.createTextNode(f.name));
      link.addEventListener('click', e=>{
        e.preventDefault();
        state.nav(f.id, true, f.name);
      });
      nameTd.appendChild(link);
      tr.appendChild(nameTd);
      tr.appendChild(el('td', {}, f.modified || ''));
      tr.appendChild(el('td', {}, ''));
      tbody.appendChild(tr);
    });

    // Files
    state.files.forEach(f=>{
      const tr = el('tr');
      const nameTd = el('td'); nameTd.className = 'name-cell';
      const link = el('a', {href:f.webViewLink, target:'_blank', rel:'noopener', class:'row-link'});
      const icon = iconFor(f.mimeType); icon.classList.add('mime','file');
      link.appendChild(icon);
      link.appendChild(document.createTextNode(f.name));
      nameTd.appendChild(link);
      tr.appendChild(nameTd);
      tr.appendChild(el('td', {}, f.modified || ''));
      const actions = el('td'); actions.className = 'actions';
      const viewA = el('a', {class:'icon-btn', href:f.webViewLink, target:'_blank', rel:'noopener', title:'View'}); viewA.appendChild(ICON.view());
      const dlA   = el('a', {class:'icon-btn', href:(f.webContentLink||f.webViewLink), target:'_blank', rel:'noopener', title:'Download'}); dlA.appendChild(ICON.download());
      actions.appendChild(viewA); actions.appendChild(dlA);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    panel.appendChild(table);
    root.appendChild(panel);
    container.appendChild(root);
  }

  // ---------- boot ----------
  async function boot(){
    document.querySelectorAll('.gdv-browser').forEach(async container=>{
      try{
        // quick REST nonce sanity; show debug if REST fails
        try { await apiPing(); } 
        catch (e) { const dbg = await apiDebug(); container.innerHTML = '<div style="color:red">'+(e?.message||'REST failed')+'</div>'; return; }

        // Inputs from localized script + data-attrs
        const rootId    = container.dataset.root || GDV.rootFolder;
        const rootLabel = container.dataset.rootLabel || GDV.rootLabel || 'Root';
        const theme     = container.dataset.iconTheme || GDV.iconTheme || '';
        if (theme) container.classList.add('gdv-theme-'+theme);

        const nameCache = {}; // folderId -> name (remembered on click)

        const state = {
          crumbs: [{ id: rootId, name: rootLabel }],
          folders: [],
          files: [],
          async nav(folderId, push=false, name='Folder'){
            const targetId = folderId || rootId;

            // prepare crumbs
            if (targetId === rootId){
              this.crumbs = [{ id: rootId, name: rootLabel }];
            } else if (push){
              nameCache[targetId] = name || nameCache[targetId] || 'Folder';
              this.crumbs = [...this.crumbs, { id: targetId, name: nameCache[targetId] }];
              history.pushState({ folderId: targetId }, '', '#'+targetId);
            } else {
              const label = name || nameCache[targetId] || 'Folder';
              this.crumbs = [{ id: rootId, name: rootLabel }, { id: targetId, name: label }];
            }

            // fetch + render
            const data = await apiList(targetId);
            this.folders = (data.folders||[]).map(f=>({ id:f.id, name:f.name, modified:new Date(f.modifiedTime).toLocaleString() }));
            this.files   = (data.files||[]).map(f=>({
              id:f.id, name:f.name, mimeType:f.mimeType||'',
              modified: f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : '',
              webViewLink: f.webViewLink || ('https://drive.google.com/file/d/'+f.id+'/view'),
              webContentLink: f.webContentLink || ('https://drive.google.com/uc?export=download&id='+f.id)
            }));

            render(container, this);
          }
        };

        // initial route (supports deep-link via #<folderId>)
        let start = location.hash ? location.hash.substring(1) : rootId;
        if (!start) start = rootId;
        await state.nav(start, false);

        // browser back/forward
        window.addEventListener('popstate', ()=>{
          const id = location.hash ? location.hash.substring(1) : rootId;
          state.nav(id, false);
        });
      }catch(err){
        console.error('GDV error', err);
        container.innerHTML = '<div style="color:red">'+(err?.message||'Unknown')+'</div>';
      }
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();

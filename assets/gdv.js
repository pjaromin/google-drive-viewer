(function(){
  function el(tag, attrs={}, text){ const e=document.createElement(tag);
    for(const k in attrs){ if(k==='class') e.className=attrs[k]; else e.setAttribute(k,attrs[k]); }
    if(text) e.textContent=text; return e;
  }

  // Inline SVGs (no external deps)
  function svgView(){
    const s = document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24'); s.setAttribute('aria-hidden','true');
    s.innerHTML = '<path fill="currentColor" d="M12 5c5.05 0 9.27 3.11 10.88 7.5C21.27 16.89 17.05 20 12 20S2.73 16.89 1.12 12.5C2.73 8.11 6.95 5 12 5zm0 2c-3.86 0-7.16 2.2-8.65 5.5C4.84 16.8 8.14 19 12 19s7.16-2.2 8.65-5.5C19.16 9.2 15.86 7 12 7zm0 2.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>';
    return s;
  }
  function svgDownload(){
    const s = document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24'); s.setAttribute('aria-hidden','true');
    s.innerHTML = '<path fill="currentColor" d="M5 20h14a1 1 0 0 0 0-2H5a1 1 0 1 0 0 2zm7-16a1 1 0 0 0-1 1v7.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l4-4a1 1 0 1 0-1.414-1.414L13 12.586V5a1 1 0 0 0-1-1z"/>';
    return s;
  }

  function showError(container, msg, extraLines){
    let html = '<div class="gdv" style="border:1px solid #ef4444;border-radius:10px;padding:12px;color:#991b1b;background:#fee2e2;">'
      + '<div style="font-weight:600;margin-bottom:6px;">Google Drive Viewer error</div>'
      + '<div style="white-space:pre-wrap;word-break:break-word;">'+msg+'</div>';
    if (Array.isArray(extraLines) && extraLines.length){
      html += '<hr style="border:none;border-top:1px solid #fca5a5;margin:10px 0;">'
        + '<div style="font-weight:600;margin-bottom:6px;">Recent debug</div>'
        + '<div style="max-height:180px;overflow:auto;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;font-size:12px;background:#fff;padding:8px;border:1px solid #fecaca;border-radius:8px;">'
        + extraLines.map(l=>String(l)).join('\n') + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  async function apiFetch(url){
    const r = await fetch(url.toString(), {
      credentials:'same-origin',
      headers: { 'X-WP-Nonce': GDV.restNonce }
    });
    if (!r.ok) {
      let msg = 'REST ' + r.status;
      try {
        const j = await r.json();
        if (j?.detail) msg += ' – ' + (typeof j.detail==='string' ? j.detail : JSON.stringify(j.detail));
        if (j?.url) msg += ' (url: '+ j.url +')';
      } catch(_) {
        try { msg += ' – ' + (await r.text()).slice(0,200); } catch(_e){}
      }
      throw new Error(msg);
    }
    return r.json();
  }

  async function apiList(folderId, pageToken=''){
    const url = new URL(GDV.rest);
    url.searchParams.set('folderId', folderId);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    return apiFetch(url);
  }
  async function apiDebug(){
    try { return apiFetch(new URL(GDV.restDebug)); }
    catch(e){ return { log: [] }; }
  }
  async function apiPing(){
    try { return apiFetch(new URL(GDV.restPing)); }
    catch(e){ throw e; }
  }

  function render(container,state){
    container.innerHTML='';
    const root=el('div',{class:'gdv'});

    // breadcrumbs (simple links + ›)
    const bar=el('div',{class:'bar'});
    state.crumbs.forEach((c,i)=>{
      const a=el('a',{href:'#',class:'crumb'},c.name);
      a.addEventListener('click',e=>{e.preventDefault();state.nav(c.id);});
      bar.appendChild(a);
      if(i<state.crumbs.length-1) bar.appendChild(el('span',{class:'sep'},'›'));
    });
    root.appendChild(bar);

    // table
    const panel=el('div',{class:'panel'});
    const table=el('table');
    table.innerHTML='<thead><tr><th>Name</th><th>Type</th><th>Modified</th><th>Actions</th></tr></thead>';
    const tbody=el('tbody');

    // Folders
    state.folders.forEach(f=>{
      const tr=el('tr');

      const nameTd=el('td');
      const a=el('a',{href:'#',class:'row-link'},f.name);
      a.addEventListener('click', e=>{ e.preventDefault(); state.nav(f.id,true,f.name); });
      nameTd.appendChild(a);
      tr.appendChild(nameTd);

      tr.appendChild(el('td',{},'Folder'));
      tr.appendChild(el('td',{},f.modified||''));
      tr.appendChild(el('td',{},'')); // no actions for folders
      tbody.appendChild(tr);
    });

    // Files
    state.files.forEach(f=>{
      const tr=el('tr');

      // Name links directly to preview
      const nameTd=el('td');
      const nameLink=el('a',{href:f.webViewLink,target:'_blank',rel:'noopener',class:'row-link'},f.name);
      nameTd.appendChild(nameLink);
      tr.appendChild(nameTd);

      tr.appendChild(el('td',{},'File'));
      tr.appendChild(el('td',{},f.modified||''));

      const actions=el('td');
      actions.className='actions';

      const viewA=el('a',{class:'icon-btn',href:f.webViewLink,target:'_blank',rel:'noopener',title:'View'});
      viewA.appendChild(svgView());
      const dlA=el('a',{class:'icon-btn',href:(f.webContentLink||'#'),target:'_blank',rel:'noopener',title:'Download'});
      dlA.appendChild(svgDownload());

      actions.appendChild(viewA);
      actions.appendChild(dlA);
      tr.appendChild(actions);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    panel.appendChild(table);
    root.appendChild(panel);
    container.appendChild(root);
  }

  async function boot(){
    document.querySelectorAll('.gdv-browser').forEach(async container=>{
      try{
        // REST health check first
        try { await apiPing(); }
        catch(e){ const dbg=await apiDebug(); return showError(container, 'REST health-check failed. '+(e?.message||''), dbg.log); }

        const rootId=container.dataset.root||GDV.rootFolder;
        const state={
          crumbs:[{id:rootId,name:'Root'}],folders:[],files:[],
          async nav(folderId,push=false,name='Folder'){
            const data=await apiList(folderId);
            this.folders=(data.folders||[]).map(f=>({id:f.id,name:f.name,modified:new Date(f.modifiedTime).toLocaleString()}));
            this.files=(data.files||[]).map(f=>({
              id:f.id,name:f.name,
              modified:f.modifiedTime?new Date(f.modifiedTime).toLocaleString():'',
              webViewLink:f.webViewLink||('https://drive.google.com/file/d/'+f.id+'/view'),
              webContentLink:f.webContentLink||('https://drive.google.com/uc?export=download&id='+f.id)
            }));
            if(push){ this.crumbs.push({id:folderId,name}); history.pushState({folderId},'', '#'+folderId); }
            else { const i=this.crumbs.findIndex(c=>c.id===folderId); if(i>=0) this.crumbs=this.crumbs.slice(0,i+1); }
            render(container,this);
          }
        };

        const start=location.hash?location.hash.substring(1):rootId;
        if(start!==rootId) state.crumbs.push({id:start,name:'Folder'});
        await state.nav(start);
        window.addEventListener('popstate',()=>{ const id=location.hash?location.hash.substring(1):rootId; state.nav(id); });
      }catch(err){
        const dbg = await apiDebug();
        console.error('GDV error:', err);
        showError(container, (err?.message||'Unknown'), dbg.log);
      }
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();

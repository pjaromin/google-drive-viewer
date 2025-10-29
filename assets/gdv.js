(function(){
  function el(tag, attrs={}, text){ const e=document.createElement(tag);
    for(const k in attrs){ if(k==='class') e.className=attrs[k]; else e.setAttribute(k,attrs[k]); }
    if(text) e.textContent=text; return e;
  }

  // ---- Inline SVG icons (no external deps) ----
  function svg(pathD){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24'); s.setAttribute('aria-hidden','true');
    s.innerHTML = `<path fill="currentColor" d="${pathD}"/>`; return s;
  }
  const ICON = {
    folder: () => svg('M10 4l2 2h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h5z'),
    pdf:    () => svg('M6 2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1v4h4'),
    sheet:  () => svg('M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 4h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z'),
    image:  () => svg('M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14h18zM7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12 6l-4-5-3 4-2-3-5 7h14z'),
    audio:  () => svg('M9 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-10v10l5-5-5-5z'),
    video:  () => svg('M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm14 3l6 4-6 4V9z'),
    slide:  () => svg('M3 4h18v12H3V4zm2 2v8h14V6H5zM4 18h16v2H4z'),
    doc:    () => svg('M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1v4h4'),
    view:   () => svg('M12 5c5.05 0 9.27 3.11 10.88 7.5C21.27 16.89 17.05 20 12 20S2.73 16.89 1.12 12.5C2.73 8.11 6.95 5 12 5zm0 2c-3.86 0-7.16 2.2-8.65 5.5C4.84 16.8 8.14 19 12 19s7.16-2.2 8.65-5.5C19.16 9.2 15.86 7 12 7zm0 2.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z'),
    download:() => svg('M5 20h14a1 1 0 0 0 0-2H5a1 1 0 1 0 0 2zm7-16a1 1 0 0 0-1 1v7.586l-2.293-2.293a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l4-4a1 1 0 1 0-1.414-1.414L13 12.586V5a1 1 0 0 0-1-1z')
  };

  function iconFor(mime){
    if (!mime) return ICON.doc();
    if (mime === 'application/vnd.google-apps.folder') return ICON.folder();
    if (mime.startsWith('image/'))  return ICON.image();
    if (mime.startsWith('audio/'))  return ICON.audio();
    if (mime.startsWith('video/'))  return ICON.video();
    if (mime === 'application/pdf') return ICON.pdf();
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') return ICON.sheet();
    if (mime.includes('presentation')) return ICON.slide();
    return ICON.doc();
  }

  async function apiFetch(url){
    const r = await fetch(url.toString(), {credentials:'same-origin', headers:{'X-WP-Nonce': GDV.restNonce}});
    if (!r.ok){
      let msg = 'REST ' + r.status;
      try { const j=await r.json(); if(j?.detail) msg+=' – '+(typeof j.detail==='string'?j.detail:JSON.stringify(j.detail)); }
      catch(_){ try{ msg+=' – '+(await r.text()).slice(0,200);}catch(_e){} }
      throw new Error(msg);
    }
    return r.json();
  }

  async function apiList(folderId, pageToken=''){
    const url = new URL(GDV.rest);
    url.searchParams.set('folderId', folderId);
    if(pageToken) url.searchParams.set('pageToken', pageToken);
    return apiFetch(url);
  }

  async function apiDebug(){ try{return apiFetch(new URL(GDV.restDebug));}catch(e){return {log:[]};} }
  async function apiPing(){ try{return apiFetch(new URL(GDV.restPing));}catch(e){throw e;} }

  function render(container,state){
    container.innerHTML='';
    const root=el('div',{class:'gdv'});

    // breadcrumbs
    const bar=el('div',{class:'bar'});
    state.crumbs.forEach((c,i)=>{
      const a=el('a',{href:'#',class:'crumb'},c.name);
      a.addEventListener('click',e=>{e.preventDefault();state.nav(c.id,false);});
      bar.appendChild(a);
      if(i<state.crumbs.length-1) bar.appendChild(el('span',{class:'sep'},'›'));
    });
    root.appendChild(bar);

    // table
    const panel=el('div',{class:'panel'});
    const table=el('table');
    table.innerHTML='<thead><tr><th>Name</th><th>Last updated</th><th>Actions</th></tr></thead>';
    const tbody=el('tbody');

    // add '..' up-directory entry
    if(state.crumbs.length>1){
      const tr=el('tr');
      const nameTd=el('td'); nameTd.className='name-cell';
      const icon=ICON.folder(); icon.classList.add('mime');
      const up=el('a',{href:'#',class:'row-link'},'..');
      up.addEventListener('click',e=>{
        e.preventDefault();
        state.crumbs.pop();
        const parent=state.crumbs[state.crumbs.length-1];
        state.nav(parent.id,false);
      });
      nameTd.appendChild(icon); nameTd.appendChild(up);
      tr.appendChild(nameTd);
      tr.appendChild(el('td',{},'')); // date empty
      tr.appendChild(el('td',{},'')); // actions empty
      tbody.appendChild(tr);
    }

    // Folders
    state.folders.forEach(f=>{
      const tr=el('tr');
      const nameTd=el('td'); nameTd.className='name-cell';
      const icon=iconFor('application/vnd.google-apps.folder'); icon.classList.add('mime');
      const a=el('a',{href:'#',class:'row-link'},f.name);
      a.addEventListener('click', e=>{ e.preventDefault(); state.nav(f.id,true,f.name); });
      nameTd.appendChild(icon); nameTd.appendChild(a);
      tr.appendChild(nameTd);
      tr.appendChild(el('td',{},f.modified||''));
      tr.appendChild(el('td',{},'')); 
      tbody.appendChild(tr);
    });

    // Files
    state.files.forEach(f=>{
      const tr=el('tr');
      const nameTd=el('td'); nameTd.className='name-cell';
      const icon=iconFor(f.mimeType); icon.classList.add('mime');
      const nameLink=el('a',{href:f.webViewLink,target:'_blank',rel:'noopener',class:'row-link'},f.name);
      nameTd.appendChild(icon); nameTd.appendChild(nameLink);
      tr.appendChild(nameTd);
      tr.appendChild(el('td',{},f.modified||''));
      const actions=el('td'); actions.className='actions';
      const viewA=el('a',{class:'icon-btn',href:f.webViewLink,target:'_blank',rel:'noopener',title:'View'}); viewA.appendChild(ICON.view());
      const dlA=el('a',{class:'icon-btn',href:(f.webContentLink||'#'),target:'_blank',rel:'noopener',title:'Download'}); dlA.appendChild(ICON.download());
      actions.appendChild(viewA); actions.appendChild(dlA);
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
        try{await apiPing();}catch(e){const dbg=await apiDebug();return container.innerHTML='<div style="color:red">'+(e?.message||'REST failed')+'</div>'; }

        const rootId=container.dataset.root||GDV.rootFolder;
        const state={
          crumbs:[{id:rootId,name:'Root'}],folders:[],files:[],
          async nav(folderId,push=false,name='Folder'){
            const data=await apiList(folderId);
            this.folders=(data.folders||[]).map(f=>({id:f.id,name:f.name,modified:new Date(f.modifiedTime).toLocaleString()}));
            this.files=(data.files||[]).map(f=>({
              id:f.id,name:f.name,mimeType:f.mimeType||'',
              modified:f.modifiedTime?new Date(f.modifiedTime).toLocaleString():'',
              webViewLink:f.webViewLink||('https://drive.google.com/file/d/'+f.id+'/view'),
              webContentLink:f.webContentLink||('https://drive.google.com/uc?export=download&id='+f.id)
            }));
            if(push){ this.crumbs.push({id:folderId,name}); history.pushState({folderId},'', '#'+folderId); }
            render(container,this);
          }
        };
        const start=location.hash?location.hash.substring(1):rootId;
        if(start!==rootId) state.crumbs.push({id:start,name:'Folder'});
        await state.nav(start);
        window.addEventListener('popstate',()=>{ const id=location.hash?location.hash.substring(1):rootId; state.nav(id); });
      }catch(err){ console.error('GDV error',err); container.innerHTML='<div style="color:red">'+(err?.message||'Unknown')+'</div>'; }
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();

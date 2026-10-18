import { validateNoticeText } from './announcements.js';
import { validateUploadFile, attachmentLinks } from './attachments.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createAdminEditor(backend,onPublished) {
  let signedIn=false,busy=false,items=[],editingId=null,pendingDelete=null;
  let message='',error='',draft={title:'',body:'',date:''};
  let selectedFile=null,preview='',originalAttachment=null,revision=null;
  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    preview=''; selectedFile=null;
  }
  function resetDraft() {
    clearFile(); editingId=null; pendingDelete=null; originalAttachment=null; revision=null; draft={title:'',body:'',date:''};
  }
  async function discardFile() {
    if (selectedFile) await backend.discardUpload(selectedFile);
    clearFile();
  }
  function fileControls() {
    const current=draft.attachment;
    return `<label for="notice-file">Lampiran <span>(pilihan)</span></label><input id="notice-file" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" ${busy||!backend.supportsAttachments?'disabled':''}><p class="admin-hint">Satu fail JPG, PNG atau PDF. Maksimum 5 MB. Teks boleh dikosongkan jika ada lampiran.</p>${!backend.supportsAttachments?'<p class="admin-hint">Perkhidmatan muat naik Google Drive belum disambungkan.</p>':''}${selectedFile?`<div class="selected-attachment">${preview?`<img class="selected-preview" src="${escape(preview)}" alt="Pratonton fail dipilih">`:''}<span>${escape(selectedFile.name)}<small>${(selectedFile.size/1024/1024).toFixed(2)} MB · Belum diterbitkan</small></span><button class="secondary-button" id="file-clear" type="button" ${busy?'disabled':''}>Buang fail dipilih</button></div>`:current?`<div class="selected-attachment"><a href="${escape(attachmentLinks(current).view)}" target="_blank" rel="noopener noreferrer">${escape(current.name)}</a><button class="secondary-button" id="file-remove" type="button" ${busy||!backend.supportsAttachments?'disabled':''}>Buang lampiran</button></div>`:''}`;
  }
  function paint() {
    const root=document.querySelector('#admin-panel');
    if (!root) return;
    if (!backend) {
      root.innerHTML='<div class="admin-empty"><h2>Editor belum disambungkan</h2><p>Sambungan Firebase perlu dilengkapkan sebelum pentadbir boleh menerbitkan pengumuman.</p><a class="primary-button" href="https://github.com/vasfplhsm/FPL-HSM-Hub/blob/main/docs/firebase-setup.md" target="_blank" rel="noopener noreferrer">Panduan persediaan pentadbir</a></div>';
      return;
    }
    const status=`<div class="admin-feedback" role="status" aria-live="polite">${escape(error||message)}</div>`;
    if (!signedIn) {
      root.innerHTML=`<div class="admin-login"><h2>Log masuk pentadbir</h2><p>Hanya akaun yang diberi kebenaran pentadbir boleh menerbitkan atau mengubah pengumuman.</p>${status}<form id="admin-login"><label for="admin-email">E-mel</label><input id="admin-email" name="email" type="email" autocomplete="username" required ${busy?'disabled':''}><label for="admin-password">Kata laluan</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required ${busy?'disabled':''}><button class="primary-button" type="submit" ${busy?'disabled':''}>${busy?'Mengesahkan akses…':'Log masuk'}</button></form></div>`;
      root.querySelector('form').addEventListener('submit',async event=>{
        event.preventDefault(); if (busy) return;
        const form=new FormData(event.currentTarget);
        busy=true; error=''; message=''; paint();
        try {
          await backend.signIn(String(form.get('email')).trim(),String(form.get('password'))); signedIn=true;
          try { items=await backend.listAnnouncements(); } catch { error='Senarai pengumuman tidak dapat dimuatkan. Sila cuba semula.'; }
        } catch { backend.signOut(); error='Log masuk gagal atau akaun ini tidak mempunyai kebenaran pentadbir.'; }
        finally { busy=false; paint(); }
      });
      return;
    }
    root.innerHTML=`<div class="admin-toolbar"><div><span class="eyebrow">AKSES PENTADBIR</span><h2>Urus pengumuman</h2></div><button class="secondary-button" id="admin-signout" ${busy?'disabled':''}>Log keluar</button></div>${status}<div class="admin-layout"><section class="admin-compose"><h3>${editingId?'Sunting pengumuman':'Pengumuman baharu'}</h3><form id="announcement-form"><label for="notice-title">Tajuk</label><input id="notice-title" name="title" maxlength="160" required value="${escape(draft.title)}" ${busy?'disabled':''}><label for="notice-date">Tarikh <span>(pilihan)</span></label><input id="notice-date" name="date" type="date" value="${escape(draft.date)}" ${busy?'disabled':''}><label for="notice-body">Pengumuman</label><textarea id="notice-body" name="body" rows="8" maxlength="8000" ${selectedFile||draft.attachment?'':'required'} ${busy?'disabled':''}>${escape(draft.body)}</textarea>${fileControls()}<p class="admin-hint">Pengumuman dan lampiran yang diterbitkan boleh dibaca oleh semua pelawat. Jangan masukkan maklumat sulit.</p><div class="admin-actions"><button class="primary-button" type="submit" ${busy?'disabled':''}>${busy?selectedFile?'Muat naik & menyimpan…':'Menyimpan…':editingId?'Simpan perubahan':'Terbitkan pengumuman'}</button><button class="secondary-button" id="notice-cancel" type="button" ${busy?'disabled':''}>${editingId?'Batal suntingan':'Kosongkan'}</button></div></form></section><section class="admin-list"><div class="admin-list-heading"><h3>Pengumuman diterbitkan</h3><button class="secondary-button" id="notice-refresh" ${busy?'disabled':''}>Muat semula</button></div>${items.length?items.map(item=>`<article class="admin-notice"><h4>${escape(item.title)}</h4><p>${escape(item.date||'Tanpa tarikh')}${item.attachment?` · ${escape(item.attachment.name)}`:''}</p><div class="admin-actions"><button class="secondary-button" data-edit="${escape(item.id)}" ${busy?'disabled':''}>Sunting</button><button class="secondary-button danger-button" data-delete="${escape(item.id)}" ${busy?'disabled':''}>Padam</button></div>${pendingDelete===item.id?`<div class="delete-confirm"><p>Padam pengumuman ini dan lampirannya? Tindakan ini tidak boleh dibatalkan.</p><button class="secondary-button danger-button" data-confirm="${escape(item.id)}" ${busy?'disabled':''}>Ya, padam pengumuman</button><button class="secondary-button" id="delete-cancel" ${busy?'disabled':''}>Batal</button></div>`:''}</article>`).join(''):'<p>Belum ada pengumuman diterbitkan.</p>'}</section></div>`;
    const capture=()=>{
      const form=new FormData(root.querySelector('#announcement-form'));
      draft={...draft,title:String(form.get('title')),body:String(form.get('body')),date:String(form.get('date'))};
    };
    root.querySelector('#announcement-form').addEventListener('input',capture);
    root.querySelector('#notice-file').addEventListener('change',async event=>{
      const file=event.currentTarget.files[0]; if (!file||busy) return;
      capture(); busy=true; error=''; message=''; paint();
      try {
        const metadata=await validateUploadFile(file);
        await discardFile(); selectedFile=file;
        if (metadata.contentType.startsWith('image/')) preview=URL.createObjectURL(file);
      } catch (err) { error=err.message; }
      finally { busy=false; paint(); }
    });
    root.querySelector('#file-clear')?.addEventListener('click',async()=>{
      if (busy) return; busy=true; error=''; paint();
      try { await discardFile(); } catch { error='Fail sementara belum dapat dipadam. Sila cuba semula.'; }
      finally { busy=false; paint(); }
    });
    root.querySelector('#file-remove')?.addEventListener('click',()=>{draft.attachment=null;paint();});
    root.querySelector('#announcement-form').addEventListener('submit',async event=>{
      event.preventDefault(); if (busy) return; capture();
      try { draft={...draft,...validateNoticeText(draft,Boolean(selectedFile||draft.attachment))}; }
      catch { error='Sila semak tajuk, tarikh dan teks atau lampiran pengumuman.';paint();return; }
      busy=true; error=''; message=''; paint();
      try {
        const result=await backend.saveAnnouncement(editingId,draft,selectedFile,{previousAttachment:originalAttachment,revision});
        resetDraft(); message='Pengumuman berjaya diterbitkan.'+(result?.warning?' '+result.warning:'');
        await onPublished();
        try { items=await backend.listAnnouncements(); } catch { error='Pengumuman disimpan, tetapi senarai tidak dapat dimuatkan. Tekan Muat semula.'; }
      } catch { error='Pengumuman tidak dapat disimpan. Semak sambungan, perkhidmatan muat naik dan kebenaran pentadbir sebelum mencuba semula.'; }
      finally { busy=false;paint(); }
    });
    root.querySelector('#notice-cancel').addEventListener('click',async()=>{
      if (busy) return; busy=true;error='';message='';paint();
      try { await discardFile();resetDraft(); } catch { error='Fail sementara belum dapat dipadam. Sila cuba semula.'; }
      finally { busy=false;paint(); }
    });
    root.querySelector('#admin-signout').addEventListener('click',async()=>{
      if (busy) return; busy=true;paint();
      try { await discardFile(); } catch { /* A private interrupted upload can be removed from the owner's folder. */ }
      backend.signOut();signedIn=false;items=[];resetDraft();message='Anda telah log keluar.';error='';busy=false;paint();
    });
    root.querySelector('#notice-refresh').addEventListener('click',async()=>{
      busy=true;error='';message='';paint();
      try { items=await backend.listAnnouncements(); } catch { error='Senarai pengumuman tidak dapat dimuatkan.'; }
      finally { busy=false;paint(); }
    });
    root.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',async()=>{
      const item=items.find(item=>item.id===button.dataset.edit); if (!item||busy) return;
      busy=true;error='';message='';paint();
      try {
        await discardFile();editingId=item.id;draft={title:item.title,body:item.body,date:item.date,attachment:item.attachment||null};originalAttachment=item.attachment||null;revision=item.revision||null;pendingDelete=null;
      } catch { error='Fail sementara belum dapat dipadam. Sila cuba semula.'; }
      finally { busy=false;paint();document.querySelector('#notice-title')?.focus(); }
    }));
    root.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>{pendingDelete=button.dataset.delete;paint();}));
    root.querySelector('#delete-cancel')?.addEventListener('click',()=>{pendingDelete=null;paint();});
    root.querySelector('[data-confirm]')?.addEventListener('click',async event=>{
      if (busy) return;
      const id=event.currentTarget.dataset.confirm,item=items.find(item=>item.id===id);
      busy=true;error='';message='';paint();
      try {
        if (editingId===id) await discardFile();
        const result=await backend.deleteAnnouncement(id,{attachment:item?.attachment,revision:item?.revision});
        if (editingId===id) resetDraft();pendingDelete=null;message='Pengumuman telah dipadam.'+(result?.warning?' '+result.warning:'');
        await onPublished();
        try { items=await backend.listAnnouncements(); } catch { error='Pengumuman dipadam, tetapi senarai tidak dapat dimuatkan. Tekan Muat semula.'; }
      } catch { error='Pengumuman tidak dapat dipadam. Semak sambungan dan kebenaran pentadbir.'; }
      finally { busy=false;paint(); }
    });
  }
  return {render:paint};
}

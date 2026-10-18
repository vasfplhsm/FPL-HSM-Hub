import { validateAnnouncements } from './announcements.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createAdminEditor(backend, onPublished) {
  let signedIn = false, busy = false, items = [], editingId = null, pendingDelete = null;
  let message = '', error = '', draft = {title:'',body:'',date:''};
  const resetDraft = () => { editingId = null; pendingDelete = null; draft = {title:'',body:'',date:''}; };
  function paint() {
    const root = document.querySelector('#admin-panel');
    if (!root) return;
    if (!backend) {
      root.innerHTML = '<div class="admin-empty"><h2>Editor belum disambungkan</h2><p>Sambungan Firebase perlu dilengkapkan sebelum pentadbir boleh menerbitkan pengumuman.</p><a class="primary-button" href="https://github.com/vasfplhsm/FPL-HSM-Hub/blob/main/docs/firebase-setup.md" target="_blank" rel="noopener noreferrer">Panduan persediaan pentadbir</a></div>';
      return;
    }
    const status = `<div class="admin-feedback" role="status" aria-live="polite">${escape(error || message)}</div>`;
    if (!signedIn) {
      root.innerHTML = `<div class="admin-login"><h2>Log masuk pentadbir</h2><p>Hanya akaun yang diberi kebenaran pentadbir boleh menerbitkan atau mengubah pengumuman.</p>${status}<form id="admin-login"><label for="admin-email">E-mel</label><input id="admin-email" name="email" type="email" autocomplete="username" required ${busy?'disabled':''}><label for="admin-password">Kata laluan</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required ${busy?'disabled':''}><button class="primary-button" type="submit" ${busy?'disabled':''}>${busy?'Mengesahkan akses…':'Log masuk'}</button></form></div>`;
      root.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        busy = true; error = ''; message = ''; paint();
        try {
          await backend.signIn(String(form.get('email')).trim(), String(form.get('password')));
          signedIn = true;
          try { items = await backend.listAnnouncements(); }
          catch { error = 'Senarai pengumuman tidak dapat dimuatkan. Sila cuba semula.'; }
        } catch {
          backend.signOut();
          error = 'Log masuk gagal atau akaun ini tidak mempunyai kebenaran pentadbir.';
        } finally { busy = false; paint(); }
      });
      return;
    }
    root.innerHTML = `<div class="admin-toolbar"><div><span class="eyebrow">AKSES PENTADBIR</span><h2>Urus pengumuman</h2></div><button class="secondary-button" id="admin-signout" ${busy?'disabled':''}>Log keluar</button></div>${status}
      <div class="admin-layout"><section class="admin-compose"><h3>${editingId?'Sunting pengumuman':'Pengumuman baharu'}</h3><form id="announcement-form"><label for="notice-title">Tajuk</label><input id="notice-title" name="title" maxlength="160" required value="${escape(draft.title)}" ${busy?'disabled':''}><label for="notice-date">Tarikh <span>(pilihan)</span></label><input id="notice-date" name="date" type="date" value="${escape(draft.date)}" ${busy?'disabled':''}><label for="notice-body">Pengumuman</label><textarea id="notice-body" name="body" rows="8" maxlength="8000" required ${busy?'disabled':''}>${escape(draft.body)}</textarea><p class="admin-hint">Pengumuman yang diterbitkan boleh dibaca oleh semua pelawat. Jangan masukkan maklumat sulit.</p><div class="admin-actions"><button class="primary-button" type="submit" ${busy?'disabled':''}>${busy?'Menyimpan…':editingId?'Simpan perubahan':'Terbitkan pengumuman'}</button><button class="secondary-button" id="notice-cancel" type="button" ${busy?'disabled':''}>${editingId?'Batal suntingan':'Kosongkan'}</button></div></form></section>
      <section class="admin-list"><div class="admin-list-heading"><h3>Pengumuman diterbitkan</h3><button class="secondary-button" id="notice-refresh" ${busy?'disabled':''}>Muat semula</button></div>${items.length?items.map(item=>`<article class="admin-notice"><h4>${escape(item.title)}</h4><p>${escape(item.date || 'Tanpa tarikh')}</p><div class="admin-actions"><button class="secondary-button" data-edit="${escape(item.id)}" ${busy?'disabled':''}>Sunting</button><button class="secondary-button danger-button" data-delete="${escape(item.id)}" ${busy?'disabled':''}>Padam</button></div>${pendingDelete===item.id?`<div class="delete-confirm"><p>Padam pengumuman ini? Tindakan ini tidak boleh dibatalkan.</p><button class="secondary-button danger-button" data-confirm="${escape(item.id)}" ${busy?'disabled':''}>Ya, padam pengumuman</button><button class="secondary-button" id="delete-cancel" ${busy?'disabled':''}>Batal</button></div>`:''}</article>`).join(''):'<p>Belum ada pengumuman diterbitkan.</p>'}</section></div>`;
    root.querySelector('#admin-signout').addEventListener('click', () => {
      backend.signOut(); signedIn = false; items = []; resetDraft(); message = 'Anda telah log keluar.'; error = ''; paint();
    });
    const capture = () => {
      const form = new FormData(root.querySelector('#announcement-form'));
      draft = {title:String(form.get('title')),body:String(form.get('body')),date:String(form.get('date'))};
    };
    root.querySelector('#announcement-form').addEventListener('input', capture);
    root.querySelector('#announcement-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      capture();
      try { draft = validateAnnouncements({announcements:[draft]})[0]; }
      catch { error = 'Sila semak tajuk, tarikh dan teks pengumuman.'; paint(); return; }
      busy = true; error = ''; message = ''; paint();
      try {
        await backend.saveAnnouncement(editingId, draft);
        resetDraft(); message = 'Pengumuman berjaya diterbitkan.';
        await onPublished();
        try { items = await backend.listAnnouncements(); }
        catch { error = 'Pengumuman disimpan, tetapi senarai tidak dapat dimuatkan. Tekan Muat semula.'; }
      } catch { error = 'Pengumuman tidak dapat disimpan. Semak sambungan dan kebenaran pentadbir sebelum mencuba semula.'; }
      finally { busy = false; paint(); }
    });
    root.querySelector('#notice-cancel').addEventListener('click', () => { resetDraft(); error = ''; message = ''; paint(); });
    root.querySelector('#notice-refresh').addEventListener('click', async () => {
      busy = true; error = ''; message = ''; paint();
      try { items = await backend.listAnnouncements(); }
      catch { error = 'Senarai pengumuman tidak dapat dimuatkan.'; }
      finally { busy = false; paint(); }
    });
    root.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => {
      const item = items.find(item => item.id === button.dataset.edit);
      if (!item) return;
      editingId = item.id; draft = {title:item.title,body:item.body,date:item.date}; pendingDelete = null; error = ''; message = ''; paint();
      document.querySelector('#notice-title')?.focus();
    }));
    root.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => { pendingDelete = button.dataset.delete; paint(); }));
    root.querySelector('#delete-cancel')?.addEventListener('click', () => { pendingDelete = null; paint(); });
    root.querySelector('[data-confirm]')?.addEventListener('click', async event => {
      if (busy) return;
      const id = event.currentTarget.dataset.confirm;
      busy = true; error = ''; message = ''; paint();
      try {
        await backend.deleteAnnouncement(id);
        if (editingId === id) resetDraft();
        pendingDelete = null; message = 'Pengumuman telah dipadam.';
        await onPublished();
        try { items = await backend.listAnnouncements(); }
        catch { error = 'Pengumuman dipadam, tetapi senarai tidak dapat dimuatkan. Tekan Muat semula.'; }
      } catch { error = 'Pengumuman tidak dapat dipadam. Semak sambungan dan kebenaran pentadbir.'; }
      finally { busy = false; paint(); }
    });
  }
  return { render:paint };
}

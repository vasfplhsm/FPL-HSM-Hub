import { icon } from './icons.js';
import { validateAnnouncements } from './announcements.js';
import { createAnnouncementBackend } from './announcement-backend.js';
import { createAdminEditor } from './admin.js';
import { attachmentLinks } from './attachments.js';

const modules = {
  planner: { short: 'Planner Cuti', category: 'PENGURUSAN STAF', description: 'Rancang cuti, urus permohonan dan semak jadual pasukan anda.', features: ['Hantar & batal cuti / off', 'Ringkasan bulanan & mingguan', 'Pengesahan passkey staf'], note: 'Permohonan, pembatalan, passkey dan peraturan tempahan kekal di aplikasi Planner asal.' },
  myubat: { short: 'Carian MyUbat', category: 'PERKHIDMATAN PESAKIT', description: 'Cari nombor rujukan untuk Drive Through, Park & Take dan Pos Ubat.', features: ['Carian nama atau MRN', 'Rujukan & status pengambilan', 'Catatan bekalan ubat'], note: 'Carian dan kemas kini rekod hanya boleh dilakukan dalam aplikasi asal yang dibenarkan. Hub tidak menerima atau menyimpan maklumat pesakit.' },
  katalog: { short: 'Katalog Ubat', category: 'RUJUKAN FARMASI', description: 'Akses maklumat ubat, lokasi simpanan dan rujukan formulari setempat.', features: ['Carian ubat & penapis kategori', 'Lokasi, kuota & persediaan', 'Indikasi & dos daripada sumber asal'], note: 'Maklumat indikasi dan dos mesti dirujuk daripada katalog rasmi. Hub tidak menjana cadangan rawatan atau maklumat dos.' },
  formulary: { short: 'Formulari HSM', category: 'RUJUKAN FORMULARI', description: 'Buka aplikasi Formulari HSM sebagai rujukan tambahan dalam urusan farmasi.', features: ['Pautan ke Formulari HSM', 'Rujukan melalui aplikasi asal', 'Dibuka dalam tab baharu'], note: 'Sila rujuk sumber dan tarikh kemas kini di aplikasi Formulari HSM. Hub tidak menyalin atau menjana maklumat ubat.' },
  farmasi: { short: 'Portal Farmasi', category: 'PORTAL FARMASI', description: 'Akses laman Farmasi HSM versi 2026 melalui satu pusat pautan yang mudah.', features: ['Laman Farmasi HSM versi 2026', 'Sumber di portal asal', 'Dibuka dalam tab baharu'], note: 'Pautan ini membuka laman Farmasi HSM yang diberikan. Kandungan dan kemas kini dikendalikan di portal asal.' }
};
let config;
let backend, admin;
let announcements = { status: 'loading', items: [] };
const main = document.querySelector('main');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const badge = module => `<span class="status ${module.url ? 'configured' : ''}"><span></span>${module.url ? 'Pautan tersedia' : 'Belum disambungkan'}</span>`;
const ids = Object.keys(modules);

function moduleLink(id) {
  const url = config.modules[id].url;
  return url ? `href="${escape(url)}" target="_blank" rel="noopener noreferrer"` : `href="#${id}"`;
}

function navigation() {
  document.querySelector('#navigation').innerHTML = [
    ['dashboard', 'Laman Utama'], ...ids.map(id => [id, modules[id].short])
  ].map(([id, title]) => {
    const external = id !== 'dashboard' && config.modules[id].url;
    const label = `${title}${external ? ' (tab baharu)' : ''}`;
    return `<a ${id === 'dashboard' ? 'href="#dashboard"' : moduleLink(id)} data-route="${id}" aria-label="${escape(label)}" title="${escape(label)}">${icon(id)}<span>${escape(title)}</span><span class="nav-arrow">${external ? icon('external') : '›'}</span></a>`;
  }).join('');
}

function dashboard() {
  return `<div class="breadcrumb">Ruang kerja <span>/</span> Laman Utama</div>
    <section class="welcome"><div><div class="welcome-kicker"><span></span> SATU HUB, SEMUA KEPERLUAN</div><h1>Selamat datang ke<br><span>${escape(config.title)}</span></h1><p>Pusat akses aplikasi ${escape(config.department)}.<br>Lebih tersusun. Lebih mudah. Bersama untuk perkhidmatan yang lebih baik.</p></div><div class="welcome-side"><img class="welcome-logo" src="assets/fpl-hsm-logo.png" alt="Farmasi Pesakit Luar, Hospital Seri Manjung" width="124" height="124"><div class="date-panel">${icon('clock')}<span id="date"></span><strong id="time"></strong><small>Waktu Malaysia · GMT+8</small></div></div></section>
    <section class="announcement-board" aria-labelledby="announcements-title"><div class="announcement-heading"><span class="module-icon">${icon('announcement')}</span><div><span class="eyebrow">MAKLUMAN FARMASI</span><h2 id="announcements-title">Papan pengumuman</h2><p>Makluman terkini untuk warga Farmasi Pesakit Luar.</p></div></div><div id="announcements-content" aria-live="polite" aria-busy="true"></div></section>
    <div class="privacy-note">${icon('shield')}<p><strong>Privasi dalam setiap urusan.</strong> Hub ini tidak menyimpan rekod pesakit. Pengesahan dan kebenaran akses dikendalikan oleh setiap aplikasi asal.</p></div>`;
}

function paintAnnouncements() {
  const content = document.querySelector('#announcements-content');
  if (!content) return;
  content.setAttribute('aria-busy', String(announcements.status === 'loading'));
  if (announcements.status === 'loading') {
    content.innerHTML = '<div class="announcement-state" role="status">Memuatkan pengumuman…</div>';
  } else if (announcements.status === 'error') {
    content.innerHTML = '<div class="announcement-state" role="alert"><h3>Pengumuman tidak dapat dimuatkan</h3><p>Sila cuba semula sebentar lagi.</p><button class="primary-button" id="announcements-retry" type="button">Cuba semula</button></div>';
    content.querySelector('button').addEventListener('click', loadAnnouncements);
  } else if (!announcements.items.length) {
    content.innerHTML = `<div class="announcement-state">${icon('announcement')}<h3>Belum ada pengumuman</h3><p>Makluman baharu akan dipaparkan di sini.</p></div>`;
  } else {
    content.innerHTML = announcements.items.map(item => {
      const date = item.date ? new Intl.DateTimeFormat('ms-MY', {timeZone:'Asia/Kuala_Lumpur', day:'numeric', month:'long', year:'numeric'}).format(new Date(item.date + 'T00:00:00+08:00')) : '';
      const attachment=item.attachment;
      const links=attachment?attachmentLinks(attachment):null;
      const file=attachment?`<div class="announcement-attachment">${attachment.contentType.startsWith('image/')?`<a href="${escape(links.view)}" target="_blank" rel="noopener noreferrer" aria-label="Lihat ${escape(attachment.name)} (tab baharu)"><img class="announcement-image" src="${escape(links.image)}" alt="${escape(attachment.name)}" loading="lazy" referrerpolicy="no-referrer"></a>`:''}<a class="attachment-file" href="${escape(attachment.contentType==='application/pdf'?links.download:links.view)}" target="_blank" rel="noopener noreferrer">${icon('external')}<span>${escape(attachment.name)}<small>${attachment.contentType==='application/pdf'?'PDF':'Imej'} · ${(attachment.size/1024/1024).toFixed(2)} MB · ${attachment.contentType==='application/pdf'?'Muat turun PDF':'Buka imej'}</small></span></a>${attachment.contentType==='application/pdf'?`<a class="attachment-view" href="${escape(links.view)}" target="_blank" rel="noopener noreferrer">Lihat PDF dalam Google Drive</a>`:''}</div>`:'';
      return `<article class="announcement"><div class="announcement-meta"><span class="announcement-label">Pengumuman</span>${date ? `<time datetime="${escape(item.date)}">${escape(date)}</time>` : ''}</div><h3>${escape(item.title)}</h3>${item.body?`<p class="announcement-body">${escape(item.body)}</p>`:''}${file}</article>`;
    }).join('');
    content.querySelectorAll('.announcement-image').forEach(image=>image.addEventListener('error',()=>{ image.parentElement.hidden=true; },{once:true}));
  }
}

async function loadAnnouncements() {
  announcements = { status: 'loading', items: [] };
  paintAnnouncements();
  try {
    let feed;
    if (backend) feed = {announcements:await backend.listAnnouncements()};
    else {
      const response = await fetch('announcements.json', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Announcements unavailable');
      feed = await response.json();
    }
    announcements = { status: 'ready', items: validateAnnouncements(feed) };
  } catch { announcements = { status: 'error', items: [] }; }
  paintAnnouncements();
}

function modulePage(id) {
  const module = config.modules[id], detail = modules[id];
  return `<div class="breadcrumb"><a href="#dashboard">Laman Utama</a><span>/</span>${escape(detail.short)}</div>
    <section class="module-heading ${id}"><span class="module-icon">${icon(id)}</span><div><div class="eyebrow">${detail.category}</div><h1>${escape(module.name)}</h1><p>${detail.description}</p></div></section>
    <section class="integration-panel"><div>${badge(module)}</div><h2>${module.url ? 'Teruskan ke aplikasi anda' : 'Pautan aplikasi belum ditetapkan'}</h2><p>${module.url ? 'Aplikasi dibuka dalam tab baharu supaya Hub kekal mudah dicapai. Gunakan pengesahan akses aplikasi seperti biasa.' : 'Pentadbir perlu menetapkan pautan aplikasi yang diluluskan sebelum modul ini boleh digunakan. Tiada data contoh dipaparkan.'}</p>
    ${module.url ? `<a class="primary-button" href="${escape(module.url)}" target="_blank" rel="noopener noreferrer">Buka ${escape(detail.short)} ${icon('external')}</a><p class="small-print">Pautan dikonfigurasi. Sambungan dan fungsi aplikasi belum disahkan oleh Hub.</p>` : '<div class="setup-note">Hubungi pentadbir farmasi untuk melengkapkan sambungan aplikasi.</div>'}
    <div class="module-features">${detail.features.map(f => `<span>${icon('check')}${f}</span>`).join('')}</div></section>
    <div class="privacy-note">${icon(id === 'myubat' ? 'shield' : 'info')}<p>${detail.note}</p></div><a class="back-link" href="#dashboard">← Kembali ke Laman Utama</a>`;
}

function updateClock() {
  const date = document.querySelector('#date');
  if (!date) return;
  const now = new Date();
  date.textContent = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  document.querySelector('#time').textContent = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

function render(focus = false) {
  const route = location.hash.slice(1) || 'dashboard';
  const valid = route === 'dashboard' || route === 'admin' || ids.includes(route);
  // Unknown hashes are never interpolated or sent to a backend.
  main.innerHTML = route === 'dashboard' ? dashboard() : route === 'admin' ? '<div class="breadcrumb"><a href="#dashboard">Laman Utama</a><span>/</span>Pentadbir</div><h1>Pengurusan pengumuman</h1><section id="admin-panel" class="admin-panel"></section>' : ids.includes(route) ? modulePage(route) : '<section class="integration-panel"><h1>Halaman tidak dijumpai</h1><p>Sila pilih aplikasi melalui navigasi.</p><a class="primary-button" href="#dashboard">Kembali ke Laman Utama</a></section>';
  document.querySelectorAll('[data-route]').forEach(link => {
    if (link.dataset.route === route && link.target !== '_blank') link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${route === 'admin' ? 'Pentadbir' : valid && route !== 'dashboard' ? modules[route].short : 'Laman Utama'} | ${config.title}`;
  updateClock();
  paintAnnouncements();
  if (route === 'admin') admin.render();
  if (focus) { main.focus(); window.scrollTo(0, 0); }
}

async function initialize() {
  main.innerHTML = '<div class="initial-state" role="status">Memuatkan Hub…</div>';
  try {
    const response = await fetch('config.json', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Configuration unavailable');
    const data = await response.json();
    if (typeof data.title !== 'string' || !data.modules) throw new Error('Invalid configuration');
    // Validate again in browser for static deployments as well.
    for (const id of ids) {
      const module = data.modules[id];
      if (!module || typeof module.name !== 'string' || typeof module.url !== 'string') throw new Error('Invalid module');
      if (module.url) {
        const url = new URL(module.url);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid URL');
      }
    }
    if (data.firebase != null && (typeof data.firebase.projectId !== 'string' || typeof data.firebase.apiKey !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(data.firebase.apiKey) || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(data.firebase.projectId))) throw new Error('Invalid Firebase configuration');
    config = data;
    if (config.firebase?.driveUploadUrl != null && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.firebase.driveUploadUrl)) throw new Error('Invalid upload service URL');
    backend = config.firebase ? createAnnouncementBackend(config.firebase) : null;
    admin = createAdminEditor(backend, loadAnnouncements);
    // Keep the footer consistent with current branding, including older cached HTML.
    const footerName = document.querySelector('footer > span');
    if (footerName) footerName.textContent = config.title;
    navigation(); render(); loadAnnouncements();
  } catch {
    main.innerHTML = `<section class="integration-panel" role="alert"><span class="module-icon">${icon('info')}</span><h1>Hub tidak dapat dimuatkan</h1><p>Konfigurasi tidak tersedia atau tidak sah. Cuba semula atau hubungi pentadbir.</p><button class="primary-button" id="retry">Cuba semula</button></section>`;
    document.querySelector('#retry').addEventListener('click', initialize);
  }
}
window.addEventListener('hashchange', () => { if (config) render(true); });
setInterval(updateClock, 1000);
initialize();

import { icon } from './icons.js';

const modules = {
  planner: { short: 'Planner Cuti', category: 'PENGURUSAN STAF', description: 'Rancang cuti, urus permohonan dan semak jadual pasukan anda.', features: ['Hantar & batal cuti / off', 'Ringkasan bulanan & mingguan', 'Pengesahan passkey staf'], note: 'Permohonan, pembatalan, passkey dan peraturan tempahan kekal di aplikasi Planner asal.' },
  myubat: { short: 'Carian MyUbat', category: 'PERKHIDMATAN PESAKIT', description: 'Cari nombor rujukan untuk Drive Through, Park & Take dan Pos Ubat.', features: ['Carian nama atau MRN', 'Rujukan & status pengambilan', 'Catatan bekalan ubat'], note: 'Carian dan kemas kini rekod hanya boleh dilakukan dalam aplikasi asal yang dibenarkan. Hub tidak menerima atau menyimpan maklumat pesakit.' },
  katalog: { short: 'Katalog Ubat', category: 'RUJUKAN FARMASI', description: 'Akses maklumat ubat, lokasi simpanan dan rujukan formulari setempat.', features: ['Carian ubat & penapis kategori', 'Lokasi, kuota & persediaan', 'Indikasi & dos daripada sumber asal'], note: 'Maklumat indikasi dan dos mesti dirujuk daripada katalog rasmi. Hub tidak menjana cadangan rawatan atau maklumat dos.' },
  formulary: { short: 'Formulari HSM', category: 'RUJUKAN FORMULARI', description: 'Buka aplikasi Formulari HSM sebagai rujukan tambahan dalam urusan farmasi.', features: ['Pautan ke Formulari HSM', 'Rujukan melalui aplikasi asal', 'Dibuka dalam tab baharu'], note: 'Sila rujuk sumber dan tarikh kemas kini di aplikasi Formulari HSM. Hub tidak menyalin atau menjana maklumat ubat.' },
  farmasi: { short: 'Portal Farmasi', category: 'PORTAL FARMASI', description: 'Akses laman Farmasi HSM versi 2026 melalui satu pusat pautan yang mudah.', features: ['Laman Farmasi HSM versi 2026', 'Sumber di portal asal', 'Dibuka dalam tab baharu'], note: 'Pautan ini membuka laman Farmasi HSM yang diberikan. Kandungan dan kemas kini dikendalikan di portal asal.' }
};
let config;
const main = document.querySelector('main');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const badge = module => `<span class="status ${module.url ? 'configured' : ''}"><span></span>${module.url ? 'Pautan tersedia' : 'Belum disambungkan'}</span>`;
const ids = Object.keys(modules);

function navigation() {
  document.querySelector('#navigation').innerHTML = [
    ['dashboard', 'Laman Utama'], ...ids.map(id => [id, modules[id].short])
  ].map(([id, title]) => `<a href="#${id}" data-route="${id}" aria-label="${escape(title)}" title="${escape(title)}">${icon(id)}<span>${escape(title)}</span><span class="nav-arrow">›</span></a>`).join('');
}

function card(id, index) {
  const module = config.modules[id], detail = modules[id];
  return `<a class="module-card ${id}" href="#${id}"><div class="card-top"><span class="module-icon">${icon(id)}</span><span class="card-number">0${index + 1}</span></div><span class="eyebrow">${detail.category}</span><h3>${escape(module.name)}</h3><p>${detail.description}</p><ul>${detail.features.map(f => `<li>${icon('check')}${f}</li>`).join('')}</ul><div class="card-bottom">${badge(module)}<span class="round-arrow">${icon('arrow')}</span></div></a>`;
}

function dashboard() {
  const count = ids.filter(id => config.modules[id].url).length;
  return `<div class="breadcrumb">Ruang kerja <span>/</span> Laman Utama</div>
    <section class="welcome"><div><div class="welcome-kicker"><span></span> SATU HUB, SEMUA KEPERLUAN</div><h1>Selamat datang ke<br><span>${escape(config.title)}</span></h1><p>Pusat akses aplikasi ${escape(config.department)}.<br>Lebih tersusun. Lebih mudah. Bersama untuk perkhidmatan yang lebih baik.</p></div><div class="welcome-side"><img class="welcome-logo" src="assets/fpl-hsm-logo.png" alt="Farmasi Pesakit Luar, Hospital Seri Manjung" width="124" height="124"><div class="date-panel">${icon('clock')}<span id="date"></span><strong id="time"></strong><small>Waktu Malaysia · GMT+8</small></div></div></section>
    <div class="section-heading"><div><h2>Aplikasi &amp; sumber farmasi</h2><p>Pilih aplikasi untuk memulakan urusan anda.</p></div><span class="count-label">${ids.length} pautan utama</span></div>
    <section class="module-grid" aria-label="Aplikasi farmasi">${ids.map(card).join('')}</section>
    <section class="lower-grid"><div class="guide-panel"><span class="small-icon">${icon('book')}</span><div><h2>Aliran kerja yang lebih mudah</h2><p>Pilih aplikasi, buka pautan asal dan teruskan urusan dengan akaun atau passkey sedia ada.</p><div class="steps"><span><b>1</b> Pilih aplikasi</span><span><b>2</b> Sahkan akses</span><span><b>3</b> Teruskan urusan</span></div></div></div><div class="connection-panel"><div class="section-heading"><h2>Status pautan</h2><span>${count} / ${ids.length}</span></div>${ids.map(id => `<div class="connection-row"><span>${icon(id)}${modules[id].short}</span><span class="connection-dot ${config.modules[id].url ? 'configured' : ''}"></span></div>`).join('')}<small>Status ini menunjukkan konfigurasi pautan, bukan ketersediaan pelayan.</small></div></section>
    <div class="privacy-note">${icon('shield')}<p><strong>Privasi dalam setiap urusan.</strong> Hub ini tidak menyimpan rekod pesakit. Pengesahan dan kebenaran akses dikendalikan oleh setiap aplikasi asal.</p></div>`;
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
  const valid = route === 'dashboard' || ids.includes(route);
  // Unknown hashes are never interpolated or sent to a backend.
  main.innerHTML = route === 'dashboard' ? dashboard() : ids.includes(route) ? modulePage(route) : '<section class="integration-panel"><h1>Halaman tidak dijumpai</h1><p>Sila pilih aplikasi melalui navigasi.</p><a class="primary-button" href="#dashboard">Kembali ke Laman Utama</a></section>';
  document.querySelectorAll('[data-route]').forEach(link => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${valid && route !== 'dashboard' ? modules[route].short : 'Laman Utama'} | ${config.title}`;
  updateClock();
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
    config = data;
    navigation(); render();
  } catch {
    main.innerHTML = `<section class="integration-panel" role="alert"><span class="module-icon">${icon('info')}</span><h1>Hub tidak dapat dimuatkan</h1><p>Konfigurasi tidak tersedia atau tidak sah. Cuba semula atau hubungi pentadbir.</p><button class="primary-button" id="retry">Cuba semula</button></section>`;
    document.querySelector('#retry').addEventListener('click', initialize);
  }
}
window.addEventListener('hashchange', () => { if (config) render(true); });
setInterval(updateClock, 1000);
initialize();

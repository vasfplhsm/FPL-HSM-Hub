// Optional: npm install --no-save --package-lock=false playwright
// Then: node tests/browser.cjs (with npm start running).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.HUB_TEST_URL || 'http://127.0.0.1:4173';
  const moduleIds = ['planner', 'myubat', 'katalog', 'formulary', 'farmasi'];
  const blankConfig = {title:'Hub',modules:Object.fromEntries(moduleIds.map(id=>[id,{name:id,url:''}]))};
  try {
    const originalConfig=await(await fetch(base.replace(/\/$/,'')+'/config.json')).json();
    // Public-board state tests use an isolated local feed, never the live Firebase project.
    await page.route('**/config.json',route=>route.fulfill({json:{...originalConfig,firebase:null}}));
    // Intercept first popup requests at context level, before any live app is contacted.
    await page.context().route('**/*', route => {
      if (new URL(route.request().url()).origin !== new URL(base).origin) {
        return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Intercepted application launch</title>'});
      }
      return route.continue();
    });
    await page.goto(base);
    await page.locator('.welcome h1').waitFor();
    const config = await page.evaluate(async () => (await fetch('config.json')).json());
    async function verifyLaunch(link, expectedUrl, keyboard = false) {
      const hubUrl = page.url();
      const popupPromise = page.waitForEvent('popup');
      if (keyboard) { await link.focus(); await page.keyboard.press('Enter'); }
      else await link.click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(popup.url(), expectedUrl, 'One action opens the configured application');
      assert.equal(page.url(), hubUrl, 'Hub stays open without an intermediate page');
      assert.equal(await popup.evaluate(() => window.opener === null), true);
      await popup.close();
    }
    assert.equal(await page.locator('.module-card').count(), 0);
    assert.equal(await page.locator('main a[target="_blank"]').count(), 0, 'Home does not duplicate application links');
    await page.getByRole('heading', {name:'Belum ada pengumuman'}).waitFor();
    assert.equal(await page.locator('main input, main textarea, main [contenteditable="true"]').count(), 0, 'Visitors have no editor');
    assert.equal(await page.locator('[data-route]').count(), 6);
    assert.equal(await page.locator('.header-logo').evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), 'assets/fpl-hsm-logo.png');
    assert.match(await page.locator('#time').innerText(), /^\d\d:\d\d$/);
    for (const size of [{width:1440,height:1100}, {width:768,height:1024}, {width:390,height:844}, {width:320,height:740}]) {
      await page.setViewportSize(size);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      for (const id of moduleIds) {
        const shortcut = page.locator(`[data-route="${id}"]`);
        for (const link of [shortcut]) {
          assert.equal(await link.getAttribute('href'), config.modules[id].url || `#${id}`);
          assert.equal(await link.getAttribute('target'), config.modules[id].url ? '_blank' : null);
          if (config.modules[id].url) assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
        }
        if (config.modules[id].url && size.width === 1440) await verifyLaunch(shortcut, config.modules[id].url);
        if (config.modules[id].url && size.width === 390) await verifyLaunch(shortcut, config.modules[id].url);
      }
      assert.equal(await page.locator('[data-route="dashboard"]').getAttribute('aria-current'), 'page');
      await page.locator('[data-route="dashboard"]').click();
      await page.locator('.welcome h1').waitFor();
    }
    if (config.modules.formulary.url) await verifyLaunch(page.locator('[data-route="formulary"]'), config.modules.formulary.url, true);
    await page.emulateMedia({colorScheme:'light'});
    await page.reload();
    await page.locator('.welcome h1').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.getByRole('button',{name:'Aktifkan mod gelap'}).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.getByRole('button',{name:'Aktifkan mod cerah'}).getAttribute('aria-pressed'), 'true');
    await page.reload();
    await page.locator('.welcome h1').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Choice persists after reload');
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)), ['fpl-hsm-theme']);
    await page.getByRole('button',{name:'Aktifkan mod cerah'}).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    // A fresh visitor follows system preference until choosing a theme.
    const systemContext = await browser.newContext({colorScheme:'dark'});
    const systemPage = await systemContext.newPage();
    await systemPage.goto(base);
    await systemPage.locator('.welcome h1').waitFor();
    assert.equal(await systemPage.locator('html').getAttribute('data-theme'), 'dark');
    await systemPage.emulateMedia({colorScheme:'light'});
    await systemPage.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    await systemContext.close();
    // Feed content remains plain text; injected markup cannot create executable elements.
    const notice = {title:'Test <img src=x onerror=alert(1)>',body:'First line\n<script>window.unsafe=true</script>',date:'2026-10-18'};
    await page.route('**/announcements.json', route => route.fulfill({json:{announcements:[notice]}}));
    await page.reload();
    await page.locator('.announcement').waitFor();
    assert.equal(await page.locator('.announcement h3').innerText(), notice.title);
    assert.equal(await page.locator('.announcement-body').textContent(), notice.body);
    assert.equal(await page.locator('.announcement img, .announcement script').count(), 0);
    assert.equal(await page.evaluate(()=>window.unsafe), undefined);
    assert.equal(await page.locator('.announcement time').getAttribute('datetime'), notice.date);
    assert.equal(await page.locator('main textarea, main input, main [contenteditable="true"]').count(), 0);
    await page.route('**/announcements.json', route => route.fulfill({status:503,body:'Unavailable'}));
    await page.reload();
    await page.getByRole('heading',{name:'Pengumuman tidak dapat dimuatkan'}).waitFor();
    assert.equal(await page.locator('[data-route="planner"]').count(), 1, 'Navigation survives a feed failure');
    await page.unroute('**/announcements.json');
    await page.getByRole('button',{name:'Cuba semula'}).click();
    await page.getByRole('heading',{name:'Belum ada pengumuman'}).waitFor();
    await page.route('**/announcements.json', route => route.fulfill({json:{announcements:[{title:'Missing body'}]}}));
    await page.reload();
    await page.getByRole('heading',{name:'Pengumuman tidak dapat dimuatkan'}).waitFor();
    await page.unroute('**/announcements.json');
    await page.goto(base + '/#unknown');
    await page.getByRole('heading', {name:'Halaman tidak dijumpai'}).waitFor();
    // Test missing-link states independently from the user's configured links.
    await page.route('**/config.json', route => route.fulfill({json:blankConfig}));
    await page.goto(base + '/#dashboard');
    await page.reload();
    await page.locator('.welcome h1').waitFor();
    assert.equal(await page.locator('[data-route="myubat"]').getAttribute('target'), null);
    assert.equal(await page.locator('[data-route="myubat"]').getAttribute('href'), '#myubat');
    await page.locator('[data-route="myubat"]').click();
    await page.getByRole('heading', {name:'Pautan aplikasi belum ditetapkan'}).waitFor();
    assert.equal(await page.locator('a.primary-button').count(), 0);
    // Config failure, retry, and hostile static config handling.
    await page.route('**/config.json', route => route.fulfill({status:503,body:'Unavailable'}));
    await page.reload();
    await page.getByRole('alert').waitFor();
    await page.unroute('**/config.json');
    await page.getByRole('button', {name:'Cuba semula'}).click();
    await page.locator('.integration-panel h2').waitFor();
    await page.route('**/config.json', route => route.fulfill({json:{...blankConfig,modules:{...blankConfig.modules,planner:{name:'x',url:'javascript:alert(1)'}}}}));
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('a.primary-button').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: read-only announcements, no duplicate home links, one-click sidebar and mobile shortcuts, keyboard launch, Hub retained, isolated popups, logo/favicon, desktop/tablet/mobile layouts, themes, clock and error states. External application requests were intercepted; live integrations were not accessed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

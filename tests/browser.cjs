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
    await page.goto(base);
    await page.locator('.module-card').first().waitFor();
    assert.equal(await page.locator('.module-card').count(), 5);
    assert.equal(await page.locator('[data-route]').count(), 6);
    assert.equal(await page.locator('.header-logo').evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'), 'assets/fpl-hsm-logo.png');
    assert.match(await page.locator('#time').innerText(), /^\d\d:\d\d$/);
    for (const size of [{width:1440,height:1100}, {width:768,height:1024}, {width:390,height:844}, {width:320,height:740}]) {
      await page.setViewportSize(size);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      for (const id of moduleIds) {
        await page.locator(`[data-route="${id}"]`).click();
        await page.locator(`[data-route="${id}"][aria-current="page"]`).waitFor();
        await page.locator('.integration-panel').waitFor();
        assert.equal(await page.locator(`[data-route="${id}"]`).getAttribute('aria-current'), 'page');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const link = page.locator('a.primary-button');
        if (await link.count()) {
          assert.match(await link.getAttribute('href'), /^https:\/\//);
          assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
          if (id === 'formulary') assert.equal(await link.getAttribute('href'), 'https://hsm-formulary.web.app/');
          if (id === 'farmasi') assert.equal(await link.getAttribute('href'), 'https://farmasihsm.my.canva.site/ver2026/');
        } else { assert.match(await page.locator('main').innerText(), /belum ditetapkan/); }
      }
      await page.locator('[data-route="dashboard"]').click();
      await page.locator('.module-card').first().waitFor();
    }
    await page.emulateMedia({colorScheme:'light'});
    await page.reload();
    await page.locator('.module-card').first().waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.getByRole('button',{name:'Aktifkan mod gelap'}).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.getByRole('button',{name:'Aktifkan mod cerah'}).getAttribute('aria-pressed'), 'true');
    await page.reload();
    await page.locator('.module-card').first().waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Choice persists after reload');
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)), ['fpl-hsm-theme']);
    await page.getByRole('button',{name:'Aktifkan mod cerah'}).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    // A fresh visitor follows system preference until choosing a theme.
    const systemContext = await browser.newContext({colorScheme:'dark'});
    const systemPage = await systemContext.newPage();
    await systemPage.goto(base);
    await systemPage.locator('.module-card').first().waitFor();
    assert.equal(await systemPage.locator('html').getAttribute('data-theme'), 'dark');
    await systemPage.emulateMedia({colorScheme:'light'});
    await systemPage.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    await systemContext.close();
    await page.goto(base + '/#unknown');
    await page.getByRole('heading', {name:'Halaman tidak dijumpai'}).waitFor();
    // Test missing-link states independently from the user's configured links.
    await page.route('**/config.json', route => route.fulfill({json:blankConfig}));
    await page.goto(base + '/#myubat');
    await page.reload();
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
    console.log('Browser checks passed: five modules, logo/favicon, desktop/tablet/390px/320px layouts, light/dark/system themes, persisted preference, keyboard toggle, links, clock, missing configuration, failure/retry and unsafe configuration. Live applications not accessed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

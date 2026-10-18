// Uses intercepted Firebase responses only; this does not test deployed Firestore rules.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context = await browser.newContext();
  const page = await context.newPage();
  const base = process.env.HUB_TEST_URL || 'http://127.0.0.1:4173';
  const originalConfig = await (await fetch(base.replace(/\/$/,'')+'/config.json')).json();
  const config = {...originalConfig,firebase:{projectId:'test-project',apiKey:'test-public-key'}};
  const records = new Map();
  let currentUid = '', rejectWrite = false, commits = 0;
  const errors = [];
  page.on('pageerror', e=>errors.push(e.message));
  const json = (route, data, status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) {
      if (url.pathname.endsWith('/config.json')) return json(route,config);
      return route.continue();
    }
    if (url.hostname === 'identitytoolkit.googleapis.com') {
      const data = request.postDataJSON();
      currentUid = data.email === 'admin@example.test' ? 'test-admin' : 'test-reader';
      return json(route,{idToken:'test-token',refreshToken:'test-refresh',localId:currentUid,expiresIn:'3600'});
    }
    if (url.hostname === 'firestore.googleapis.com') {
      if (url.pathname.includes('/admins/')) return json(route,{fields:{enabled:{booleanValue:currentUid==='test-admin'}}});
      if (url.pathname.endsWith(':commit')) {
        commits++;
        if (rejectWrite || currentUid!=='test-admin' || request.headers().authorization!=='Bearer test-token') return json(route,{},403);
        const write=request.postDataJSON().writes[0];
        if (write.delete) records.delete(write.delete);
        else records.set(write.update.name,write.update.fields);
        return json(route,{});
      }
      return json(route,{documents:[...records].map(([name,fields])=>({name,fields}))});
    }
    throw new Error('Unexpected external request: '+url.hostname);
  });
  try {
    await page.goto(base);
    await page.getByRole('heading',{name:'Belum ada pengumuman'}).waitFor();
    assert.equal(await page.locator('main form').count(),0);
    await page.getByRole('link',{name:'Pentadbir',exact:true}).click();
    await page.getByLabel('E-mel',{exact:true}).fill('reader@example.test');
    await page.getByLabel('Kata laluan',{exact:true}).fill('test-only-password');
    await page.getByRole('button',{name:'Log masuk',exact:true}).click();
    await page.getByText('Log masuk gagal atau akaun ini tidak mempunyai kebenaran pentadbir.').waitFor();
    assert.equal(await page.locator('#announcement-form').count(),0);
    assert.equal(commits,0);
    await page.getByLabel('E-mel',{exact:true}).fill('admin@example.test');
    await page.getByLabel('Kata laluan',{exact:true}).fill('test-only-password');
    await page.getByRole('button',{name:'Log masuk',exact:true}).click();
    await page.locator('#announcement-form').waitFor();
    await page.getByLabel('Tajuk',{exact:true}).fill('Test announcement');
    await page.locator('#notice-date').fill('2026-10-18');
    await page.getByLabel('Pengumuman',{exact:true}).fill('First line\nSecond line');
    rejectWrite=true;
    await page.getByRole('button',{name:'Terbitkan pengumuman',exact:true}).click();
    await page.getByText('Pengumuman tidak dapat disimpan.',{exact:false}).waitFor();
    assert.equal(await page.locator('#notice-body').inputValue(),'First line\nSecond line');
    assert.equal(records.size,0);
    rejectWrite=false;
    await page.getByRole('button',{name:'Terbitkan pengumuman',exact:true}).click();
    await page.getByText('Pengumuman berjaya diterbitkan.',{exact:true}).waitFor();
    assert.equal(records.size,1);
    await page.getByRole('button',{name:'Sunting',exact:true}).click();
    await page.getByLabel('Pengumuman',{exact:true}).fill('Updated notice');
    await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();
    await page.getByText('Pengumuman berjaya diterbitkan.',{exact:true}).waitFor();
    await page.locator('[data-route="dashboard"]').click();
    await page.locator('.announcement-body').waitFor();
    assert.equal(await page.locator('.announcement-body').innerText(),'Updated notice');
    assert.equal(await page.locator('main form').count(),0);
    await page.getByRole('link',{name:'Pentadbir',exact:true}).click();
    await page.getByRole('button',{name:'Padam',exact:true}).click();
    assert.equal(records.size,1,'Delete needs confirmation');
    await page.getByRole('button',{name:'Ya, padam pengumuman',exact:true}).click();
    await page.getByText('Pengumuman telah dipadam.',{exact:true}).waitFor();
    assert.equal(records.size,0);
    for (const width of [1440,390,320]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    await page.getByRole('button',{name:'Log keluar',exact:true}).click();
    await page.getByRole('heading',{name:'Log masuk pentadbir'}).waitFor();
    assert.equal(await page.locator('#announcement-form').count(),0);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await page.reload();
    await page.getByRole('heading',{name:'Log masuk pentadbir'}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('Admin UI checks passed with intercepted services: reader denial, admin login, failed-write recovery, publish/edit/delete, read-only board, mobile layout, sign-out and memory-only session. Live Firebase rules remain unverified.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

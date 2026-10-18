// Browser tests for Hub-owned viewing controls. Drive responses are intercepted;
// these tests do not claim to exercise Google's cross-origin PDF zoom toolbar.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext(),page=await context.newPage();
 const base=process.env.HUB_TEST_URL||'http://127.0.0.1:4173';
 const config=await(await fetch(base.replace(/\/$/,'')+'/config.json')).json();
 const png=fs.readFileSync('public/assets/fpl-hsm-logo.png');
 let jpeg=png;
 const imageName='Poster <b>Farmasi</b>.png';
 const notice=(id,name,contentType)=>({id,title:name,body:'',attachment:{provider:'drive',fileId:id,name,contentType,size:png.length}});
 const feed={announcements:[notice('viewer_png_123456',imageName,'image/png'),notice('viewer_jpeg_123456','Poster.jpg','image/jpeg'),notice('viewer_pdf_123456','Makluman.pdf','application/pdf'),notice('viewer_error_123456','No thumbnail.png','image/png')]};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===new URL(base).origin){
   if(url.pathname.endsWith('/config.json'))return route.fulfill({json:{...config,firebase:null}});
   if(url.pathname.endsWith('/announcements.json'))return route.fulfill({json:feed});
   return route.continue();
  }
  if(url.hostname==='drive.google.com'){
   if(url.pathname.endsWith('/preview'))return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Intercepted Drive preview</title><p>External PDF/image preview test fixture</p>'});
   if(url.searchParams.get('id')==='viewer_error_123456')return route.fulfill({status:403,body:'Thumbnail unavailable'});
   const isJpeg=url.searchParams.get('id')==='viewer_jpeg_123456';
   return route.fulfill({contentType:isJpeg?'image/jpeg':'image/png',body:isJpeg?jpeg:png});
  }
  throw Error('Unexpected external request: '+url.hostname);
 });
 const dialog=page.getByRole('dialog'),close=()=>page.getByRole('button',{name:'Tutup pratonton',exact:true}).click();
 const file=name=>page.locator('.attachment-file').filter({hasText:name});
 const imageWidth=()=>page.locator('.viewer-image').evaluate(i=>i.getBoundingClientRect().width);
 try{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.locator('.announcement').first().waitFor();
  jpeg=await page.locator('.welcome-logo').screenshot({type:'jpeg'});
  const url=page.url();await page.locator('.attachment-thumbnail').first().click();await dialog.waitFor();await page.locator('.viewer-image:not([hidden])').waitFor();
  assert.equal(page.url(),url);assert.equal(context.pages().length,1);
  assert.equal(await dialog.getByRole('heading').textContent(),imageName);assert.equal(await dialog.locator('h2 b').count(),0);
  const fitWidth=await imageWidth();const fitZoom=await page.locator('.viewer-zoom-level').textContent();
  await page.getByRole('button',{name:'Pusing kanan 90 darjah',exact:true}).click();assert.equal(await page.locator('.viewer-angle').textContent(),'90°');
  assert.equal(await page.locator('.viewer-image').evaluate(i=>{const r=i.getBoundingClientRect(),b=i.parentElement.getBoundingClientRect();return Math.abs(r.width-b.width)<1&&Math.abs(r.height-b.height)<1&&Math.abs(r.left-b.left)<1&&Math.abs(r.top-b.top)<1;}),true,'Rotated image fits its scrollable box without clipped edges');
  await page.getByRole('button',{name:'Pusing kiri 90 darjah',exact:true}).click();assert.equal(await page.locator('.viewer-angle').textContent(),'0°');
  await page.getByRole('button',{name:'Zum masuk',exact:true}).click();assert.ok(await imageWidth()>fitWidth);
  await page.getByRole('button',{name:'Zum keluar',exact:true}).click();assert.ok(Math.abs(await imageWidth()-fitWidth)<=1);
  await page.getByRole('button',{name:'Zum masuk',exact:true}).click();await page.getByRole('button',{name:'Muat skrin',exact:true}).click();
  assert.equal(await page.locator('.viewer-zoom-level').textContent(),fitZoom);
  for(let i=0;i<40&&await page.getByRole('button',{name:'Zum masuk',exact:true}).isEnabled();i++)await page.getByRole('button',{name:'Zum masuk',exact:true}).click();
  assert.equal(await page.locator('.viewer-zoom-level').textContent(),'400%');
  assert.equal(await page.locator('.viewer-stage').evaluate(s=>s.scrollWidth>s.clientWidth),true);
  await page.locator('.viewer-stage').evaluate(s=>s.scrollTo(s.scrollWidth,s.scrollHeight));assert.ok(await page.locator('.viewer-stage').evaluate(s=>s.scrollLeft)>0);
  await page.getByRole('button',{name:'Muat skrin',exact:true}).click();
  await page.screenshot({path:'/tmp/fpl-viewer-image-desktop.png'});
  await page.getByRole('button',{name:'Tutup pratonton',exact:true}).focus();
  for(let i=0;i<10;i++){await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(d=>d.contains(document.activeElement)),true,'Focus remains inside the modal');}
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(await page.locator('.attachment-thumbnail').first().evaluate(b=>b===document.activeElement),true);
  assert.equal(await page.locator('html').evaluate(h=>h.classList.contains('attachment-open')),false);
  await file('Poster.jpg').click();await page.locator('.viewer-image:not([hidden])').waitFor();await page.getByRole('button',{name:'Pusing kiri 90 darjah',exact:true}).click();assert.equal(await page.locator('.viewer-angle').textContent(),'270°');await page.getByRole('button',{name:'Zum masuk',exact:true}).click();await page.getByRole('button',{name:'Set semula putaran dan zum',exact:true}).click();assert.equal(await page.locator('.viewer-angle').textContent(),'0°');await close();
  for(const size of [{width:390,height:844},{width:320,height:740},{width:740,height:360}]){
   await page.setViewportSize(size);await file(imageName).click();await page.locator('.viewer-image:not([hidden])').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth),true,'Viewer has no horizontal overflow');
   assert.equal(await page.locator('.viewer-stage').evaluate(s=>s.clientHeight>100),true);
   const fitted=await imageWidth();await page.getByRole('button',{name:'Zum masuk',exact:true}).click();assert.ok(await imageWidth()>fitted);await page.getByRole('button',{name:'Muat skrin',exact:true}).click();
   await page.getByRole('button',{name:'Pusing kanan 90 darjah',exact:true}).click();assert.equal(await page.locator('.viewer-angle').textContent(),'90°');await page.getByRole('button',{name:'Set semula putaran dan zum',exact:true}).click();
   if(size.width===390)await page.screenshot({path:'/tmp/fpl-viewer-image-mobile.png'});
   await close();
  }
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Aktifkan mod gelap'}).click();
  await file('Makluman.pdf').click();await page.locator('.viewer-frame').waitFor();
  assert.equal(await page.locator('.viewer-frame').getAttribute('src'),'https://drive.google.com/file/d/viewer_pdf_123456/preview');
  assert.match(await page.locator('#attachment-viewer-hint').textContent(),/PDF.*Pratonton sandaran/);
  assert.equal(await page.getByRole('button',{name:'Zum masuk',exact:true}).count(),0,'PDF uses its own embedded zoom controls');
  assert.equal(await page.getByRole('link',{name:'Muat turun',exact:true}).getAttribute('href'),'https://drive.google.com/uc?export=download&id=viewer_pdf_123456');
  await close();assert.equal(await page.locator('.viewer-frame').count(),0);
  await file('No thumbnail.png').click();await page.locator('.viewer-frame').waitFor();
  assert.equal(await page.locator('.viewer-frame').getAttribute('src'),'https://drive.google.com/file/d/viewer_error_123456/preview');
  await page.evaluate(()=>{location.hash='admin';});await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('.viewer-frame').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Viewer browser checks passed: JPG/PNG zoom/fit/pan, 400% limit, escaped filenames, modal focus/Escape, mobile/landscape/dark layout, embedded PDF URL, thumbnail fallback and frame cleanup. Drive content was intercepted; its built-in PDF zoom controls require a live check.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

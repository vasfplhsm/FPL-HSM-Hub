// Actual bundled PDF.js parses/renders a real multi-page PDF. Only the public
// Apps Script byte response and Firebase feed are intercepted.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext(),page=await context.newPage();
 const base=process.env.HUB_TEST_URL||'http://127.0.0.1:4173';
 const original=await(await fetch(base.replace(/\/$/,'')+'/config.json')).json();
 const config={...original,firebase:{projectId:'test-project',apiKey:'test-public-key',driveUploadUrl:'https://script.google.com/macros/s/test-service/exec'}};
 const data=fs.readFileSync('tests/fixtures/rotation.pdf');
 const fileId='rotation_pdf_123456789',noticeId='rotation-notice';
 const text=value=>({stringValue:value});
 const fields={title:text('Rotation test'),body:text(''),date:text(''),attachment:{mapValue:{fields:{
  provider:text('drive'),fileId:text(fileId),name:text('Rotation.pdf'),contentType:text('application/pdf'),size:{integerValue:String(data.length)}
 }}}};
 let unavailable=false,invalid=false,hold=false,releaseRead=null,reads=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===new URL(base).origin){if(url.pathname.endsWith('/config.json'))return route.fulfill({json:config});return route.continue();}
  if(url.hostname==='firestore.googleapis.com')return route.fulfill({json:{documents:[{name:'projects/test-project/databases/(default)/documents/announcements/'+noticeId,fields}]}});
  if(url.hostname==='script.google.com'){
   reads++;assert.deepEqual(request.postDataJSON(),{action:'readPdf',noticeId,fileId});
   if(hold)await new Promise(resolve=>{releaseRead=resolve;});
   const bytes=invalid?Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(data.length-5)]):data;
   return route.fulfill({json:unavailable?{ok:false}:{ok:true,fileId,contentType:'application/pdf',size:data.length,data:bytes.toString('base64')}}).catch(()=>{});
  }
  if(url.hostname==='drive.google.com')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Drive fallback fixture</title><p>Drive preview</p>'});
  throw Error('Unexpected external request: '+url.hostname);
 });
 const open=()=>page.locator('.attachment-file').click();
 const close=()=>page.getByRole('button',{name:'Tutup pratonton',exact:true}).click();
 const ready=async()=>{await page.locator('.viewer-pdf-canvas').waitFor();await page.locator('.viewer-stage[aria-busy="false"]').waitFor();};
 const clockwise=async()=>{await page.getByRole('button',{name:'Pusing kanan 90 darjah',exact:true}).click();await ready();};
 const size=()=>page.locator('.viewer-media-box').evaluate(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}));
 const blue=async(x,y)=>page.locator('.viewer-pdf-canvas').evaluate((c,[x,y])=>{const [r,g,b]=c.getContext('2d').getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data;return b>160&&r<80&&g<100;},[x,y]);
 try{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.locator('.attachment-file').waitFor();const hubUrl=page.url();
  await open();await ready();assert.equal(page.url(),hubUrl);assert.equal(context.pages().length,1);assert.equal(await page.locator('.viewer-frame').count(),0);
  assert.equal(await page.locator('.viewer-page-number').textContent(),'1 / 3');assert.equal(await page.getByRole('button',{name:'Halaman sebelumnya',exact:true}).isDisabled(),true);
  const initial=await size();assert.ok(initial.height>initial.width);assert.equal(await blue(40/300,40/480),true,'Real PDF content is painted');
  await clockwise();assert.equal(await page.locator('.viewer-angle').textContent(),'90°');let rotated=await size();assert.ok(rotated.width>rotated.height);assert.equal(await blue(430/480,40/300),true,'PDF page pixels rotate, not its outer controls');
  await page.getByRole('button',{name:'Zum masuk',exact:true}).click();await ready();assert.ok((await size()).width>rotated.width);
  await page.getByRole('button',{name:'Muat skrin',exact:true}).click();await ready();
  await page.getByRole('button',{name:'Halaman seterusnya',exact:true}).click();await ready();assert.equal(await page.locator('.viewer-page-number').textContent(),'2 / 3');assert.equal(await page.locator('.viewer-angle').textContent(),'90°');
  await page.getByRole('button',{name:'Halaman seterusnya',exact:true}).click();await ready();assert.equal(await page.locator('.viewer-page-number').textContent(),'3 / 3');assert.equal(await page.getByRole('button',{name:'Halaman seterusnya',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Halaman sebelumnya',exact:true}).click();await ready();assert.equal(await page.locator('.viewer-page-number').textContent(),'2 / 3');
  await page.getByRole('button',{name:'Pusing kiri 90 darjah',exact:true}).click();await ready();assert.equal(await page.locator('.viewer-angle').textContent(),'0°');
  for(let n=0;n<4;n++)await clockwise();assert.equal(await page.locator('.viewer-angle').textContent(),'0°');
  for(const viewport of [{width:390,height:844},{width:320,height:740},{width:740,height:360}]){
   await page.setViewportSize(viewport);await page.getByRole('button',{name:'Muat skrin',exact:true}).click();await ready();await clockwise();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.getByRole('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth),true);
   assert.equal(await page.locator('.viewer-stage').evaluate(s=>s.clientHeight>70),true);
   if(viewport.width===390)await page.screenshot({path:'/tmp/fpl-pdf-rotation-mobile.png'});
  }
  await page.getByRole('button',{name:'Set semula putaran dan zum',exact:true}).click();await ready();assert.equal(await page.locator('.viewer-angle').textContent(),'0°');
  await close();assert.equal(await page.locator('.viewer-pdf-canvas').count(),0);
  await open();await ready();assert.equal(await page.locator('.viewer-angle').textContent(),'0°');assert.equal(await page.locator('.viewer-page-number').textContent(),'1 / 3');await close();
  unavailable=true;await open();await page.locator('.viewer-frame').waitFor();assert.equal(await page.getByRole('button',{name:'Pusing kanan 90 darjah',exact:true}).count(),0);await close();unavailable=false;
  invalid=true;await open();await page.locator('.viewer-frame').waitFor();await close();invalid=false;
  hold=true;const beforeReads=reads;await open();await page.waitForFunction(()=>document.querySelector('.viewer-status')?.textContent.includes('Memuatkan'));
  for(let n=0;n<100&&!releaseRead;n++)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(reads>beforeReads);assert.ok(releaseRead);
  await close();hold=false;releaseRead();await open();await ready();assert.equal(await page.locator('.viewer-frame').count(),0);await close();
  assert.deepEqual(errors,[]);
  console.log('PDF browser checks passed: real PDF.js rendering, 90° page-pixel rotation, zoom/fit, 3-page navigation, repeated rotation/reset, mobile/landscape layout, cancellation, malformed PDF and old-service fallbacks. Live Google service responses were intercepted.');
 }finally{releaseRead?.();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

// End-to-end UI with intercepted Firebase and Apps Script services; no live uploads.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext(), page=await context.newPage();
 const base=process.env.HUB_TEST_URL||'http://127.0.0.1:4173';
 const original=await(await fetch(base.replace(/\/$/,'')+'/config.json')).json();
 const config={...original,firebase:{projectId:'test-project',apiKey:'test-public-key',driveUploadUrl:'https://script.google.com/macros/s/test-upload/exec'}};
 const notices=new Map(),files=new Map();let rejectUpload=false,uploadCount=0,commitCount=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const json=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 const png=fs.readFileSync('public/assets/fpl-hsm-logo.png');
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===new URL(base).origin){if(url.pathname.endsWith('/config.json'))return json(route,config);return route.continue();}
  if(url.hostname==='identitytoolkit.googleapis.com')return json(route,{idToken:'test-token',refreshToken:'test-refresh',localId:'test-admin',expiresIn:'3600'});
  if(url.hostname==='firestore.googleapis.com'){
   if(url.pathname.includes('/admins/'))return json(route,{fields:{enabled:{booleanValue:true}}});
   if(url.pathname.endsWith(':commit')){
    commitCount++;const w=request.postDataJSON().writes[0];
    if(w.delete)notices.delete(w.delete);else notices.set(w.update.name,w.update.fields);return json(route,{});
   }
   return json(route,{documents:[...notices].map(([name,fields])=>({name,fields}))});
  }
  if(url.hostname==='script.google.com'){
   const data=request.postDataJSON();assert.equal(data.idToken,'test-token');
   if(data.action==='upload'){
    if(rejectUpload)return json(route,{ok:false});
    const attachment={provider:'drive',fileId:'test_drive_file_'+(++uploadCount),name:data.name,contentType:data.contentType,size:Buffer.from(data.data,'base64').length};
    files.set(attachment.fileId,{...attachment,published:false,trashed:false});return json(route,{ok:true,attachment});
   }
   const file=files.get(data.fileId);assert.ok(file);
   const notice=[...notices].find(([name])=>name.endsWith('/'+data.noticeId))?.[1];
   const referenced=notice?.attachment?.mapValue?.fields?.fileId?.stringValue===data.fileId;
   if(data.action==='publish'){assert.equal(referenced,true);file.published=true;}
   if(data.action==='delete'){assert.equal(Boolean(referenced),false);file.trashed=true;}
   return json(route,{ok:true});
  }
  if(url.hostname==='drive.google.com')return route.fulfill({contentType:'image/png',body:png});
  throw Error('Unexpected external request '+url.hostname);
 });
 const admin=()=>page.getByRole('link',{name:'Pentadbir',exact:true}).click();
 const post=()=>page.getByRole('button',{name:'Terbitkan pengumuman',exact:true}).click();
 const saved=()=>page.getByText('Pengumuman berjaya diterbitkan.',{exact:true}).waitFor();
 try{
  await page.goto(base);await page.getByRole('heading',{name:'Belum ada pengumuman'}).waitFor();await admin();
  await page.getByLabel('E-mel',{exact:true}).fill('admin@example.test');await page.getByLabel('Kata laluan',{exact:true}).fill('test-only-password');await page.getByRole('button',{name:'Log masuk',exact:true}).click();await page.locator('#announcement-form').waitFor();
  await page.getByLabel('Tajuk',{exact:true}).fill('File notice');
  await page.locator('#notice-file').setInputFiles({name:'wrong.png',mimeType:'image/png',buffer:Buffer.from('not png')});
  await page.getByText('Hanya fail JPG, PNG atau PDF yang sah dibenarkan.').waitFor();assert.equal(uploadCount,0);
  await page.locator('#notice-file').setInputFiles({name:'notice.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nTest')});
  await page.locator('.selected-attachment').waitFor();assert.equal(await page.locator('#notice-body').getAttribute('required'),null);
  rejectUpload=true;await post();await page.getByText('Pengumuman tidak dapat disimpan.',{exact:false}).waitFor();assert.equal(commitCount,0);assert.equal(await page.locator('.selected-attachment').count(),1);
  rejectUpload=false;await post();await saved();assert.equal(uploadCount,1);assert.equal(notices.size,1);
  const firstFile=[...files.values()][0];assert.equal(firstFile.published,true);
  await page.locator('[data-route="dashboard"]').click();await page.locator('.attachment-file').waitFor();
  assert.equal(await page.locator('.attachment-file').getAttribute('href'),'https://drive.google.com/uc?export=download&id=test_drive_file_1');
  assert.equal(await page.getByRole('link',{name:'Lihat PDF dalam Google Drive'}).getAttribute('href'),'https://drive.google.com/file/d/test_drive_file_1/view');assert.equal(await page.locator('main form').count(),0);
  const visitor=await context.newPage();await visitor.goto(base);await visitor.locator('.attachment-file').waitFor();assert.equal(await visitor.locator('main input, main textarea').count(),0);await visitor.close();
  await admin();await page.getByRole('button',{name:'Sunting',exact:true}).click();
  const image={name:'poster.png',mimeType:'image/png',buffer:png};await page.locator('#notice-file').setInputFiles(image);await page.locator('.selected-preview').waitFor();
  await page.getByRole('button',{name:'Buang fail dipilih',exact:true}).click();await page.locator('#file-remove').waitFor();assert.equal(uploadCount,1,'Clearing a local selection does not upload it');
  await page.locator('#notice-file').setInputFiles(image);await page.locator('.selected-preview').waitFor();await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();await saved();assert.equal(firstFile.trashed,true);
  await page.locator('[data-route="dashboard"]').click();await page.locator('.announcement-image').waitFor();assert.equal(await page.locator('.announcement-image').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await admin();await page.getByRole('button',{name:'Sunting',exact:true}).click();await page.getByRole('button',{name:'Buang lampiran',exact:true}).click();await page.getByLabel('Pengumuman',{exact:true}).fill('Now text only');await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();await saved();assert.equal([...files.values()].every(f=>f.trashed),true);
  await page.getByRole('button',{name:'Sunting',exact:true}).click();await page.locator('#notice-file').setInputFiles({name:'final.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nTest')});await page.locator('.selected-attachment').waitFor();await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();await saved();
  await page.getByRole('button',{name:'Padam',exact:true}).click();await page.getByRole('button',{name:'Ya, padam pengumuman',exact:true}).click();await page.getByText('Pengumuman telah dipadam.',{exact:true}).waitFor();assert.equal(notices.size,0);assert.equal([...files.values()].every(f=>f.trashed),true);
  assert.deepEqual(errors,[]);console.log('Attachment browser checks passed: file validation, PDF-only publishing, upload failure recovery, PNG preview/replacement/removal, read-only visitor links, mobile layout and file cleanup on deletion. External services were intercepted.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

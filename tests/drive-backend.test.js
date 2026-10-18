import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnnouncementBackend } from '../public/assets/announcement-backend.js';
const attachment={provider:'drive',fileId:'test_file_123456789',name:'notice.pdf',contentType:'application/pdf',size:6};
const config={projectId:'test-project',apiKey:'test-public-key',driveUploadUrl:'https://script.google.com/macros/s/test-deployment/exec'};
const ok=value=>new Response(JSON.stringify(value),{status:200});
const file=()=>new File(['%PDF-1'],'notice.pdf',{type:'application/pdf'});
function service(options={}) {
  const events=[];let fail=options.failCommit||false,saved=null;
  const backend=createAnnouncementBackend(config,async(url,request)=>{
    if (url.includes('signInWithPassword')) return ok({idToken:'test-token',refreshToken:'test-refresh',localId:'test-admin',expiresIn:'3600'});
    if (url.includes('/admins/')) return ok({fields:{enabled:{booleanValue:true}}});
    if (url.startsWith('https://script.google.com')) {
      const data=JSON.parse(request.body);events.push({type:data.action,data,request});
      assert.equal(data.idToken,'test-token');
      assert.equal(request.headers['Content-Type'],'text/plain;charset=UTF-8');
      if (data.action==='upload') return ok({ok:true,attachment});
      return ok({ok:!(options.failCleanup&&data.action==='delete')});
    }
    if (url.includes(':commit')) {
      const write=JSON.parse(request.body).writes[0];events.push({type:'commit',write});
      if (fail) {fail=false;return new Response('{}',{status:403});}
      saved=write.update||null;
      if (options.lostResponse) {options.lostResponse=false;return new Response('{}',{status:500});}
      return ok({});
    }
    return saved?ok(saved):new Response('{}',{status:404});
  });
  return {backend,events};
}

test('file upload precedes metadata publication; sharing follows the Firestore commit', async()=>{
  const {backend,events}=service();await backend.signIn('admin@example.test','test-only-password');
  const result=await backend.saveAnnouncement(null,{title:'Notice',body:'',date:''},file());
  assert.deepEqual(events.map(e=>e.type),['upload','commit','publish']);
  assert.equal(events[0].data.data,Buffer.from('%PDF-1').toString('base64'));
  const fields=events[1].write.update.fields;
  assert.equal(fields.attachment.mapValue.fields.fileId.stringValue,attachment.fileId);
  assert.equal(fields.body.stringValue,'');assert.equal(JSON.stringify(fields).includes('JVBER'),false);
  assert.equal(events[0].data.noticeId,result.id);assert.equal(events[2].data.noticeId,result.id);
});

test('a rejected save keeps its upload private and reuses it on retry',async()=>{
  const {backend,events}=service({failCommit:true});await backend.signIn('admin@example.test','test-only-password');
  const selected=file(),notice={title:'Notice',body:'Text',date:''};
  await assert.rejects(backend.saveAnnouncement(null,notice,selected));
  assert.deepEqual(events.map(e=>e.type),['upload','commit']);
  await backend.saveAnnouncement(null,notice,selected);
  assert.deepEqual(events.map(e=>e.type),['upload','commit','commit','publish']);
  assert.equal(events[1].write.update.name,events[2].write.update.name);
});

test('canceling a failed draft deletes the staged private upload',async()=>{
  const {backend,events}=service({failCommit:true});await backend.signIn('admin@example.test','test-only-password');
  const selected=file();await assert.rejects(backend.saveAnnouncement(null,{title:'Notice',body:'Text'},selected));
  await backend.discardUpload(selected);assert.deepEqual(events.map(e=>e.type),['upload','commit','delete']);
});

test('a lost commit response is verified without duplicating or deleting the published attachment',async()=>{
  const {backend,events}=service({lostResponse:true});await backend.signIn('admin@example.test','test-only-password');
  const result=await backend.saveAnnouncement(null,{title:'Notice',body:'Text',date:''},file());
  assert.deepEqual(events.map(e=>e.type),['upload','commit','publish']);assert.equal(result.warning,'');
});

test('replacement cleanup happens after publication and cleanup failures remain distinct from save failures',async()=>{
  const {backend,events}=service({failCleanup:true});await backend.signIn('admin@example.test','test-only-password');
  const previous={...attachment,fileId:'old_file_123456789'};
  const result=await backend.saveAnnouncement('existing-id',{title:'Notice',body:'Text'},file(),{previousAttachment:previous,revision:'2026-10-18T00:00:00Z'});
  assert.deepEqual(events.map(e=>e.type),['upload','commit','publish','delete']);
  assert.equal(events[3].data.fileId,previous.fileId);assert.ok(result.warning);
  assert.deepEqual(events[1].write.currentDocument,{updateTime:'2026-10-18T00:00:00Z'});
});

test('attachment deletion follows record deletion and anonymous users cannot initiate an upload',async()=>{
  const {backend,events}=service();
  await assert.rejects(backend.saveAnnouncement(null,{title:'Notice',body:''},file()),/sign-in/);assert.equal(events.length,0);
  await backend.signIn('admin@example.test','test-only-password');
  await backend.deleteAnnouncement('existing-id',{attachment});assert.deepEqual(events.map(e=>e.type),['commit','delete']);
});

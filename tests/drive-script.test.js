import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../apps-script/DriveUploads.gs',import.meta.url),'utf8');
function harness() {
  const files=new Map(),cache=new Map();let admin=true,referenced=null,creates=0,reads=0,publicReadsAllowed=true;
  const response=(value,status=200)=>({getResponseCode:()=>status,getContentText:()=>JSON.stringify(value)});
  const file={getId:()=> 'test_file_123456789',description:'',shared:'PRIVATE',trashed:false,permission:'NONE',bytes:[],type:'',parent:'test-folder',
    setDescription(v){this.description=v;},getDescription(){return this.description;},
    getParents:()=>{let n=0;return {hasNext:()=>n===0,next:()=>{n++;return {getId:()=> file.parent};}};},
    setSharing(access,permission){this.shared=access;this.permission=permission;},isTrashed(){return this.trashed;},setTrashed(v){this.trashed=v;},
    getSharingAccess(){return this.shared;},getSharingPermission(){return this.permission;},getMimeType(){return this.type;},getSize(){return this.bytes.length;},getBlob(){reads++;return {getBytes:()=>this.bytes};}};
  const folder={createFile(blob){creates++;file.bytes=blob.bytes;file.type=blob.type;files.set(file.getId(),file);return file;}};
  const ctx=vm.createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>({FIREBASE_PROJECT_ID:'test-project',FIREBASE_WEB_API_KEY:'test-public-key',UPLOAD_FOLDER_ID:'test-folder'}[k])})},
    UrlFetchApp:{fetch:(url,options)=>{
      if (url.includes('accounts:lookup')) {assert.equal(JSON.parse(options.payload).idToken,'test.token.signature');return response({users:[{localId:'test-user'}]});}
      if (url.includes('/admins/')) return response({fields:{enabled:{booleanValue:admin}}});
      if(!options.headers && !publicReadsAllowed)return response({},403);
      return referenced?response({fields:{attachment:{mapValue:{fields:{provider:{stringValue:'drive'},fileId:{stringValue:referenced},contentType:{stringValue:file.type},size:{integerValue:String(file.bytes.length)}}}}}}):response({},404);
    }},
    DriveApp:{getFolderById:()=>folder,getFileById:id=>{if(!files.has(id))throw Error('Unknown file');return files.get(id);},Access:{PRIVATE:'PRIVATE',ANYONE_WITH_LINK:'PUBLIC'},Permission:{NONE:'NONE',VIEW:'VIEW'}},
    Utilities:{base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:bytes=>Buffer.from(bytes).toString('base64'),newBlob:(bytes,type,name)=>({bytes,type,name})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({value,setMimeType(){return this;}})}
  });vm.runInContext(source,ctx);
  const post=p=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(p)}}).value);
  const upload={action:'upload',noticeId:'test-notice',operationId:'test-operation',idToken:'test.token.signature',name:'notice.pdf',contentType:'application/pdf',data:Buffer.from('%PDF-1').toString('base64')};
  return {post,upload,file,get creates(){return creates;},get reads(){return reads;},set admin(v){admin=v;},set referenced(v){referenced=v;},set publicReadsAllowed(v){publicReadsAllowed=v;}};
}

test('Apps Script rejects unauthenticated/non-admin uploads and spoofed file content before creating files',()=>{
  const h=harness();assert.equal(h.post({...h.upload,idToken:''}).ok,false);
  h.admin=false;assert.equal(h.post(h.upload).ok,false);h.admin=true;
  assert.equal(h.post({...h.upload,data:Buffer.from('not pdf').toString('base64')}).ok,false);
  assert.equal(h.creates,0);
});

test('Apps Script creates private files idempotently and shares only published references',()=>{
  const h=harness(),result=h.post(h.upload);assert.equal(result.ok,true);assert.equal(h.file.shared,'PRIVATE');
  assert.equal(h.post(h.upload).attachment.fileId,result.attachment.fileId);assert.equal(h.creates,1);
  const manage={idToken:h.upload.idToken,noticeId:h.upload.noticeId,fileId:result.attachment.fileId};
  assert.equal(h.post({...manage,action:'publish'}).ok,false);
  h.referenced=result.attachment.fileId;assert.equal(h.post({...manage,action:'publish'}).ok,true);assert.equal(h.file.shared,'PUBLIC');
  assert.equal(h.post({...manage,action:'delete'}).ok,false);assert.equal(h.file.trashed,false);
  h.referenced=null;assert.equal(h.post({...manage,action:'delete'}).ok,true);assert.equal(h.file.trashed,true);
});

test('Apps Script never manages another announcement’s file',()=>{
  const h=harness(),result=h.post(h.upload);h.referenced=result.attachment.fileId;
  assert.equal(h.post({action:'publish',idToken:h.upload.idToken,noticeId:'different-notice',fileId:result.attachment.fileId}).ok,false);
  h.admin=false;assert.equal(h.post({action:'delete',idToken:h.upload.idToken,noticeId:h.upload.noticeId,fileId:result.attachment.fileId}).ok,false);
  assert.equal(h.file.trashed,false);
});

test('anonymous PDF reads require a published reference, view-only sharing and folder/notice ownership',()=>{
  const h=harness(),uploaded=h.post(h.upload),id=uploaded.attachment.fileId;
  const request={action:'readPdf',noticeId:h.upload.noticeId,fileId:id};
  assert.equal(h.post(request).ok,false,'A private draft cannot be read');
  h.referenced=id;assert.equal(h.post(request).ok,false,'A record alone cannot expose a private file');
  h.post({action:'publish',noticeId:h.upload.noticeId,fileId:id,idToken:h.upload.idToken});
  h.admin=false;
  const result=h.post(request);assert.equal(result.ok,true);assert.equal(Buffer.from(result.data,'base64').toString(),'%PDF-1');assert.equal(h.reads,1);
  h.file.parent='another-folder';assert.equal(h.post(request).ok,false);h.file.parent='test-folder';
  assert.equal(h.post({...request,noticeId:'another-notice'}).ok,false);
  h.file.trashed=true;assert.equal(h.post(request).ok,false);h.file.trashed=false;
  h.file.permission='EDIT';assert.equal(h.post(request).ok,false);h.file.permission='VIEW';
  h.publicReadsAllowed=false;assert.equal(h.post(request).ok,false,'Owner credentials cannot bypass public Firestore rules');h.publicReadsAllowed=true;
  h.file.type='image/png';assert.equal(h.post(request).ok,false);h.file.type='application/pdf';
  h.referenced=null;assert.equal(h.post(request).ok,false,'Deleting the notice revokes preview access');
  assert.equal(h.reads,1,'Rejected requests never read file bytes');
  assert.equal(h.post({...h.upload,idToken:''}).ok,false,'Read access cannot grant write access');
});

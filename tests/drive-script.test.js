import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../apps-script/DriveUploads.gs',import.meta.url),'utf8');
function harness() {
  const files=new Map(),cache=new Map();let admin=true,referenced=null,creates=0;
  const response=(value,status=200)=>({getResponseCode:()=>status,getContentText:()=>JSON.stringify(value)});
  const file={getId:()=> 'test_file_123456789',description:'',shared:'PRIVATE',trashed:false,
    setDescription(v){this.description=v;},getDescription(){return this.description;},
    getParents:()=>{let n=0;return {hasNext:()=>n===0,next:()=>{n++;return {getId:()=> 'test-folder'};}};},
    setSharing(access){this.shared=access;},isTrashed(){return this.trashed;},setTrashed(v){this.trashed=v;}};
  const folder={createFile(){creates++;files.set(file.getId(),file);return file;}};
  const ctx=vm.createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>({FIREBASE_PROJECT_ID:'test-project',FIREBASE_WEB_API_KEY:'test-public-key',UPLOAD_FOLDER_ID:'test-folder'}[k])})},
    UrlFetchApp:{fetch:(url,options)=>{
      if (url.includes('accounts:lookup')) {assert.equal(JSON.parse(options.payload).idToken,'test.token.signature');return response({users:[{localId:'test-user'}]});}
      if (url.includes('/admins/')) return response({fields:{enabled:{booleanValue:admin}}});
      return referenced?response({fields:{attachment:{mapValue:{fields:{provider:{stringValue:'drive'},fileId:{stringValue:referenced}}}}}}):response({},404);
    }},
    DriveApp:{getFolderById:()=>folder,getFileById:id=>{if(!files.has(id))throw Error('Unknown file');return files.get(id);},Access:{PRIVATE:'PRIVATE',ANYONE_WITH_LINK:'PUBLIC'},Permission:{NONE:'NONE',VIEW:'VIEW'}},
    Utilities:{base64Decode:s=>[...Buffer.from(s,'base64')],newBlob:(bytes,type,name)=>({bytes,type,name})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({value,setMimeType(){return this;}})}
  });vm.runInContext(source,ctx);
  const post=p=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(p)}}).value);
  const upload={action:'upload',noticeId:'test-notice',operationId:'test-operation',idToken:'test.token.signature',name:'notice.pdf',contentType:'application/pdf',data:Buffer.from('%PDF-1').toString('base64')};
  return {post,upload,file,get creates(){return creates;},set admin(v){admin=v;},set referenced(v){referenced=v;}};
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

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPublishedPdf} from '../public/assets/attachment-preview.js';
const config={driveUploadUrl:'https://script.google.com/macros/s/test-service/exec'};
const binary='%PDF-1.7\nTest';
const attachment={provider:'drive',fileId:'test_pdf_123456789',name:'Test.pdf',contentType:'application/pdf',size:binary.length};
const result={ok:true,fileId:attachment.fileId,contentType:attachment.contentType,size:binary.length,data:btoa(binary)};
test('published PDF reader uses anonymous simple requests and verifies returned bytes',async()=>{
  const bytes=await readPublishedPdf(config,attachment,'notice-1',undefined,async(url,options)=>{
    assert.equal(url,config.driveUploadUrl);assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,undefined);
    assert.deepEqual(JSON.parse(options.body),{action:'readPdf',noticeId:'notice-1',fileId:attachment.fileId});
    assert.match(options.headers['Content-Type'],/^text\/plain/);return Response.json(result);
  });assert.equal(new TextDecoder().decode(bytes),binary);
});
test('PDF reader rejects old/unavailable services, wrong file metadata, oversized or invalid data',async()=>{
  for(const patch of [{ok:false},{fileId:'other_file_12345'},{contentType:'text/html'},{size:binary.length+1},{data:btoa('x'.repeat(binary.length))},{data:'!not-base64!'},{data:'A'.repeat(7000000)}]){
    await assert.rejects(readPublishedPdf(config,attachment,'notice-1',undefined,async()=>Response.json({...result,...patch})));
  }
  await assert.rejects(readPublishedPdf(config,attachment,'../bad',undefined,async()=>{throw new Error('Not called');}));
});

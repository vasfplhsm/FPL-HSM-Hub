import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadFile, validateAttachment, attachmentLinks, MAX_ATTACHMENT_SIZE } from '../public/assets/attachments.js';
import { validateAnnouncements } from '../public/assets/announcements.js';

test('JPG, PNG and PDF uploads are checked by signature, type, extension and size', async () => {
  for (const [bytes,name,type] of [[[255,216,255,1],'image.jpg','image/jpeg'],[[137,80,78,71,13,10,26,10],'image.png','image/png'],[[37,80,68,70,45,49],'notice.pdf','application/pdf']]) {
    const file=new File([new Uint8Array(bytes)],name,{type});
    assert.equal((await validateUploadFile(file)).contentType,type);
  }
  for (const file of [new File(['not pdf'],'notice.pdf',{type:'application/pdf'}),new File(['%PDF-1'],'notice.exe',{type:'application/pdf'}),new File(['%PDF-1'],'notice.pdf',{type:'text/plain'}),new File([],'empty.pdf',{type:'application/pdf'}),new File([new Uint8Array(MAX_ATTACHMENT_SIZE+1)],'large.pdf',{type:'application/pdf'})]) {
    await assert.rejects(validateUploadFile(file));
  }
});

test('file-only notices are accepted, unsafe file IDs and arbitrary attachment URLs are rejected', () => {
  const attachment={provider:'drive',fileId:'test_file_123456789',name:'Notice.pdf',contentType:'application/pdf',size:123};
  assert.equal(validateAnnouncements({announcements:[{title:'Notice',body:'',attachment}]})[0].attachment.fileId,attachment.fileId);
  assert.match(attachmentLinks(attachment).view,/^https:\/\/drive\.google\.com\/file\/d\/test_file_123456789\/view$/);
  assert.equal(attachmentLinks(attachment).preview,'https://drive.google.com/file/d/test_file_123456789/preview');
  for (const patch of [{fileId:'javascript:alert(1)'},{provider:'url',url:'https://example.com'},{contentType:'text/html'},{size:MAX_ATTACHMENT_SIZE+1},{size:-1}]) {
    assert.throws(()=>validateAttachment({...attachment,...patch}));
  }
});

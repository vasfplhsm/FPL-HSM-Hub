import { validateAttachment, MAX_ATTACHMENT_SIZE } from './attachments.js';

// Public PDFs already appear on the public announcement board. This endpoint
// returns bytes only after the server checks the notice and Drive permissions.
export async function readPublishedPdf(config, value, noticeId, signal, request=fetch) {
  const item=validateAttachment(value);
  if(item.contentType!=='application/pdf' || !/^[A-Za-z0-9_-]{1,128}$/.test(noticeId||'') || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config?.driveUploadUrl||'')) throw new Error('PDF preview unavailable.');
  const response=await request(config.driveUploadUrl,{method:'POST',credentials:'omit',cache:'no-store',signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(45000)]),headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'readPdf',noticeId,fileId:item.fileId})});
  if(!response.ok)throw new Error('PDF preview unavailable.');
  const result=await response.json();
  if(result.ok!==true || result.fileId!==item.fileId || result.contentType!=='application/pdf' || result.size!==item.size || typeof result.data!=='string' || result.data.length>4*Math.ceil(MAX_ATTACHMENT_SIZE/3) || !/^[A-Za-z0-9+/]*={0,2}$/.test(result.data)) throw new Error('Invalid PDF preview.');
  const binary=atob(result.data);
  if(binary.length!==item.size || binary.slice(0,5)!=='%PDF-')throw new Error('Invalid PDF preview.');
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

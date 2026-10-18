import { validateAttachment, validateUploadFile } from './attachments.js';
import { validateNoticeText } from './announcements.js';
// Official Firebase REST APIs plus the owner's authenticated Apps Script service.
// Tokens and pending upload references stay in memory, never in browser storage.
export function createAnnouncementBackend(config, request = fetch) {
  const key = encodeURIComponent(config.apiKey);
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents`;
  const pendingUploads = new WeakMap();
  let session = null;
  async function json(url, options = {}) {
    const response = await request(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000),...options});
    if (!response.ok) { const error=new Error('The announcement service rejected the request.'); error.status=response.status; throw error; }
    return response.json();
  }
  const body = value => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  async function token() {
    if (!session) throw new Error('Admin sign-in is required.');
    if (session.expiresAt < Date.now()+60000) {
      const refreshed=await json(`https://securetoken.googleapis.com/v1/token?key=${key}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refreshToken}).toString()});
      session.idToken=refreshed.id_token; session.refreshToken=refreshed.refresh_token;
      session.expiresAt=Date.now()+Number(refreshed.expires_in)*1000;
    }
    return session.idToken;
  }
  function documentName(id) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid announcement ID.');
    return root.slice('https://firestore.googleapis.com/v1/'.length)+'/announcements/'+id;
  }
  function decodeAttachment(value) {
    const fields=value?.mapValue?.fields;
    if (!fields) return null;
    return validateAttachment({provider:fields.provider?.stringValue,fileId:fields.fileId?.stringValue,name:fields.name?.stringValue,contentType:fields.contentType?.stringValue,size:Number(fields.size?.integerValue)});
  }
  async function drive(action,values) {
    if (!config.driveUploadUrl) throw new Error('Drive upload service is not configured.');
    const result=await json(config.driveUploadUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...values,action,idToken:await token()}),signal:AbortSignal.timeout(90000)});
    if (result.ok!==true) throw new Error('The attachment service rejected the request.');
    return result;
  }
  async function base64(file) {
    const bytes=new Uint8Array(await file.arrayBuffer()), chunks=[];
    for (let i=0;i<bytes.length;i+=32768) chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
    return btoa(chunks.join(''));
  }
  return {
    supportsAttachments:Boolean(config.driveUploadUrl),
    async listAnnouncements() {
      const result=await json(`${root}/announcements?key=${key}&pageSize=20&orderBy=updatedAt%20desc`);
      return (result.documents||[]).map(document=>{
        const attachment=decodeAttachment(document.fields?.attachment);
        return {id:document.name.split('/').pop(),title:document.fields?.title?.stringValue??'',body:document.fields?.body?.stringValue??'',date:document.fields?.date?.stringValue??'',...(attachment?{attachment}:{}),...(document.updateTime?{revision:document.updateTime}:{})};
      });
    },
    async signIn(email,password) {
      session=null;
      const result=await json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,body({email,password,returnSecureToken:true}));
      const candidate={idToken:result.idToken,refreshToken:result.refreshToken,uid:result.localId,expiresAt:Date.now()+Number(result.expiresIn)*1000};
      const role=await json(`${root}/admins/${encodeURIComponent(candidate.uid)}?key=${key}`,{headers:{Authorization:`Bearer ${candidate.idToken}`}});
      if (role.fields?.enabled?.booleanValue!==true) throw new Error('Admin access is not enabled.');
      session=candidate;
    },
    signOut() { session=null; },
    async discardUpload(file) {
      const pending=pendingUploads.get(file);
      if (!pending) return;
      if (pending.attachment) await drive('delete',{noticeId:pending.noticeId,fileId:pending.attachment.fileId});
      pendingUploads.delete(file);
    },
    async saveAnnouncement(id,notice,file=null,options={}) {
      const authToken=await token();
      const text=validateNoticeText(notice,Boolean(file||notice.attachment));
      let pending=file?pendingUploads.get(file):null;
      const noticeId=id||pending?.noticeId||crypto.randomUUID(), name=documentName(noticeId);
      let attachment=notice.attachment?validateAttachment(notice.attachment):null;
      if (file) {
        if (!config.driveUploadUrl) throw new Error('Drive upload service is not configured.');
        const metadata=await validateUploadFile(file);
        if (!pending || pending.noticeId!==noticeId) {
          pending={noticeId,operationId:crypto.randomUUID(),attachment:null}; pendingUploads.set(file,pending);
        }
        if (!pending.attachment) {
          const uploaded=await drive('upload',{noticeId,operationId:pending.operationId,name:metadata.name,contentType:metadata.contentType,data:await base64(file)});
          pending.attachment=validateAttachment(uploaded.attachment);
        }
        attachment=pending.attachment;
      }
      const fields=Object.fromEntries(['title','body','date'].map(field=>[field,{stringValue:text[field]}]));
      if (attachment) fields.attachment={mapValue:{fields:Object.fromEntries(Object.entries(attachment).map(([k,v])=>[k,typeof v==='number'?{integerValue:String(v)}:{stringValue:v}]))}};
      try {
        await json(`${root}:commit?key=${key}`,{...body({writes:[{update:{name,fields},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:options.revision?{updateTime:options.revision}:{exists:Boolean(id)}}]}),headers:{'Content-Type':'application/json',Authorization:`Bearer ${authToken}`}});
      } catch (error) {
        // If a commit response was lost, do not duplicate a notice or remove a file it now uses.
        let confirmed=false;
        if (file && attachment) {
          try {
            const saved=await json(`https://firestore.googleapis.com/v1/${name}?key=${key}`);
            confirmed=decodeAttachment(saved.fields?.attachment)?.fileId===attachment.fileId && ['title','body','date'].every(k=>saved.fields?.[k]?.stringValue===text[k]);
          } catch { /* Leave the staged upload private and reusable on retry. */ }
        }
        if (!confirmed) throw error;
      }
      const warnings=[];
      if (attachment && config.driveUploadUrl) {
        try { await drive('publish',{noticeId,fileId:attachment.fileId}); }
        catch { warnings.push('Lampiran belum dapat dikongsi. Sunting dan simpan pengumuman ini sekali lagi untuk mencuba semula.'); }
      }
      const previous=options.previousAttachment;
      if (previous && previous.fileId!==attachment?.fileId) {
        try { await drive('delete',{noticeId,fileId:validateAttachment(previous).fileId}); }
        catch { warnings.push('Lampiran lama belum dapat dipadam. Semak folder lampiran di Google Drive.'); }
      }
      if (file) pendingUploads.delete(file);
      return {id:noticeId,warning:warnings.join(' ')};
    },
    async deleteAnnouncement(id,options={}) {
      await json(`${root}:commit?key=${key}`,{...body({writes:[{delete:documentName(id),currentDocument:options.revision?{updateTime:options.revision}:{exists:true}}]}),headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`}});
      let warning='';
      if (options.attachment) {
        try { await drive('delete',{noticeId:id,fileId:validateAttachment(options.attachment).fileId}); }
        catch { warning='Pengumuman dipadam, tetapi lampirannya belum dapat dipadam. Semak folder lampiran di Google Drive.'; }
      }
      return {warning};
    }
  };
}

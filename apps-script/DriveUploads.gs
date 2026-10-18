/** Execute as owner; access Anyone. Writes require Firebase admin authorization.
 * readPdf serves only a currently published, publicly shared PDF in the Hub folder.
 */
var UPLOAD_LIMIT = 5 * 1024 * 1024;

function setupUploadFolder() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('UPLOAD_FOLDER_ID')) props.setProperty('UPLOAD_FOLDER_ID', DriveApp.createFolder('FPL HSM Hub - Lampiran').getId());
}

function doGet() { return output_({ok:true,service:'FPL HSM attachment service',version:2}); }
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents || '';
    if (raw.length > 8 * 1024 * 1024) throw requestError_('Fail terlalu besar.');
    var p = JSON.parse(raw);
    if (['upload','publish','delete','readPdf'].indexOf(p.action) < 0) throw requestError_('Tindakan tidak sah.');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(p.noticeId || ''))) throw requestError_('Rujukan pengumuman tidak sah.');
    if (p.action === 'readPdf') return output_(readPdf_(p));
    var auth = authorize_(p.idToken);
    var folder = DriveApp.getFolderById(auth.folderId);
    if (p.action === 'upload') return output_(upload_(p,auth,folder));
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(String(p.fileId || ''))) throw requestError_('Rujukan fail tidak sah.');
    var file = DriveApp.getFileById(p.fileId);
    var marker;
    try { marker = JSON.parse(file.getDescription()); } catch (_) { throw requestError_('Fail bukan lampiran Hub.'); }
    var parents = file.getParents(), inFolder = false;
    while (parents.hasNext()) if (parents.next().getId() === auth.folderId) inFolder = true;
    if (!inFolder || marker.app !== 'fpl-hsm-hub' || marker.projectId !== auth.projectId || marker.noticeId !== p.noticeId) throw requestError_('Fail bukan lampiran pengumuman ini.');
    var document = notice_(auth,p.noticeId);
    var attachment = document && document.fields && document.fields.attachment && document.fields.attachment.mapValue.fields;
    var referenced = attachment && attachment.provider && attachment.provider.stringValue === 'drive' && attachment.fileId && attachment.fileId.stringValue === p.fileId;
    if (p.action === 'publish') {
      if (!referenced || file.isTrashed()) throw requestError_('Terbitkan pengumuman sebelum berkongsi lampiran.');
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    } else {
      if (referenced) throw requestError_('Lampiran masih digunakan oleh pengumuman.');
      file.setTrashed(true);
    }
    return output_({ok:true});
  } catch (err) { return output_({ok:false,error:String(err && err.safeForClient ? err.message : 'Perkhidmatan muat naik gagal. Semak persediaan dan cuba semula.')}); }
}

function authorize_(idToken) {
  if (typeof idToken !== 'string' || idToken.length > 12000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(idToken)) throw requestError_('Log masuk diperlukan.');
  var props = PropertiesService.getScriptProperties();
  var projectId = props.getProperty('FIREBASE_PROJECT_ID'), apiKey = props.getProperty('FIREBASE_WEB_API_KEY'), folderId = props.getProperty('UPLOAD_FOLDER_ID');
  if (!projectId || !apiKey || !folderId) throw requestError_('Persediaan perkhidmatan muat naik belum lengkap.');
  var response = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(apiKey),{method:'post',contentType:'application/json',payload:JSON.stringify({idToken:idToken}),muteHttpExceptions:true});
  if (response.getResponseCode() !== 200) throw requestError_('Sesi log masuk tidak sah atau tamat.');
  var users = JSON.parse(response.getContentText()).users || [];
  if (!users[0] || !users[0].localId) throw requestError_('Sesi log masuk tidak sah.');
  var auth = {projectId:projectId,apiKey:apiKey,folderId:folderId,idToken:idToken,uid:users[0].localId};
  var role = fetchDocument_(auth,'admins/'+encodeURIComponent(auth.uid));
  if (!role || !role.fields || !role.fields.enabled || role.fields.enabled.booleanValue !== true) throw requestError_('Kebenaran pentadbir diperlukan.');
  return auth;
}

function fetchDocument_(auth,path) {
  var url = 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(auth.projectId)+'/databases/(default)/documents/'+path+'?key='+encodeURIComponent(auth.apiKey);
  var response = UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+auth.idToken},muteHttpExceptions:true});
  if (response.getResponseCode() === 404) return null;
  if (response.getResponseCode() !== 200) throw requestError_('Pengesahan data tidak dapat dilengkapkan.');
  return JSON.parse(response.getContentText());
}
function notice_(auth,id) { return fetchDocument_(auth,'announcements/'+encodeURIComponent(id)); }

// Anonymous reading is deliberately separate from authorize_ and write actions.
// It cannot read a draft, an unshared file or an arbitrary Drive file ID.
function readPdf_(p) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(String(p.fileId || ''))) throw requestError_('Rujukan fail tidak sah.');
  var props=PropertiesService.getScriptProperties();
  var projectId=props.getProperty('FIREBASE_PROJECT_ID'),apiKey=props.getProperty('FIREBASE_WEB_API_KEY'),folderId=props.getProperty('UPLOAD_FOLDER_ID');
  if (!projectId || !apiKey || !folderId) throw requestError_('Persediaan pratonton belum lengkap.');
  var url='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(projectId)+'/databases/(default)/documents/announcements/'+encodeURIComponent(p.noticeId)+'?key='+encodeURIComponent(apiKey);
  // No owner credential or client token is sent: Firestore must allow this public read.
  var response=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if (response.getResponseCode()!==200) throw requestError_('Pratonton tidak tersedia.');
  var document=JSON.parse(response.getContentText());
  var a=document.fields && document.fields.attachment && document.fields.attachment.mapValue && document.fields.attachment.mapValue.fields;
  if (!a || !a.provider || a.provider.stringValue!=='drive' || !a.fileId || a.fileId.stringValue!==p.fileId || !a.contentType || a.contentType.stringValue!=='application/pdf') throw requestError_('Pratonton tidak tersedia.');
  var expectedSize=a.size && Number(a.size.integerValue);
  if (!(expectedSize>0 && expectedSize<=UPLOAD_LIMIT)) throw requestError_('Pratonton tidak tersedia.');
  var file=DriveApp.getFileById(p.fileId),marker;
  try {marker=JSON.parse(file.getDescription());} catch (_) {throw requestError_('Pratonton tidak tersedia.');}
  var parents=file.getParents(),inFolder=false;
  while(parents.hasNext())if(parents.next().getId()===folderId)inFolder=true;
  if (!inFolder || !marker || marker.app!=='fpl-hsm-hub' || marker.projectId!==projectId || marker.noticeId!==p.noticeId || file.isTrashed() || file.getSharingAccess()!==DriveApp.Access.ANYONE_WITH_LINK || file.getSharingPermission()!==DriveApp.Permission.VIEW || file.getMimeType()!=='application/pdf' || file.getSize()!==expectedSize) throw requestError_('Pratonton tidak tersedia.');
  var bytes=file.getBlob().getBytes();
  if (bytes.length!==expectedSize || ![37,80,68,70,45].every(function(n,i){return ((bytes[i]+256)%256)===n;})) throw requestError_('Pratonton tidak tersedia.');
  return {ok:true,fileId:p.fileId,contentType:'application/pdf',size:bytes.length,data:Utilities.base64Encode(bytes)};
}

function upload_(p,auth,folder) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(p.operationId || '')) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 160 || typeof p.data !== 'string') throw requestError_('Maklumat fail tidak sah.');
  var types = ['image/jpeg','image/png','application/pdf'];
  if (types.indexOf(p.contentType)<0) throw requestError_('Hanya JPG, PNG atau PDF dibenarkan.');
  var bytes;
  try { bytes = Utilities.base64Decode(p.data); } catch (_) { throw requestError_('Kandungan fail tidak sah.'); }
  if (!bytes.length || bytes.length>UPLOAD_LIMIT) throw requestError_('Fail mesti tidak melebihi 5 MB.');
  var b=bytes.slice(0,8).map(function(v){return (v+256)%256;}), valid=false;
  if (p.contentType==='image/jpeg') valid=b[0]===255&&b[1]===216&&b[2]===255&&/\.jpe?g$/i.test(p.name);
  if (p.contentType==='image/png') valid=[137,80,78,71,13,10,26,10].every(function(n,i){return b[i]===n;})&&/\.png$/i.test(p.name);
  if (p.contentType==='application/pdf') valid=[37,80,68,70,45].every(function(n,i){return b[i]===n;})&&/\.pdf$/i.test(p.name);
  if (!valid) throw requestError_('Kandungan fail tidak sepadan dengan jenis fail.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw requestError_('Perkhidmatan sibuk. Sila cuba semula.');
  try {
    var cache = CacheService.getScriptCache(), key='upload:'+auth.uid+':'+p.noticeId+':'+p.operationId;
    var cached=cache.get(key);
    if (cached) return {ok:true,attachment:JSON.parse(cached)};
    var name=p.name.replace(/[\x00-\x1f\x7f]/g,'').trim();
    if (!name) throw requestError_('Nama fail tidak sah.');
    var file=folder.createFile(Utilities.newBlob(bytes,p.contentType,name));
    file.setDescription(JSON.stringify({app:'fpl-hsm-hub',projectId:auth.projectId,noticeId:p.noticeId,operationId:p.operationId}));
    file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    var attachment={provider:'drive',fileId:file.getId(),name:name,contentType:p.contentType,size:bytes.length};
    cache.put(key,JSON.stringify(attachment),21600);
    return {ok:true,attachment:attachment};
  } finally { lock.releaseLock(); }
}
function output_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

function requestError_(message) { var error=new Error(message); error.safeForClient=true; return error; }

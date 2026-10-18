export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const ATTACHMENT_TYPES = {'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'};

export function validateAttachment(value) {
  if (!value || value.provider !== 'drive' || typeof value.fileId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(value.fileId) ||
      typeof value.name !== 'string' || !value.name.trim() || value.name.length > 160 || !Object.hasOwn(ATTACHMENT_TYPES,value.contentType) ||
      !Number.isInteger(value.size) || value.size < 1 || value.size > MAX_ATTACHMENT_SIZE) throw new Error('Invalid attachment.');
  return {provider:'drive',fileId:value.fileId,name:value.name.trim(),contentType:value.contentType,size:value.size};
}

export function attachmentLinks(value) {
  const item = validateAttachment(value), id = encodeURIComponent(item.fileId);
  return {view:`https://drive.google.com/file/d/${id}/view`,preview:`https://drive.google.com/file/d/${id}/preview`,download:`https://drive.google.com/uc?export=download&id=${id}`,image:`https://drive.google.com/thumbnail?id=${id}&sz=w1600`,largeImage:`https://drive.google.com/thumbnail?id=${id}&sz=w4000`};
}

export async function validateUploadFile(file) {
  if (!file || file.size < 1 || file.size > MAX_ATTACHMENT_SIZE || typeof file.slice !== 'function') throw new Error('Pilih fail yang tidak melebihi 5 MB.');
  const bytes = new Uint8Array(await file.slice(0,8).arrayBuffer());
  let contentType;
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) contentType='image/jpeg';
  else if ([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) contentType='image/png';
  else if ([37,80,68,70,45].every((n,i)=>bytes[i]===n)) contentType='application/pdf';
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  const allowed = contentType === 'image/jpeg' ? ['jpg','jpeg'] : [ATTACHMENT_TYPES[contentType]];
  if (!contentType || !allowed.includes(extension) || (file.type && file.type!==contentType) || file.name.length>160) {
    throw new Error('Hanya fail JPG, PNG atau PDF yang sah dibenarkan.');
  }
  return {name:file.name,contentType,size:file.size};
}

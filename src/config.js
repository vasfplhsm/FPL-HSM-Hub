import { readFile } from 'node:fs/promises';
export const moduleIds = ['planner', 'myubat', 'katalog', 'formulary', 'farmasi'];

export function validateFirebase(input) {
  if (input == null) return null;
  if (typeof input !== 'object' || typeof input.projectId !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(input.projectId) ||
      typeof input.apiKey !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(input.apiKey)) {
    throw new Error('Firebase needs a valid public projectId and web apiKey.');
  }
  if (input.driveUploadUrl != null && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(input.driveUploadUrl)) throw new Error('Use the deployed Apps Script /exec upload URL.');
  return {projectId:input.projectId,apiKey:input.apiKey,...(input.driveUploadUrl?{driveUploadUrl:input.driveUploadUrl}:{})};
}

// Configuration is public metadata. Never put API credentials or Sheet IDs here.
export function safeAppUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Module URLs must be HTTPS application pages without credentials, query strings or fragments.');
  }
  return url.href;
}

export function validateConfig(input) {
  const text = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : fallback;
  const defaults = { planner: 'Planner Cuti FPL HSM', myubat: 'Carian No Rujukan MyUbat', katalog: 'Katalog Ubat FPL HSM', formulary: 'Formulari HSM', farmasi: 'Portal Farmasi HSM' };
  return {
    title: text(input.title, 'Farmasi Pesakit Luar HSM Pharmacy Hub'),
    department: text(input.department, 'Farmasi Pesakit Luar'),
    hospital: text(input.hospital, 'Hospital Seri Manjung'),
    firebase: validateFirebase(input.firebase),
    modules: Object.fromEntries(moduleIds.map(id => [id, {
      name: text(input.modules?.[id]?.name, defaults[id]),
      url: safeAppUrl(input.modules?.[id]?.url)
    }]))
  };
}

export async function loadConfig(root) {
  let contents;
  try { contents = await readFile(new URL('../config/local.json', root), 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    contents = await readFile(new URL('../config/example.json', root), 'utf8');
  }
  return validateConfig(JSON.parse(contents));
}

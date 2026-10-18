import { readFile } from 'node:fs/promises';
export const moduleIds = ['planner', 'myubat', 'katalog', 'formulary', 'farmasi'];

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
    title: text(input.title, 'FPL HSM Pharmacy Hub'),
    department: text(input.department, 'Farmasi Pesakit Luar'),
    hospital: text(input.hospital, 'Hospital Seri Manjung'),
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

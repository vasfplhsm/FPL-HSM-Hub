import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';

const publicRoot = new URL('../public/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/assets/styles.css', ['assets/styles.css', 'text/css; charset=utf-8']],
  ['/assets/app.js', ['assets/app.js', 'text/javascript; charset=utf-8']],
  ['/assets/theme.js', ['assets/theme.js', 'text/javascript; charset=utf-8']],
  ['/assets/fpl-hsm-logo.png', ['assets/fpl-hsm-logo.png', 'image/png']],
  ['/assets/icons.js', ['assets/icons.js', 'text/javascript; charset=utf-8']]
]);
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
export function createHubServer(config) {
  return createServer(async (req, res) => {
    const send = (status, type, body) => { res.writeHead(status, { ...securityHeaders, 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body); };
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'text/plain', 'Method not allowed');
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/config.json') return send(200, 'application/json', JSON.stringify(config));
      const entry = files.get(path);
      if (!entry) return send(404, 'text/plain', 'Not found');
      send(200, entry[1], await readFile(new URL(entry[0], publicRoot)));
    } catch { send(500, 'text/plain', 'Unable to load Hub'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = await loadConfig(import.meta.url);
  const port = Number(process.env.PORT || 4173);
  createHubServer(config).listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Hub listening on port ${port}`));
}

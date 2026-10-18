import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateConfig, loadConfig, safeAppUrl } from '../src/config.js';
import { createHubServer } from '../src/server.js';
const example = JSON.parse(await readFile(new URL('../config/example.json', import.meta.url)));

test('configuration exposes only public metadata and known modules', () => {
  const config = validateConfig({ ...example, secret: 'DO_NOT_EXPOSE', modules: { ...example.modules, unknown: { url: 'https://example.com' } } });
  assert.deepEqual(Object.keys(config.modules), ['planner', 'myubat', 'katalog', 'formulary', 'farmasi']);
  assert.equal(config.secret, undefined);
  assert.equal(config.modules.myubat.url, '');
});

test('unsafe or identifier-bearing module URLs fail closed', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,bad', 'http://example.com', 'https://user:password@example.com', 'https://example.com/?mrn=sensitive', 'https://example.com/#patient']) {
    assert.throws(() => safeAppUrl(value));
  }
  assert.equal(safeAppUrl('https://example.com/app'), 'https://example.com/app');
  assert.equal(safeAppUrl(''), '');
});

test('local configuration wins; missing local config uses example; malformed local fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hub-config-'));
  try {
    await mkdir(join(root, 'config'));
    const anchor = pathToFileURL(join(root, 'src/config.js'));
    await writeFile(join(root, 'config/example.json'), JSON.stringify(example));
    assert.equal((await loadConfig(anchor)).title, example.title);
    await writeFile(join(root, 'config/local.json'), JSON.stringify({ ...example, title: 'Local Hub' }));
    assert.equal((await loadConfig(anchor)).title, 'Local Hub');
    await writeFile(join(root, 'config/local.json'), '{broken');
    await assert.rejects(loadConfig(anchor));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('HTTP serves the real Hub with security headers and denies source/private files', async () => {
  const server = createHubServer(validateConfig(example));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/assets/app.js', '/assets/styles.css', '/assets/icons.js', '/assets/theme.js', '/config.json']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      assert.match(response.headers.get('content-security-policy'), /frame-src 'none'/);
      assert.ok((await response.text()).length > 20);
    }
    const config = await (await fetch(base + '/config.json')).json();
    assert.deepEqual(config, validateConfig(example));
    const logo = await fetch(base + '/assets/fpl-hsm-logo.png');
    assert.equal(logo.headers.get('content-type'), 'image/png');
    assert.deepEqual([...new Uint8Array(await logo.arrayBuffer()).slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    for (const path of ['/config/local.json', '/src/server.js', '/.git/config', '/attachments/file', '/not-found', '/%2e%2e/config/local.json']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    assert.equal((await fetch(base + '/', { method: 'POST', body: 'not accepted' })).status, 405);
    assert.equal(await (await fetch(base + '/', { method: 'HEAD' })).text(), '');
    assert.match(await (await fetch(base + '/')).text(), /lang="ms"/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

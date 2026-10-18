import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateAnnouncements } from '../public/assets/announcements.js';
import { createHubServer } from '../src/server.js';

test('announcement feed supports an empty board and sorts dated notices newest first', () => {
  assert.deepEqual(validateAnnouncements({announcements:[]}), []);
  const result = validateAnnouncements({announcements:[
    {title:' Earlier ',body:' First line\nSecond line ',date:'2026-10-17'},
    {title:'Later',body:'Text',date:'2026-10-18'},
    {title:'Undated',body:'Text'}
  ]});
  assert.deepEqual(result.map(item => item.title), ['Later','Earlier','Undated']);
  assert.equal(result[1].body, 'First line\nSecond line');
});

test('malformed announcement content fails validation instead of breaking the page', () => {
  for (const input of [null, {}, {announcements:{}}, {announcements:Array(21).fill({title:'x',body:'y'})},
    {announcements:[{title:' ',body:'x'}]}, {announcements:[{title:'x',body:' '}]},
    {announcements:[{title:'x',body:'y',date:'2026-02-30'}]},
    {announcements:[{title:'x',body:'y',date:'tomorrow'}]},
    {announcements:[{title:'x'.repeat(161),body:'y'}]},
    {announcements:[{title:'x',body:'y'.repeat(8001)}]}]) {
    assert.throws(() => validateAnnouncements(input));
  }
});

test('announcement HTTP endpoint is read-only and write attempts leave the file unchanged', async () => {
  const file = new URL('../docs/announcements.json', import.meta.url);
  const original = await readFile(file, 'utf8');
  const server = createHubServer({});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base + '/announcements.json');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), original);
    for (const method of ['POST','PUT','PATCH','DELETE']) {
      assert.equal((await fetch(base+'/announcements.json', {method,body:'unauthorized change'})).status, 405);
    }
    assert.equal(await readFile(file, 'utf8'), original);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

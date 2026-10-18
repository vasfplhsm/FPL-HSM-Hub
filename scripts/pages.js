// Publishable files only. Never copy the repository root or legacy attachments.
import { cp, mkdir, writeFile } from 'node:fs/promises';
await import('./build.js');
const output = new URL('../docs/', import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'assets', 'config.json', 'announcements.json']) {
  await cp(new URL(`../dist/${name}`, import.meta.url), new URL(name, output), { recursive: true });
}
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages files generated in docs/. Publish main /docs.');

import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

// Run against a fresh `vite build --manifest` output, never a stale shared dist.
const root = resolve(process.argv[2] ?? 'dist');
const manifest = JSON.parse(await readFile(resolve(root, '.vite/manifest.json'), 'utf8'));
const sum = async files => {
  let bytes = 0, gzipBytes = 0;
  for (const file of files) { const data = await readFile(resolve(root, file)); bytes += data.length; gzipBytes += gzipSync(data).length; }
  return { files: files.length, bytes, gzipBytes };
};
const routes = {};
for (const [entry, chunk] of Object.entries(manifest).filter(([, chunk]) => chunk.isEntry)) {
  const visited = new Set(), initial = new Set([entry]);
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const current = manifest[key];
    initial.add(current.file);
    for (const css of current.css ?? []) initial.add(css);
    for (const dependency of current.imports ?? []) visit(dependency);
  }
  visit(entry);
  routes[entry] = { initialCode: await sum([...initial]), assets: [...initial] };
}
async function walk(dir) {
  const files = [];
  for (const name of await readdir(dir)) {
    if (name === '.vite') continue;
    const path = resolve(dir, name);
    if ((await stat(path)).isDirectory()) files.push(...await walk(path)); else files.push(relative(root, path));
  }
  return files;
}
const files = await walk(root);
console.log(JSON.stringify({ root, note: 'File bytes and estimated gzip, not observed network transfer or Core Web Vitals. Initial code excludes images, workers and dynamic imports.', total: await sum(files), rasterImages: await sum(files.filter(file => /\.(?:png|jpe?g|webp)$/.test(file))), routes }, null, 2));

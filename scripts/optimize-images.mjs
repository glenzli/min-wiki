import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Originals remain the editorial source. Only these delivery copies are published.
const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'scripts/image-delivery.json');
const catalog = JSON.parse(await readFile(resolve(root, 'content/catalog.json'), 'utf8'));
const exists = async path => { try { await access(resolve(root, path)); return true; } catch { return false; } };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const jobs = [];
for (const topic of catalog.topics.filter(topic => topic.status === 'published')) {
  const dir = `topics/${topic.id}`;
  const source = await exists(`${dir}/cover-v3.jpg`) ? `${dir}/cover-v3.jpg`
    : await exists(`${dir}/cover-v2.jpg`) ? `${dir}/cover-v2.jpg` : null;
  if (source) for (const width of [480, 960]) jobs.push({ source, output: `${dir}/cover-${width}.webp`, width, quality: 84 });
}
jobs.push({ source: 'topics/rainbow/assets/rain-afterglow.png', output: 'topics/rainbow/assets/rain-afterglow.webp', quality: 90 });

if (process.argv.includes('--check')) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (JSON.stringify(manifest.files.map(({ source, output, width, quality }) => ({ source, output, ...(width ? { width } : {}), quality }))) !== JSON.stringify(jobs)) {
    throw new Error('Image selection changed. Run npm run optimize:images.');
  }
  for (const file of manifest.files) {
    for (const [path, expected] of [[file.source, file.sourceSha256], [file.output, file.sha256]]) {
      if (digest(await readFile(resolve(root, path))) !== expected) throw new Error(`Stale image: ${path}. Run npm run optimize:images.`);
    }
  }
  console.log(`Image delivery: ${manifest.files.length} copies match their original sources.`);
} else {
  const { default: sharp } = await import('sharp');
  const files = [];
  for (const job of jobs) {
    const source = await readFile(resolve(root, job.source));
    let image = sharp(source).rotate();
    if (job.width) image = image.resize({ width: job.width, withoutEnlargement: true });
    const { data, info } = await image.webp({ quality: job.quality, effort: 5 }).toBuffer({ resolveWithObject: true });
    await writeFile(resolve(root, job.output), data);
    files.push({ ...job, sourceSha256: digest(source), sha256: digest(data), pixels: [info.width, info.height], bytes: info.size });
  }
  await writeFile(manifestPath, JSON.stringify({ version: 1, encoder: `sharp ${sharp.versions.sharp} / webp ${sharp.versions.webp}`, files }, null, 2) + '\n');
  console.log(`Generated ${files.length} delivery images (${files.reduce((sum, file) => sum + file.bytes, 0)} bytes).`);
}

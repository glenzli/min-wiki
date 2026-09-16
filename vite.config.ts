import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCatalog } from './src/catalog/model.ts';
import { learningProjectionPlugin } from './src/platform/learning/buildProjection.ts';
const catalog = validateCatalog(JSON.parse(readFileSync(new URL('./content/catalog.json', import.meta.url), 'utf8')));
const input: Record<string, string> = { home: resolve('index.html') };
for (const topic of catalog.topics.filter(item => item.status === 'published')) {
  const path = resolve(`topics/${topic.id}/index.html`);
  if (!existsSync(path)) throw new Error(`Missing published topic page: ${topic.id}`);
  input[topic.id] = path;
}
export default defineConfig({ plugins: [learningProjectionPlugin()], build: { assetsInlineLimit: 0, rollupOptions: { input } } });

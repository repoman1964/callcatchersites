// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Same content file src/lib/site.ts loads: SITE_DATA=path/to/lead.json, else src/data/site.json.
const dataPath = resolve(process.env.SITE_DATA ?? 'src/data/site.json');
const { business } = JSON.parse(readFileSync(dataPath, 'utf8'));

// https://astro.build/config
export default defineConfig({
  site: business.url,
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
});

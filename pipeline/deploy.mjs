// Step 3.6 — deploy the wildcard preview Worker: {slug}.callcatcher.site -> sites/{slug}/.
// Wrangler pushes sites/ as static assets behind one route (*.callcatcher.site/*).
// Needs Cloudflare auth (wrangler login or CLOUDFLARE_API_TOKEN) and the callcatcher.site zone.
// After a successful deploy, print the preview URLs for dialer column F (sites/previews.csv).
// Usage: node deploy.mjs [--only slug,slug]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SITES, PREVIEW_DOMAIN, cliArgs, parseCsv } from './lib.mjs';

const args = cliArgs();
if (!existsSync(join(SITES, 'report.json'))) {
  console.error('sites/report.json missing — run `node build.mjs` first.');
  process.exit(1);
}

const wranglerBin = join(fileURLToPath(new URL('.', import.meta.url)), 'node_modules/.bin/wrangler');
const deploy = spawnSync(process.execPath, [wranglerBin, 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});
if (deploy.status !== 0) {
  if (deploy.error) console.error(deploy.error.message);
  console.error('\nDeploy failed. Auth: `npx wrangler login` or CLOUDFLARE_API_TOKEN in the environment.');
  process.exit(deploy.status ?? 1);
}

const rows = parseCsv(readFileSync(join(SITES, 'previews.csv'), 'utf8'));
const ready = rows.filter((r) => r.status === 'ready' && (!args.only || args.only.includes(r.slug)));

console.log(`\nDeployed. ${ready.length} preview URL${ready.length === 1 ? '' : 's'} for dialer column F (Calls Template -> scrapes):\n`);
for (const r of ready) console.log(`${r.slug}\t${r.preview_url}`);
console.log(`\nCheck: https://<slug>.${PREVIEW_DOMAIN} loads with no banner or theme switcher.`);
console.log('Next: spot-check 3-5 sites, paste the URLs into column F, start dialing.');

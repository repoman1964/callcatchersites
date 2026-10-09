// Step 3.3 — render every valid content JSON with templates/cleaning into sites/{slug}, then run the Kai gate.
// A lead that fails its build or kai-check is reported and left out of the "ready" list.
// Writes sites/report.json and sites/previews.csv (slug, name, city, preview URL = future dialer column F).
// Builds run one at a time: they share the template's .astro cache.
// Usage: node build.mjs [--only slug,slug] [--limit N]
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TEMPLATE, SITES, PREVIEW_DOMAIN, readJson, writeJson, leadDir, cliArgs, selectedLeads } from './lib.mjs';

const args = cliArgs();
const leads = selectedLeads(args);
const report = [];
const t0 = Date.now();

for (const l of leads) {
  const data = join(leadDir(l.slug), 'site.json');
  const out = join(SITES, l.slug);
  const row = { slug: l.slug, name: l.name, city: l.city, theme: l.theme, preview_url: `https://${l.slug}.${PREVIEW_DOMAIN}` };
  if (!existsSync(data)) {
    report.push({ ...row, status: 'no content' });
    console.log(`SKIP  ${l.slug}  (no valid site.json)`);
    continue;
  }
  rmSync(out, { recursive: true, force: true });
  const env = { ...process.env, SITE_DATA: data };
  const run = (cmd, a) => spawnSync(cmd, a, { cwd: TEMPLATE, env, encoding: 'utf8' });
  const started = Date.now();
  const build = run('npx', ['astro', 'build', '--outDir', out]);
  if (build.status !== 0) {
    report.push({ ...row, status: 'build failed', detail: (build.stderr || build.stdout).trim().split('\n').slice(-12).join('\n') });
    console.log(`FAIL  ${l.slug}  build\n${report.at(-1).detail}`);
    continue;
  }
  const kai = run('node', ['scripts/kai-check.mjs', out]);
  const failed = kai.stdout.split('\n').filter((s) => s.startsWith('FAIL'));
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (kai.status !== 0) {
    report.push({ ...row, status: 'kai failed', detail: failed.join('\n') });
    console.log(`FAIL  ${l.slug}  kai-check (${secs}s)\n${failed.map((f) => `        ${f}`).join('\n')}`);
    continue;
  }
  report.push({ ...row, status: 'ready', build_seconds: Number(secs) });
  console.log(`OK    ${l.slug}  (${secs}s)`);
}

// Merge with earlier runs so a partial --only build keeps the other leads' rows.
const reportPath = join(SITES, 'report.json');
const prev = existsSync(reportPath) ? readJson(reportPath).sites : [];
const merged = [...prev.filter((p) => !report.some((r) => r.slug === p.slug)), ...report];
const order = new Map(selectedLeads({}).map((l, i) => [l.slug, i]));
merged.sort((a, b) => (order.get(a.slug) ?? 1e9) - (order.get(b.slug) ?? 1e9));
writeJson(reportPath, { generated: new Date().toISOString(), sites: merged });
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
writeFileSync(join(SITES, 'previews.csv'),
  ['slug,name,city,theme,status,preview_url', ...merged.map((r) => [r.slug, r.name, r.city, r.theme, r.status, r.preview_url].map(csv).join(','))].join('\n') + '\n');

const ready = report.filter((r) => r.status === 'ready').length;
console.log(`\n${ready}/${report.length} sites ready in sites/ (${((Date.now() - t0) / 1000).toFixed(0)}s). Report: sites/report.json, sites/previews.csv`);
process.exitCode = ready === report.length ? 0 : 1;

// Shared paths and helpers for the step 3 pipeline (leads -> content -> build).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE = join(ROOT, 'templates/cleaning');
export const DISCOVER_OUT = join(ROOT, 'discover/out');
export const LEADS = join(ROOT, 'leads');
export const SITES = join(ROOT, 'sites');
export const PREVIEW_DOMAIN = 'callcatcher.site';
export const THEMES = ['fresh', 'classic', 'warm'];

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const writeJson = (p, v) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
};
export const leadDir = (slug) => join(LEADS, slug);
export const leadIndex = () => readJson(join(LEADS, 'index.json'));

/** CLI flags: --only a,b  --limit N  --force  --concurrency N */
export function cliArgs() {
  const a = process.argv.slice(2);
  const val = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  return {
    only: val('--only')?.split(',').map((s) => s.trim()).filter(Boolean),
    limit: val('--limit') ? Number(val('--limit')) : undefined,
    concurrency: val('--concurrency') ? Number(val('--concurrency')) : undefined,
    force: a.includes('--force'),
  };
}

/** Leads from leads/index.json, narrowed by --only / --limit. */
export function selectedLeads(args) {
  let leads = leadIndex().leads;
  if (args.only) leads = leads.filter((l) => args.only.includes(l.slug));
  if (args.limit) leads = leads.slice(0, args.limit);
  return leads;
}

/** Newest discover file matching prefix (e.g. "raw-") in dir, by its YYYYMMDD-HHMM stamp. */
export function latest(dir, prefix, ext = '.json') {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(ext) && /\d{8}-\d{4}/.test(f)).sort();
  return files.length ? join(dir, files[files.length - 1]) : null;
}

/** Minimal RFC 4180 CSV parser -> array of objects keyed by header. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/** "Telly’s Tidying Team, LLC" -> "tellys-tidying-team" (DNS-label safe, <= 40 chars). */
export function slugify(name) {
  const s = name
    .normalize('NFKD').replace(/[̀-ͯ​]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/(-(llc|inc|co|corp|ltd|l-l-c))+$/, '');
  if (s.length <= 40) return s || 'cleaner';
  return s.slice(0, 41).replace(/-[^-]*$/, ''); // cut at a word boundary
}

/** Great-circle distance in km. */
export function km(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Run fn over items with at most n in flight; returns results in input order. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

// Post-build gate: checks dist/ against the 8 Kai criteria plus template hygiene.
// Usage: node scripts/kai-check.mjs [distDir]   (exits 1 on any failure)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((f) => [relative(dist, f), readFileSync(f, 'utf8')]));
const page = (p) => html[p] ?? '';
const count = (s, re) => (s.match(re) ?? []).length;

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

// ── Kai criteria ───────────────────────────────────────────────────────────
const noTel = pages.map((f) => relative(dist, f)).filter((p) => !/href="tel:\+1\d{10}"/.test(page(p)));
check('1. Click-to-call tel:+1… link on every page', noTel.length === 0, noTel.join(', '));
check('2. Homepage lead capture form', /data-lead-form/.test(page('index.html')));
const internal = pages.filter((f) => relative(dist, f) !== 'index.html');
check('3. Not a one-pager (2+ internal pages)', internal.length >= 2, `${internal.length} internal pages`);
const servicePages = pages.filter((f) => /services[\\/][^\\/]+[\\/][^\\/]+\.html$/.test(relative(dist, f)));
check('4. Service pages (6+)', servicePages.length >= 6, `${servicePages.length} service pages`);
const areaPages = pages.filter((f) => /areas[\\/][^\\/]+\.html$/.test(relative(dist, f)));
check('5. Service area pages (6+)', areaPages.length >= 6, `${areaPages.length} area pages`);
const reviewCards = count(page('index.html'), /data-review-card/g);
check('6. On-site reviews (5+ cards on home)', reviewCards >= 5, `${reviewCards} review cards`);
const booking = ['index.html', 'contact.html'].filter((p) => !(/name="preferred_date"/.test(page(p)) && /name="arrival_window"/.test(page(p))));
check('7. Booking: date + arrival window on home and contact', booking.length === 0, booking.join(', '));
const legal = existsSync(join(dist, 'privacy.html')) && existsSync(join(dist, 'terms.html'));
const footerLinks = /href="\/privacy"/.test(page('index.html')) && /href="\/terms"/.test(page('index.html'));
check('8. Privacy + terms pages exist and are linked', legal && footerLinks);

// ── Hygiene ────────────────────────────────────────────────────────────────
// Kennesaw/Cherokee are Paintastic leftovers only when this business's own content JSON never mentions them.
const siteText = process.env.SITE_DATA && existsSync(process.env.SITE_DATA) ? readFileSync(process.env.SITE_DATA, 'utf8') : '';
const sourcePlaces = ['Kennesaw', 'Cherokee'].filter((w) => !siteText.includes(w)).join('|');
const LEFTOVER = new RegExp(String.raw`Paintastic|${sourcePlaces ? `${sourcePlaces}|` : ''}stonesystems|\{\{\w+\}\}|\{(?:brand|city|state|region|hq|nearby\d|rating)\}|\[[A-Z][A-Z ]{2,}\]|>\s*undefined\s*<`);
const dirty = Object.entries(html).filter(([, s]) => LEFTOVER.test(s)).map(([p, s]) => `${p}: "${s.match(LEFTOVER)[0]}"`);
check('No leftover template/source strings', dirty.length === 0, dirty.slice(0, 5).join('; '));

const badLd = [];
for (const [p, s] of Object.entries(html))
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))
    try { JSON.parse(m[1]); } catch { badLd.push(p); }
const noLd = Object.entries(html).filter(([, s]) => !s.includes('application/ld+json')).map(([p]) => p);
check('Valid JSON-LD on every page', badLd.length === 0 && noLd.length === 0, [...badLd, ...noLd].join(', '));

const broken = new Set();
for (const [p, s] of Object.entries(html))
  for (const [, href] of s.matchAll(/href="(\/[^"#?]*)/g)) {
    const path = href.replace(/\/$/, '') || '/index';
    const hit = [path, `${path}.html`, `${path}/index.html`].some((c) => existsSync(join(dist, c)) && statSync(join(dist, c)).isFile());
    if (!hit) broken.add(`${href} (in ${p})`);
  }
check('No broken internal links', broken.size === 0, [...broken].slice(0, 8).join('; '));

const missingImg = new Set();
for (const s of Object.values(html))
  for (const [, src] of s.matchAll(/(?:src="|url\(')(\/images\/[^"')]+)/g)) if (!existsSync(join(dist, src))) missingImg.add(src);
check('All referenced images exist', missingImg.size === 0, [...missingImg].join(', '));

// ── Report ─────────────────────────────────────────────────────────────────
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${results.length} checks passed (${pages.length} pages).`);
process.exit(failed ? 1 : 0);

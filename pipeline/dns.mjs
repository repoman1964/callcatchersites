// One-shot: add the proxied wildcard DNS record that makes {slug}.callcatcher.site resolve.
// The Worker route is separate: DNS just needs any proxied record on *.callcatcher.site
// (placeholder 192.0.2.1 is never used — Cloudflare answers with its own edge IPs).
// Auth: CLOUDFLARE_API_TOKEN (needs Zone.DNS Edit) from env/pipeline/.env, else the local
// wrangler OAuth token (usually Zone:Read only — it will fail with 403 and say so).
// Usage: node dns.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ROOT, PREVIEW_DOMAIN } from './lib.mjs';

let token = null, source = null;
const envFile = join(ROOT, 'pipeline/.env');
if (existsSync(envFile))
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
if (process.env.CLOUDFLARE_API_TOKEN) { token = process.env.CLOUDFLARE_API_TOKEN; source = 'CLOUDFLARE_API_TOKEN'; }
else {
  const cfg = join(homedir(), '.wrangler/config/default.toml');
  if (existsSync(cfg)) {
    const m = readFileSync(cfg, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
    if (m) { token = m[1]; source = 'wrangler OAuth token'; }
  }
}
if (!token) { console.error('No Cloudflare credential. Set CLOUDFLARE_API_TOKEN (Zone.DNS Edit) in pipeline/.env or run `npx wrangler login`.'); process.exit(1); }

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...opts.headers },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

console.log(`Credential: ${source}`);
const zones = await api(`/zones?name=${PREVIEW_DOMAIN}`);
if (!zones.body.success) { console.error(`Zone lookup failed (${zones.status}): ${JSON.stringify(zones.body.errors)}`); process.exit(1); }
const zone = zones.body.result?.[0];
if (!zone) { console.error(`Zone ${PREVIEW_DOMAIN} not on this account.`); process.exit(1); }
console.log(`Zone: ${zone.name} (${zone.id})`);

const existing = await api(`/zones/${zone.id}/dns_records?name=*.${PREVIEW_DOMAIN}`);
const wildcard = existing.body.result?.find((r) => r.name === `*.${PREVIEW_DOMAIN}` && r.proxied);
if (wildcard) { console.log(`Wildcard record already present (id ${wildcard.id}, proxied). Nothing to do.`); process.exit(0); }

const create = await api(`/zones/${zone.id}/dns_records`, {
  method: 'POST',
  body: JSON.stringify({ type: 'A', name: '*', content: '192.0.2.1', ttl: 1, proxied: true, comment: 'callcatcher preview wildcard (placeholder IP, never routed)' }),
});
if (!create.body.success) {
  console.error(`Create failed (${create.status}): ${JSON.stringify(create.body.errors)}`);
  console.error('Fix: dashboard -> DNS -> callcatcher.site -> Add record -> Type A, Name *, IPv4 192.0.2.1, Proxy ON.');
  if (source === 'wrangler OAuth token') console.error('Or add CLOUDFLARE_API_TOKEN (Zone.DNS Edit) to pipeline/.env and rerun.');
  process.exit(1);
}
console.log(`Created wildcard record id ${create.body.result.id} — *.${PREVIEW_DOMAIN} -> proxied placeholder. Propagation is usually immediate on Cloudflare NS.`);

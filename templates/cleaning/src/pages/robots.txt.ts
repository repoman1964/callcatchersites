import type { APIRoute } from 'astro';
import { biz, preview } from '../lib/site';

// AI answer engines are explicitly invited in. Preview sites (not yet sold) stay out of every index.
const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'PerplexityBot', 'Claude-Web', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Googlebot', 'Bingbot', 'cohere-ai', 'Diffbot'];

const live = [
  '# ─── General crawlers ───',
  'User-agent: *',
  'Allow: /',
  '',
  '# ─── AI search & answer engines (keep visible for GEO / AI Overviews) ───',
  ...AI_BOTS.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']),
  `Sitemap: ${biz.url}/sitemap-index.xml`,
  '',
];
const previewOnly = ['# Preview site: not for indexing.', 'User-agent: *', 'Disallow: /', ''];

export const GET: APIRoute = () =>
  new Response((preview.enabled ? previewOnly : live).join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

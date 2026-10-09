// Wildcard preview host: {slug}.callcatcher.site -> sites/{slug}/ served as static assets.
// run_worker_first = true, so every request lands here and the subdomain maps to its folder.
const ZONE = '.callcatcher.site';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === 'callcatcher.site' || host === 'www.callcatcher.site') {
      return new Response('Preview sites live at <slug>.callcatcher.site.\n', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    if (!host.endsWith(ZONE)) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });

    const slug = host.slice(0, -ZONE.length);
    if (!/^[a-z0-9-]+$/.test(slug)) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });

    // The template builds file format (trailingSlash 'never', page -> page.html), and
    // html_handling = "none" makes the asset server match paths exactly, so no redirect
    // can leak the internal /{slug} prefix. Resolve clean URLs to files here:
    // / -> index.html, /about or /about/ -> about.html (then about/index.html).
    let p = url.pathname;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    const last = p.split('/').pop();
    const candidates = p === '/' ? ['/index.html']
      : last.includes('.') ? [p]
      : [`${p}.html`, `${p}/index.html`];

    let res;
    for (const c of candidates) {
      res = await env.ASSETS.fetch(new Request(new URL(`/${slug}${c}${url.search}`, request.url), request));
      if (res.status !== 404) return res;
    }

    const notFound = await env.ASSETS.fetch(new Request(new URL(`/${slug}/404.html`, request.url), request));
    return notFound.status === 200 ? new Response(notFound.body, { ...notFound, status: 404 }) : res;
  },
};

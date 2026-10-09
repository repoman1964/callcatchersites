// Step 3.2 — one content JSON per lead: leads/{slug}/site.json
// Mechanical (no LLM): business details, hours, reviews word for word, theme, services from the starter pack.
// LLM (Claude): hero, story, about, contact copy, meta tags and the 6 area pages, written only from the listing,
// the reviews and data/atlanta-areas.json. Every result is checked against the template's zod schema plus a
// banned-claims guard; errors go back to the model (up to 2 retries).
//
// Usage: node content.mjs [--only slug,slug] [--limit N] [--force] [--concurrency 4]
//        node content.mjs --only slug --llm-file path.json   (skip the API; use a saved LLM answer)
//        node content.mjs --only slug --print-prompt         (show what the model would get)
// Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). pipeline/.env is loaded if present.
import { existsSync, readFileSync, appendFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import {
  ROOT, TEMPLATE, PREVIEW_DOMAIN, readJson, writeJson, leadDir, cliArgs, selectedLeads, slugify, km, pool,
} from './lib.mjs';

const { siteSchema } = await import(join(TEMPLATE, 'src/content-schema.ts'));

const MODEL = 'claude-sonnet-5-5';
const PRICE = { input: 2 / 1e6, output: 10 / 1e6, cacheRead: 0.2 / 1e6, cacheWrite: 2.5 / 1e6 };
const MAX_RETRIES = 2;
const STATE = 'GA';

const pack = readJson(join(TEMPLATE, 'starter-pack/cleaning.json'));
const facts = readJson(join(ROOT, 'pipeline/data/atlanta-areas.json'));
const example = readJson(join(TEMPLATE, 'src/data/site.json'));

// ── LLM output contract ────────────────────────────────────────────────────
// Only the parts the model writes. Counts and lengths are enforced afterwards by the template schema,
// so the errors the model sees are the same ones a build would raise.
const metaZ = z.object({ title: z.string(), description: z.string() });
const llmSchema = z.object({
  business_description: z.string(),
  home: z.object({
    meta: metaZ,
    hero_heading: z.string(),
    hero_sub: z.string(),
    story_heading: z.string(),
    story_heading_em: z.string(),
    story_paragraphs: z.array(z.string()),
    areas_intro: z.string(),
    featured_blurb: z.string(),
    featured_caption: z.string(),
    final_cta_heading: z.string(),
    final_cta_body: z.string(),
  }),
  about: z.object({
    meta: metaZ,
    hero_sub: z.string(),
    story_paragraphs: z.array(z.string()),
    values: z.array(z.object({ title: z.string(), text: z.string() })),
    cta_heading: z.string(),
  }),
  contact: z.object({ meta: metaZ, hero_sub: z.string() }),
  areas: z.array(z.object({
    slug: z.string(),
    meta: metaZ,
    hero_text: z.string(),
    about_heading: z.string(),
    about_paragraphs: z.array(z.string()),
    services_intro: z.string(),
    cta_body: z.string(),
    faq_heading: z.string(),
    faq_intro: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    spotlight_blurb: z.string(),
  })),
});

// Claims the model may only make when the listing or reviews already say them (docs/content-json.md).
// [pattern in the copy, label, extra pattern that also counts as support in the source (Spanish listings)]
const GUARDED = [
  [/insur(ed|ance)/i, 'insurance', /asegurad|seguro/i],
  [/bonded|bonding/i, 'bonding'],
  [/background[- ]check/i, 'background checks'],
  [/guarantee/i, 'guarantees', /garantiz/i],
  [/\b(since|established|founded)\b[^.]{0,20}\b(19|20)\d\d\b/i, 'founding year', /(desde|establecid[ao]|fundad[ao])[^.]{0,20}(19|20)\d\d/i],
  [/\b\d+\+?\s+years?\b/i, 'years in business', /\d+\s+años/i],
  [/\$\s?\d/, 'prices'],
  [/\b(eco|green|non-toxic|organic)\b/i, 'eco/green products', /ecol[oó]gic|org[aá]nic/i],
  [/\b(team of|staff of)\s+\d+/i, 'staff counts'],
];

const SYSTEM = `You write website copy for small, local house-cleaning businesses in Metro Atlanta. Each site is a free preview built from the business's public Google Business Profile, shown to the owner before they decide to buy it. The copy has to be accurate about that business, because the owner will read every line.

Hard rules:
1. Only state facts that the listing, its reviews or the area fact sheet support. Never invent prices, years in business, founding dates, insurance or bonding, background checks, guarantees, eco/green products, staff counts, awards or certifications. If the listing or reviews say one of these, you may use it, phrased as they do.
2. Name a person (owner or cleaner) only if the reviews or listing name them, and only in a way the reviews support (for example "clients often mention Maria by name").
3. Write in English. If the listing description is in another language, use its facts but write in English. Never quote reviews; the site shows them separately, word for word.
4. Voice: first person plural ("we"), warm, plain, specific. Short sentences. No hype words like "premier", "top-notch", "unparalleled" or "one-stop". Use the business name sparingly: once or twice per page is plenty.
5. Area pages: write only from that area's facts (places, housing, notes) and its listed conditions. The 3 about_paragraphs follow place -> condition -> our method: paragraph 1 describes the places and housing, paragraph 2 the 1-2 cleaning conditions that housing creates, paragraph 3 how we handle them (use the condition's method text). Together they must run 200-260 words. Every place you name must come from that area's places list.
6. Area FAQ: exactly 5 items, phrased the way a homeowner talks. Each question names one of that area's places. The 5th question cross-sells a specialty service (Airbnb/short-term rental turnovers, post-construction cleaning or office cleaning). Answers are 1-3 sentences and promise nothing rule 1 forbids.
7. Length limits are hard: every meta.title at most 60 characters, every meta.description at most 150 characters. Count before you answer. Area meta titles lead with the service that area's housing needs most, for example "Deep Cleaning in Tucker, GA". Leave the business name out of a meta title if it would push the title over 60 characters.
8. Write one entry in areas[] for every area you are given, in the same order, and copy each slug exactly.

Field guide:
- business_description: one sentence, at most 160 characters: what the business does and where.
- home.hero_heading: at most 7 words; names the trade and the place (city or Metro Atlanta).
- home.hero_sub: 1-2 sentences on what they clean and how to get a quote (call, text or the form).
- home.story_heading + story_heading_em: a phrase split in two, e.g. "Cleaning done with" + "care and consistency". Take the theme from what reviewers actually praise.
- home.story_paragraphs: exactly 2 paragraphs, 50-80 words each, grounded in the listing and the themes reviewers repeat. Do not quote reviews.
- home.areas_intro: one sentence naming the home city and the parts of the metro served.
- home.featured_blurb: one sentence about the featured (first) area. home.featured_caption: a short line, at most 8 words.
- home.final_cta_heading / final_cta_body: a short question-style heading and one or two sentences inviting a call, text or quote request.
- about.story_paragraphs: 3-4 paragraphs, 50-90 words each: who they are and where, who they clean for, how they work (from the listing, services and review themes), and an invitation to reach out.
- about.values: exactly 6 short {title, text} pairs. Titles are 2-3 words; text is one sentence. Only values the listing or reviews support, or that the starter pack's process already promises (free quotes, a checklist, bringing supplies, easy to reach, flexible scheduling, no long-term contracts).
- about.cta_heading: a short question.
- contact.hero_sub: one or two sentences: call, text or send the form, and we'll confirm a quote and time.
- areas[].hero_text: 2 sentences describing the housing in that area.
- areas[].about_heading: names the city and its main cleaning condition.
- areas[].services_intro: 2 sentences on which of our services fit that area's housing. Do not invent statistics like "most requested".
- areas[].cta_body: 1-2 sentences inviting a quote, naming the city.
- areas[].faq_heading: "House Cleaning FAQ for <City>, GA". faq_intro: one short sentence.
- areas[].spotlight_blurb: one sentence, at most 30 words.

Return only the JSON object.`;

// ── Mechanical assembly ────────────────────────────────────────────────────
const fill = (v, t) =>
  typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (m, k) => (k in t ? String(t[k]) : m))
  : Array.isArray(v) ? v.map((x) => fill(x, t))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, t)]))
  : v;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const hhmm = (t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
/** DataForSEO timetable -> schema.org OpeningHoursSpecification, grouping consecutive days with the same hours. */
function hoursSpec(tt) {
  if (!tt) return [];
  const out = [];
  for (const day of DAYS) {
    for (const slot of tt[day] ?? []) {
      let opens = hhmm(slot.open), closes = hhmm(slot.close);
      if (opens === '00:00' && closes === '00:00') closes = '23:59';
      const name = day[0].toUpperCase() + day.slice(1);
      const last = out[out.length - 1];
      const prevDay = last && DAYS[DAYS.indexOf([].concat(last.dayOfWeek).at(-1).toLowerCase()) + 1];
      if (last && last.opens === opens && last.closes === closes && prevDay === day) last.dayOfWeek = [].concat(last.dayOfWeek, name);
      else out.push({ dayOfWeek: name, opens, closes });
    }
  }
  return out;
}

function phone(raw) {
  const d = raw.replace(/\D/g, '').slice(-10);
  return { phone: `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`, phone_e164: `+1${d}` };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Top 5 by Google's relevance rank, shown newest first. Text is never edited; names become "First L.". */
function pickReviews(reviews) {
  return reviews.slice(0, 5)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .map((r) => {
      const parts = (r.reviewer ?? 'Google reviewer').trim().split(/\s+/);
      const name = parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.` : parts[0];
      const dt = new Date(String(r.timestamp).replace(' +00:00', 'Z').replace(' ', 'T'));
      return { name, rating: r.rating, date: `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`, text: r.text };
    });
}

/** Featured area = the lead's own city (else the nearest fact-file city); the other 5 are nearest to the lead. */
function pickAreas(listing) {
  const here = { lat: listing.lat, lng: listing.lng };
  const city = (listing.address_info?.city ?? '').toLowerCase();
  const byDist = [...facts.areas].sort((a, b) => km(here, a) - km(here, b));
  const featured = facts.areas.find((a) => a.city.toLowerCase() === city) ?? byDist[0];
  return [featured, ...byDist.filter((a) => a !== featured).slice(0, 5)];
}

const conditionText = (ids) => pack.area_essay.conditions.filter((c) => ids.includes(c.id)).map(({ id, condition, method }) => ({ id, condition, method }));

function assemble(lead, areaFacts) {
  const L = lead.listing;
  const hqCity = L.address_info?.city || areaFacts[0].city;
  const t = {
    brand: L.title.trim(),
    city: areaFacts[0].city,
    state: STATE,
    region: facts.region,
    hq: `${hqCity}, ${STATE}`,
    nearby1: areaFacts[1].city,
    nearby2: areaFacts[2].city,
    rating: Number(L.rating).toFixed(1),
  };
  const upgrades = Object.values(L.attributes).flat().map((a) => pack.trust_defaults.listing_attribute_upgrades[a]).filter(Boolean);
  const areaSlugs = areaFacts.map((a) => `${slugify(a.city)}-ga`);
  const reviews = pickReviews(lead.reviews);

  const base = {
    theme: lead.theme,
    preview: { enabled: true },
    business: {
      name: t.brand,
      url: `https://${lead.slug}.${PREVIEW_DOMAIN}`,
      description: '',
      ...phone(L.phone),
      email: '',
      address: {
        ...(L.address_info?.address ? { streetAddress: L.address_info.address } : {}),
        addressLocality: hqCity,
        addressRegion: STATE,
        ...(L.address_info?.zip ? { postalCode: L.address_info.zip } : {}),
        addressCountry: 'US',
      },
      geo: { lat: L.lat, lng: L.lng },
      hours: hoursSpec(L.work_time),
      price_range: pack.price_range,
      schema_types: pack.schema_types,
      same_as: [lead.maps_url].filter(Boolean),
      facebook: '',
      rating: L.rating,
      review_count: L.review_count,
      google_place_id: L.place_id ?? '',
      trade: pack.trade,
      region: facts.region,
      hq: t.hq,
      owner_pronoun_line: pack.owner_pronoun_line,
      logo: '',
      og_image: '/images/og.webp',
    },
    lead: { form_submit_url: '', notify_url: '', maps_embed_key: '' },
    trust_points: [...fill(pack.trust_defaults.trust_points, t), ...upgrades],
    categories: fill(pack.categories, t),
    reviews,
    tokens: t,
    areaSlugs,
  };
  return base;
}

/** Merge the LLM answer into the mechanical base -> full content JSON in the template's shape. */
function merge(base, areaFacts, llm) {
  const t = base.tokens;
  const featured = base.areaSlugs[0];
  const byslug = new Map(llm.areas.map((a) => [a.slug, a]));
  return clampAllMetas({
    theme: base.theme,
    preview: base.preview,
    business: { ...base.business, description: llm.business_description },
    lead: base.lead,
    trust_points: base.trust_points,
    home: {
      meta: llm.home.meta,
      hero: { heading: llm.home.hero_heading, sub: llm.home.hero_sub, bg: '/images/hero.webp' },
      trust_bar: fill(pack.trust_defaults.trust_bar, t),
      services: pack.home.services,
      story: {
        heading: llm.home.story_heading,
        heading_em: llm.home.story_heading_em,
        paragraphs: llm.home.story_paragraphs,
        image: { src: '/images/about-team.webp', alt: `Cleaner in gloves wiping down a window frame in a ${t.region} home` },
      },
      process: pack.home.process,
      areas: {
        intro: llm.home.areas_intro,
        featured,
        featured_blurb: llm.home.featured_blurb,
        featured_image: { src: '/images/areas/area-1.webp', alt: `Clean, bright living room in a ${t.city}, ${t.state} home` },
        featured_caption: llm.home.featured_caption,
      },
      reviews_cta: pack.home.reviews_cta,
      faq: {
        heading: `House Cleaning Questions in ${t.city}, ${t.state}`,
        intro: 'Answers to what people ask most before booking a cleaner.',
        items: fill(pack.home.faq_items, t),
      },
      final_cta: { heading: llm.home.final_cta_heading, body: llm.home.final_cta_body, note: pack.home.final_cta_note },
    },
    categories: base.categories,
    areas: areaFacts.map((f, i) => {
      const a = byslug.get(base.areaSlugs[i]) ?? {};
      return {
        slug: base.areaSlugs[i],
        name: `${f.city}, ${t.state}`,
        city: f.city,
        state: t.state,
        county: f.county,
        meta: a.meta,
        hero_text: a.hero_text,
        hero_image: `/images/areas/area-${(i % 4) + 1}.webp`,
        location_note: `Free quotes for ${f.city} homes`,
        towns: f.places.slice(0, 6),
        about_heading: a.about_heading,
        about_paragraphs: a.about_paragraphs,
        glance: pack.trust_defaults.glance,
        image: { src: `/images/areas/area-${((i + 1) % 4) + 1}.webp`, alt: `Freshly cleaned home interior in ${f.city}, ${t.state}` },
        services_intro: a.services_intro,
        cta_body: a.cta_body,
        faq: { heading: a.faq_heading, intro: a.faq_intro, items: a.faq },
        spotlight_blurb: a.spotlight_blurb,
        spotlight_towns: f.places.slice(0, 6),
      };
    }),
    reviews: base.reviews,
    about: {
      meta: llm.about.meta,
      hero_sub: llm.about.hero_sub,
      story_paragraphs: llm.about.story_paragraphs,
      values_heading: 'What you can count on',
      values: llm.about.values,
      cta_badge: 'Free, No-Pressure Quote',
      cta_heading: llm.about.cta_heading,
      cta_body: `Call or text ${base.business.phone}, or send the form, and we'll get you a clear quote.`,
    },
    contact: {
      meta: llm.contact.meta,
      hero_sub: llm.contact.hero_sub,
      ...pack.contact,
    },
  });
}

/** Schema errors plus guarded claims the listing/reviews don't support, as lines the model can act on. */
function problems(site, llm, lead) {
  const out = [];
  const res = siteSchema.safeParse(site);
  if (!res.success) for (const i of res.error.issues) out.push(`${i.path.join('.') || '(root)'}: ${i.message}`);
  const allowed = [lead.listing.description ?? '', ...lead.reviews.map((r) => r.text)].join('\n');
  const written = JSON.stringify(llm);
  for (const [re, what, alt] of GUARDED) {
    const hit = written.match(re);
    if (hit && !re.test(allowed) && !alt?.test(allowed)) out.push(`Unsupported claim (${what}): "${hit[0]}" — the listing and reviews don't say this. Remove it.`);
  }
  if (llm.areas.length !== site.areas.length || site.areas.some((a, i) => !llm.areas.find((x) => x.slug === a.slug)))
    out.push(`areas[] must have exactly these slugs in order: ${site.areas.map((a) => a.slug).join(', ')}`);
  return out;
}

/** Keep meta tags inside the template schema's limits (title 70, description 155). Mechanical
 * starter-pack metas embed {brand}, which long business names blow past; drop the " | brand" tail
 * before cutting, then truncate at a word boundary. Deterministic, so no lead dies on meta length. */
function clampMeta(meta) {
  const cut = (s, n) => (s.length <= n ? s : s.slice(0, n + 1).replace(/\s+\S*$/, '').trimEnd() || s.slice(0, n).trimEnd());
  let title = String(meta.title ?? '').trim();
  if (title.length > 70 && title.includes(' | ')) title = title.split(' | ').slice(0, -1).join(' | ');
  return { ...meta, title: cut(title, 70), description: cut(String(meta.description ?? '').trim(), 155) };
}

function clampAllMetas(node) {
  if (Array.isArray(node)) node.forEach(clampAllMetas);
  else if (node && typeof node === 'object') {
    if (typeof node.title === 'string' && typeof node.description === 'string') Object.assign(node, clampMeta(node));
    Object.values(node).forEach(clampAllMetas);
  }
  return node;
}

function userPrompt(lead, base, areaFacts) {
  const L = lead.listing;
  const input = {
    business: {
      name: base.business.name,
      home_city: base.tokens.hq,
      category: L.category,
      listing_description: L.description ?? null,
      google_services: L.services,
      review_topics: L.place_topics,
      attributes: Object.values(L.attributes).flat(),
      rating: L.rating,
      review_count: L.review_count,
      hours: base.business.hours.length ? base.business.hours : 'not listed',
    },
    reviews: lead.reviews.slice(0, 10).map((r) => ({ stars: r.rating, text: r.text, owner_reply: r.owner_response ?? undefined })),
    site_services: base.categories.map((c) => ({ category: c.name, services: c.services.map((s) => s.name) })),
    areas: areaFacts.map((f, i) => ({
      slug: base.areaSlugs[i],
      featured: i === 0,
      city: f.city,
      county: f.county,
      places: f.places.slice(0, 6),
      housing: f.housing,
      notes: f.notes || undefined,
      conditions: conditionText(f.conditions),
    })),
  };
  const style = {
    note: 'Style reference only, from a fictional business. Match its tone and depth; never reuse its facts.',
    home_story: example.home.story.paragraphs,
    area: (({ hero_text, about_heading, about_paragraphs, faq }) => ({ hero_text, about_heading, about_paragraphs, faq: faq.items.slice(0, 2) }))(example.areas[0]),
  };
  return `Write the website copy for this business.\n\n<business_data>\n${JSON.stringify(input, null, 1)}\n</business_data>\n\n<style_reference>\n${JSON.stringify(style, null, 1)}\n</style_reference>`;
}

// ── Claude call with validate-and-retry ────────────────────────────────────
let client; // created on first API call, so --llm-file runs need no credentials
const usageLog = join(ROOT, 'leads/usage.jsonl');

async function generate(lead) {
  client ??= new Anthropic();
  const areaFacts = pickAreas(lead.listing);
  const base = assemble(lead, areaFacts);
  const messages = [{ role: 'user', content: userPrompt(lead, base, areaFacts) }];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
  let last;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(llmSchema) },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
    }).finalMessage();
    usage.calls++;
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;
    usage.cacheRead += res.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0;
    if (res.stop_reason === 'refusal') throw new Error(`refused: ${JSON.stringify(res.stop_details)}`);
    if (res.stop_reason === 'max_tokens') throw new Error('hit max_tokens before finishing the JSON');
    const llm = res.parsed_output;
    if (!llm) throw new Error('no parsed output');
    const site = merge(base, areaFacts, llm);
    const errs = problems(site, llm, lead);
    last = { site, llm, errs };
    if (!errs.length) break;
    messages.push({ role: 'assistant', content: res.content });
    messages.push({
      role: 'user',
      content: `That JSON has these problems:\n${errs.map((e) => `- ${e}`).join('\n')}\n\nFix every one and return the complete corrected JSON object.`,
    });
  }
  usage.cost = +(usage.input * PRICE.input + usage.output * PRICE.output + usage.cacheRead * PRICE.cacheRead + usage.cacheWrite * PRICE.cacheWrite).toFixed(4);
  return { ...last, usage };
}

// ── Run ────────────────────────────────────────────────────────────────────
const envFile = join(ROOT, 'pipeline/.env');
if (existsSync(envFile))
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }

const args = cliArgs();
const llmFile = process.argv.includes('--llm-file') ? process.argv[process.argv.indexOf('--llm-file') + 1] : null;
const leads = selectedLeads(args).filter((l) => args.force || llmFile || !existsSync(join(leadDir(l.slug), 'site.json')));
console.log(`Content for ${leads.length} lead(s) with ${llmFile ? `saved answer ${llmFile}` : MODEL}`);

if (process.argv.includes('--print-prompt')) {
  for (const { slug } of leads) {
    const lead = readJson(join(leadDir(slug), 'lead.json'));
    const areaFacts = pickAreas(lead.listing);
    console.log(userPrompt(lead, assemble(lead, areaFacts), areaFacts));
  }
  process.exit(0);
}

const results = await pool(leads, args.concurrency ?? 4, async ({ slug }) => {
  const lead = readJson(join(leadDir(slug), 'lead.json'));
  try {
    let out;
    if (llmFile) {
      const areaFacts = pickAreas(lead.listing);
      const base = assemble(lead, areaFacts);
      const llm = llmSchema.parse(readJson(llmFile));
      const site = merge(base, areaFacts, llm);
      out = { site, llm, errs: problems(site, llm, lead), usage: { calls: 0, cost: 0 } };
    } else out = await generate(lead);
    writeJson(join(leadDir(slug), 'llm.json'), out.llm);
    if (out.errs.length) {
      writeJson(join(leadDir(slug), 'site.invalid.json'), out.site);
      console.log(`FAIL  ${slug}  (${out.usage.calls} calls, $${out.usage.cost})\n${out.errs.map((e) => `        - ${e}`).join('\n')}`);
    } else {
      writeJson(join(leadDir(slug), 'site.json'), out.site);
      rmSync(join(leadDir(slug), 'site.invalid.json'), { force: true });
      console.log(`OK    ${slug}  (${out.usage.calls} call${out.usage.calls === 1 ? '' : 's'}, $${out.usage.cost})`);
    }
    if (!llmFile) appendFileSync(usageLog, JSON.stringify({ slug, at: new Date().toISOString(), model: MODEL, ok: !out.errs.length, ...out.usage }) + '\n');
    return { slug, ok: !out.errs.length, cost: out.usage.cost };
  } catch (e) {
    console.log(`ERROR ${slug}: ${e.message}`);
    return { slug, ok: false, cost: 0 };
  }
});

const ok = results.filter((r) => r.ok).length;
const cost = results.reduce((s, r) => s + r.cost, 0);
console.log(`\n${ok}/${results.length} content JSONs valid | API cost $${cost.toFixed(2)}${results.length ? ` ($${(cost / results.length).toFixed(3)}/lead)` : ''}`);
process.exitCode = ok === results.length ? 0 : 1;

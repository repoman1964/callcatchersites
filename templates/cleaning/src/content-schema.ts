// The content-JSON contract. One file per business; step 3 of the sprint has an LLM write it.
// Every rule here exists so a preview never ships thin, half-filled or mislabeled pages.
// Field reference for humans and prompts: docs/content-json.md
import { z } from 'astro/zod';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const minWords = (n: number) => (arr: string[]) => words(arr.join(' ')) >= n;

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase-hyphenated slug');
const image = z.object({ src: text, alt: text });
const meta = z.object({
  title: text.max(70, 'meta title over 70 chars'),
  description: text.max(155, 'meta description over 155 chars (Google truncates it)'),
});
const faq = (min: number) =>
  z.object({
    heading: text,
    intro: text,
    items: z.array(z.object({ q: text, a: text })).min(min, `needs at least ${min} FAQ items`),
  });

const hoursSpec = z.object({
  dayOfWeek: z.union([text, z.array(text)]),
  opens: z.string().regex(/^\d{2}:\d{2}$/),
  closes: z.string().regex(/^\d{2}:\d{2}$/),
});

const service = z.object({
  slug,
  name: text,
  meta,
  summary: text,
  hero_image: text,
  image,
  body: z.array(text).min(2).refine(minWords(150), 'service body under 150 words'),
  benefits: z.array(text).min(6, 'needs 6 "what\'s included" bullets'),
  sidebar_heading: text,
  faq: faq(6),
});

const category = z.object({
  slug,
  name: text,
  description: text,
  image,
  services: z.array(service).min(3),
  hub: z.object({
    meta,
    hero_sub: text,
    services_intro: text,
    why_points: z.array(text).min(3),
    band_label: text,
    band_heading: text,
    faq: faq(4),
  }),
});

const area = z.object({
  slug,
  name: text, // "Decatur, GA"
  city: text,
  state: z.string().length(2),
  county: text, // used in copy and to keep reviews headings honest
  meta,
  hero_text: text,
  hero_image: text,
  location_note: text,
  towns: z.array(text).min(4),
  card_towns: text.optional(),
  about_heading: text,
  // The local essay: place -> condition -> our method.
  about_paragraphs: z.array(text).length(3).refine(minWords(180), 'area essay under 180 words'),
  glance: z.array(text).min(4),
  image,
  services_intro: text,
  cta_body: text,
  faq: faq(5),
  spotlight_blurb: text,
  spotlight_towns: z.array(text).min(4),
});

export const siteSchema = z
  .object({
    theme: z.enum(['fresh', 'classic', 'warm']),
    preview: z.object({
      enabled: z.boolean(), // demo site: noindex + robots.txt disallow
    }),
    business: z.object({
      name: text,
      url: z.url(),
      description: text,
      phone: text, // "(404) 555-0142"
      phone_e164: z.string().regex(/^\+1\d{10}$/, 'E.164 US number, e.g. +14045550142'),
      email: z.string(), // may be empty: Maps rarely has one
      address: z.object({
        streetAddress: z.string().optional(),
        addressLocality: text,
        addressRegion: z.string().length(2),
        postalCode: z.string().optional(),
        addressCountry: z.literal('US'),
      }),
      geo: z.object({ lat: z.number(), lng: z.number() }),
      hours: z.array(hoursSpec),
      price_range: text,
      schema_types: z.array(text).min(1),
      same_as: z.array(z.string()),
      facebook: z.string(),
      rating: z.number().min(1).max(5),
      review_count: z.number().int().min(0),
      google_place_id: z.string(),
      trade: text, // "House Cleaning"
      region: text, // "Metro Atlanta"
      hq: text, // "Decatur, GA"
      owner_pronoun_line: text,
      logo: z.string(), // empty = text wordmark
      og_image: text,
    }),
    lead: z.object({
      form_submit_url: z.string(),
      notify_url: z.string(),
      maps_embed_key: z.string(),
    }),
    trust_points: z.array(text).min(3),
    home: z.object({
      meta,
      hero: z.object({ heading: text, sub: text, bg: text }),
      trust_bar: z.array(text).length(4),
      services: z.object({ label: text, intro: text, mid_cta: text }),
      story: z.object({ heading: text, heading_em: text, paragraphs: z.array(text).min(2), image }),
      process: z.object({ heading: text, intro: text, steps: z.array(z.object({ title: text, text })).length(4), note: text }),
      areas: z.object({ intro: text, featured: slug, featured_blurb: text, featured_image: image, featured_caption: text }),
      reviews_cta: text,
      faq: faq(5),
      final_cta: z.object({ heading: text, body: text, note: text }),
    }),
    categories: z.array(category).min(2).max(2),
    areas: z.array(area).min(6, 'needs 6 service areas'),
    reviews: z.array(z.object({ name: text, rating: z.number().min(1).max(5), date: text, text })).min(5, 'needs 5 reviews'),
    about: z.object({
      meta,
      hero_sub: text,
      story_paragraphs: z.array(text).min(3),
      values_heading: text,
      values: z.array(z.object({ title: text, text })).min(3),
      cta_badge: text,
      cta_heading: text,
      cta_body: text,
    }),
    contact: z.object({
      meta,
      hero_sub: text,
      phone_note: text,
      email_note: text,
      steps_heading: text,
      steps: z.array(z.object({ title: text, when: text, text })).length(4),
    }),
  })
  .superRefine((d, ctx) => {
    const services = d.categories.flatMap((c) => c.services);
    if (services.length < 6) ctx.addIssue({ code: 'custom', path: ['categories'], message: 'needs 6 services across both categories' });
    if (!d.areas.some((a) => a.slug === d.home.areas.featured))
      ctx.addIssue({ code: 'custom', path: ['home', 'areas', 'featured'], message: `featured area "${d.home.areas.featured}" is not in areas[]` });
    const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
    for (const [path, xs] of [
      ['categories', d.categories.map((c) => c.slug)],
      ['services', services.map((s) => s.slug)],
      ['areas', d.areas.map((a) => a.slug)],
    ] as const)
      if (dupes([...xs]).length) ctx.addIssue({ code: 'custom', path: [path], message: `duplicate slugs: ${dupes([...xs]).join(', ')}` });
  });

export type SiteData = z.infer<typeof siteSchema>;

/** Throws one readable error listing every problem, so a bad JSON fails the build loudly. */
export function parseSite(raw: unknown, source: string): SiteData {
  const res = siteSchema.safeParse(raw);
  if (res.success) return res.data;
  const lines = res.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
  throw new Error(`Content JSON ${source} failed validation:\n${lines.join('\n')}`);
}

// Single source of truth for page content. Every template reads from here.
// The content JSON defaults to src/data/site.json; set SITE_DATA=path/to/lead.json to build another business.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSite } from '../content-schema';

const dataPath = resolve(process.env.SITE_DATA ?? 'src/data/site.json');
const data = parseSite(JSON.parse(readFileSync(dataPath, 'utf8')), dataPath);

export const site = data;
export const biz = data.business;
export const lead = data.lead;
export const preview = data.preview;

export type Category = (typeof data.categories)[number];
export type Service = Category['services'][number];
export type Area = (typeof data.areas)[number];
export type Faq = { heading?: string; intro?: string; items: { q: string; a: string }[] };

export const telHref = `tel:${biz.phone_e164}`;
export const smsHref = `sms:${biz.phone_e164}`;
export const mailHref = `mailto:${biz.email}`;
export const categories = data.categories;
export const areas = data.areas;
export const reviews = data.reviews;
export const trustPoints = data.trust_points;

/** "Atlanta, GA" — the city every service page targets (the featured area). */
export const primaryArea = areas.find((a) => a.slug === data.home.areas.featured) ?? areas[0];
export const primaryCity = primaryArea.name;

export const categoryHref = (c: { slug: string }) => `/services/${c.slug}`;
export const serviceHref = (c: { slug: string }, s: { slug: string }) => `/services/${c.slug}/${s.slug}`;
export const areaHref = (a: { slug: string }) => `/areas/${a.slug}`;

export const allServices = categories.flatMap((c) => c.services.map((s) => ({ ...s, category: c })));

/** Google's "write a review" link for this listing (falls back to a Maps search). */
export const reviewHref = biz.google_place_id
  ? `https://search.google.com/local/writereview?placeid=${biz.google_place_id}`
  : `https://www.google.com/maps/search/${encodeURIComponent(`${biz.name} ${biz.hq}`)}`;

/** Absolute URL on the business domain; no trailing slash except the root. */
export const absUrl = (path: string) => (path === '/' || path === '' ? `${biz.url}/` : biz.url + path.replace(/\/$/, ''));

export const year = new Date().getFullYear();

/** business.hours uses schema.org OpeningHoursSpecification; this turns it into display rows. */
const DAY = (d: string) => d.replace('https://schema.org/', '').slice(0, 3);
const clock = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  if (h === 0 && m === 0) return '12:00 AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
// Maps listings without hours still get one row, so the Hours blocks never render empty.
export const hours = !biz.hours.length ? [{ days: 'Call or text', time: 'By appointment' }] : biz.hours.map((h) => {
  const days = ([] as string[]).concat(h.dayOfWeek).map(DAY);
  const allDay = h.opens === '00:00' && (h.closes === '23:59' || h.closes === '00:00');
  return {
    days: days.length > 2 ? `${days[0]}–${days[days.length - 1]}` : days.join(', '),
    time: allDay ? 'Open 24 hours' : `${clock(h.opens)} – ${clock(h.closes)}`,
  };
});

export { cta, booking } from '../data/niche';

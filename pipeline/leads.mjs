// Step 3.1 — pick the leads to build and write one input file per lead.
// Reads the newest discover output (raw business_info, qualified CSV, reviews) and joins it by cid.
// Writes leads/{slug}/lead.json and leads/index.json (build order + theme rotation).
// Usage: node leads.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DISCOVER_OUT, LEADS, THEMES, latest, parseCsv, readJson, writeJson, slugify, leadDir } from './lib.mjs';

const NICHE = 'house_cleaning';
// The cleaning template fits these Maps categories only; carpet, pressure washing, painting etc. need their own template.
const CATEGORIES = new Set(['House cleaning service', 'Cleaning service', 'Janitorial service']);
// Names that say another trade even under a cleaning category ("Scott Pressure Washing", "Junk removal + handyman").
const OTHER_TRADE = /pressure|power ?wash|carpet|junk|remodel|landscap|\brugs?\b|detail|handyman|painting/i;
const MIN_TEXT_REVIEWS = 5;
const REVIEW_MIN_CHARS = 20;
const MIN_REVIEW_STARS = 4;

const nicheDir = join(DISCOVER_OUT, NICHE);
const rawPath = latest(nicheDir, 'raw-');
const qualifiedPath = latest(nicheDir, 'qualified-', '.csv');
// discover.py has written reviews both to out/ and out/{niche}/; take the newest of either.
const reviewsPath = [latest(nicheDir, 'reviews-2'), latest(DISCOVER_OUT, 'reviews-2')].filter(Boolean).sort((a, b) =>
  a.split('reviews-')[1].localeCompare(b.split('reviews-')[1])).pop();
if (!rawPath || !qualifiedPath || !reviewsPath) {
  console.error('Missing discover output. Run: python3 discover/discover.py --niche house_cleaning --reviews');
  process.exit(1);
}
console.log(`raw:       ${rawPath}\nqualified: ${qualifiedPath}\nreviews:   ${reviewsPath}`);

const raw = new Map(readJson(rawPath).map((r) => [String(r.cid), r]));
const qualified = parseCsv(readFileSync(qualifiedPath, 'utf8'));
const reviews = new Map(readJson(reviewsPath).map((r) => [String(r.cid), r]));

const textReviews = (rec) =>
  (rec?.reviews ?? []).filter((v) => (v.review_text ?? '').trim().length >= REVIEW_MIN_CHARS && (v.rating ?? 0) >= MIN_REVIEW_STARS);

const skipped = [];
const picked = [];
for (const q of qualified) {
  const why =
    !CATEGORIES.has(q.category) ? `category "${q.category}"`
    : OTHER_TRADE.test(q.title) ? 'name says another trade'
    : !raw.has(q.cid) ? 'no raw listing'
    : !reviews.has(q.cid) ? 'no reviews fetched'
    : textReviews(reviews.get(q.cid)).length < MIN_TEXT_REVIEWS ? `under ${MIN_TEXT_REVIEWS} text reviews`
    : null;
  if (why) { skipped.push({ title: q.title, why }); continue; }
  picked.push(q);
}
picked.sort((a, b) => Number(b.score) - Number(a.score));

const used = new Set();
const index = [];
for (const [i, q] of picked.entries()) {
  const r = raw.get(q.cid);
  let slug = slugify(r.title);
  if (used.has(slug)) slug = `${slug}-${slugify(r.address_info?.city ?? 'ga')}`.slice(0, 50);
  for (let n = 2; used.has(slug); n++) slug = `${slug}-${n}`;
  used.add(slug);

  const lead = {
    slug,
    theme: THEMES[i % THEMES.length],
    score: Number(q.score),
    site_status: q.site_status,
    maps_url: q.maps_url,
    listing: {
      cid: String(r.cid), place_id: r.place_id, title: r.title, category: r.category,
      additional_categories: r.additional_categories, description: r.description,
      phone: r.phone, address: r.address, address_info: r.address_info,
      lat: r.latitude, lng: r.longitude,
      rating: r.rating?.value, review_count: r.rating?.votes_count, rating_distribution: r.rating_distribution,
      work_time: r.work_time?.work_hours?.timetable ?? null,
      attributes: r.attributes?.available_attributes ?? {},
      place_topics: r.place_topics ?? {},
      services: (r.services ?? []).map((s) => s.title).filter(Boolean),
      contact_info: r.contact_info ?? [],
      is_claimed: r.is_claimed,
    },
    reviews: textReviews(reviews.get(q.cid)).map((v) => ({
      rank: v.rank, rating: v.rating, reviewer: v.reviewer, timestamp: v.timestamp, text: v.review_text,
      owner_response: v.owner_response ?? null,
    })),
  };
  writeJson(join(leadDir(slug), 'lead.json'), lead);
  index.push({ slug, name: r.title, city: r.address_info?.city ?? '', theme: lead.theme, score: lead.score, cid: lead.listing.cid });
}

writeJson(join(LEADS, 'index.json'), {
  generated: new Date().toISOString(),
  sources: { raw: rawPath, qualified: qualifiedPath, reviews: reviewsPath },
  leads: index,
  skipped,
});
console.log(`\nLeads: ${index.length} written to leads/ | skipped ${skipped.length} of ${qualified.length} qualified`);
const reasons = {};
for (const { why } of skipped) {
  const k = why.startsWith('category') ? 'other category' : why;
  reasons[k] = (reasons[k] ?? 0) + 1;
}
console.log('Skipped:', reasons);

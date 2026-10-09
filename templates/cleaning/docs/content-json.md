# Content JSON reference (house-cleaning template)

One JSON file per business. It renders the whole site. `src/content-schema.ts` is the source of truth, and a build fails with a list of every problem if the JSON breaks a rule. `src/data/site.json` is a complete worked example (a fictional business). `starter-pack/cleaning.json` is the niche floor to fill from.

Build any file: `SITE_DATA=path/to/lead.json npx astro build --outDir dist/<slug> && node scripts/kai-check.mjs dist/<slug>`

## Hard rules (enforced at build)
- 2 categories with 6 services in total. Each service needs 2+ body paragraphs (150+ words), 6 `benefits`, and 6 FAQ items.
- 6 areas. Each area needs exactly 3 `about_paragraphs` (180+ words), 5 FAQ items, 4+ towns, and a `county`.
- 5+ reviews. Exactly 4 `home.trust_bar` items, 4 process steps and 4 contact steps.
- Every `meta.title` is 70 characters or fewer, and every `meta.description` is 155 or fewer.
- Slugs are lowercase-hyphenated and unique. `home.areas.featured` must be one of the area slugs.
- `phone_e164` is `+1XXXXXXXXXX`. `theme` is `fresh`, `classic` or `warm`.

## Content rules (not machine-checked; the step 3 prompt must enforce them)
- Never invent prices, years in business, insurance or bonding, background checks, guarantees or staff counts. Use them only if the listing or the reviews support them.
- Use real Google reviews only, word for word. Name an owner only if the reviews name one.
- Area essays go place → condition → our method. Pick conditions from `starter-pack/cleaning.json → area_essay.conditions`. Area FAQ questions sound like a homeowner and name a neighborhood. The last one cross-sells the other category.

## Fields

| Path | What it is | Source |
| --- | --- | --- |
| `theme` | `fresh` / `classic` / `warm` | Pick one per lead (vary across a batch) |
| `preview.enabled` | Sets noindex and a robots.txt disallow | `true` until paid |
| `business.name, phone, phone_e164, email, address, geo, hours` | NAP and hours (`hours` uses schema.org OpeningHoursSpecification) | Maps listing |
| `business.url` | Site URL | `https://{slug}.callcatcher.site` |
| `business.rating, review_count, google_place_id` | Badge, reviews block and "Leave a Review" link | Maps listing |
| `business.trade, region, hq` | "House Cleaning", "Metro Atlanta", "Decatur, GA" | Pack and listing |
| `business.logo` | Empty means a text wordmark | Usually empty |
| `lead.form_submit_url, notify_url` | Form and text-widget endpoints. Empty means the form shows success only, and the widget opens SMS to the business | Empty for previews |
| `trust_points`, `home.trust_bar`, `areas[].glance` | Trust lines | Pack defaults plus listing attributes |
| `home.*` | Hero heading and sub, story (2+ paragraphs), process, featured area, FAQ (5+), final CTA | Pack plus LLM |
| `categories[].services[]` | Service pages | Pack; personalize the summary and body |
| `areas[]` | Area pages: meta lead service, hero text, essay, FAQ, towns | LLM, per lead |
| `reviews[]` | `{name, rating, date, text}` | Maps reviews: the best 5 with text, newest first |
| `about.*`, `contact.*` | About story (3+ paragraphs) and 6 values; contact notes and steps | Pack plus LLM |

Niche constants live in code, not in the JSON: CTA labels, booking windows, legal text and the theme registry are in `src/data/niche.ts`.

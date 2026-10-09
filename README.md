# CallCatcherSites — Call Catcher Sites

Repo for **Call Catcher Sites**: fast, real multi-page preview websites built for businesses with no website on their Google listing, deployed as `https://{slug}.callcatcher.site/callcatcher.site` subdomains and sold to the owner for a flat **$500 one-time**. Current market: **house cleaners in the Atlanta metro**, 57 leads selected 2026-10-07.

> **Current goal (control doc: [`first_sale_sprint.md`](first_sale_sprint.md)): the first $500 sale.**
> Funnel: 57 leads → 57 live previews → 57 calls → first close. Anything that doesn't move this forward is parked.

This README is written for a CRM agent (human or AI) working the list: it points at the authoritative data files, defines the field contracts, and states the rules that must not be broken.

---

## Program state (snapshot 2026-10-08)

| Sprint step | State |
| --- | --- |
| 1. Leads (DataForSEO Maps pull) | ✅ Done — 57 leads in `leads/` |
| 2. House-cleaning template | ✅ Done — `templates/cleaning/`, passes all 8 Kai checks |
| 3. Build + deploy previews | 🟡 In progress — **13/57 sites live**; 44 blocked on Anthropic credits, 1 DNS record pending; sheet write-back is manual |
| 4. Calls | ⬜ Not started |
| 5. Close ($500 via Stripe) | ⬜ Not started (Payment Link is live in every site's claim banner) |

**Do not trust this table over the source files.** Recompute live state from:

- `sites/report.json` — per-slug `status` (`ready` / `no content` / build failures) + `preview_url`
- `sites/previews.csv` — same data, CSV (`slug,name,city,theme,status,preview_url`), source for dialer-sheet write-back
- `leads/index.json` — full lead roster: order, `slug`, `name`, `city`, `theme`, `score`, `cid`, plus `skipped[]` with reasons
- `leads/usage.jsonl` — one line per LLM content call (cost log)

---

## Repository map

| Path | What it is |
| --- | --- |
| `discover/` | DataForSEO lead discovery (`discover.py`) → `discover/out/house_cleaning/{raw,qualified,all,leads}-*.csv|json`, `discover/out/reviews-*.json` |
| `leads/` | Selected lead roster. `index.json` (roster + ordering), `usage.jsonl` (LLM cost log), one folder per lead |
| `leads/{slug}/lead.json` | **Per-lead record** (schema below) |
| `leads/{slug}/site.json` | Generated content JSON, valid per the template schema (`site.invalid.json` + `llm.json` = failed attempt) |
| `templates/cleaning/` | The (only) template: Astro static site, 3 themes (`fresh`/`classic`/`warm`), zod schema at `src/content-schema.ts`, contract in `docs/content-json.md` |
| `pipeline/` | Build pipeline — `leads.mjs`, `content.mjs`, `build.mjs`, `deploy.mjs`, `dns.mjs`, worker config. **Ops manual: [`pipeline/README.md`](pipeline/README.md)** |
| `sites/` | Build output: `sites/{slug}/` (static site), `report.json`, `previews.csv` |
| `Template/` | Teardown of paintasticpros.com (the site structure every template mimics) |
| `first_sale_sprint.md` | **Control doc** — sprint steps, locked decisions, parked items, open questions |
| `step3_build_plan.md` | Build plan for step 3 incl. current blockers and decisions |

---

## Per-lead record — `leads/{slug}/lead.json`

```jsonc
{
  "slug":  "ag-and-ab-services",          // stable ID; URL label AND the join key for the sheet
  "theme": "fresh",                        // fresh | classic | warm (rotated by score order)
  "score": 114.3,                          // lead quality score from leads.mjs
  "site_status": "none",                   // none | built (mirrored in sites/report.json)
  "maps_url": "https://www.google.com/maps?cid=...",
  "listing": {                             // verbatim DataForSEO listing
    "cid", "place_id", "title", "category", "additional_categories",
    "description", "phone", "address", "address_info", "lat", "lng",
    "rating", "review_count", "rating_distribution", "work_time",
    "attributes", "place_topics", "services", "contact_info", "is_claimed"
  },
  "reviews": [ ... ]                       // full review text, kept verbatim downstream
}
```

Rules already baked into the pipeline (a CRM agent must not override them): reviews stay verbatim (names truncated to "First L."), non-English listing descriptions are rewritten in English, and no claim the listing doesn't support can appear in a site (settings see the claims guard in [`pipeline/README.md`](pipeline/README.md)).

---

## Dialer sheet (Google Sheets: "Calls Template" → `scrapes` tab, columns A–H)

The operational record for call work. One row per business.

| Col | Field | Source / convention |
| --- | --- | --- |
| A | GMB (Maps URL) | `lead.maps_url` |
| B | Business Name | `lead.listing.title` |
| C | Reviews Count | `lead.listing.review_count` |
| D | Niche | House cleaning |
| E | Phone | `lead.listing.phone` |
| F | Website | **Preview URL.** Write-back source: `sites/previews.csv` (manual paste for now) |
| G | City | `lead.address_info.city` |
| H | Status | Dropdown: *Website Good, Needs Website, Yes To Video, Called No Answer (1-2X), Called No Answer (3-4X), Gatekeeper, Not Interested/DND, Disconnected* |

Open question (un-confirmed, do not assume): adding **"Left Voicemail", "Texted In", "Sold"** statuses — confirm the dropdown doesn't hardcode its options before relying on them.

---

## Outbound rules — hard constraints (TCPA)

These are **locked decisions** in the control doc. No exceptions without the owner.

- Calls are **human-dialed**, voicemails left by hand. **No** ringless drops, no prerecorded messages.
- **Scrub against DNC** before dialing.
- **No outbound texting.** The only SMS path is inbound: prospects text the Google Voice number (`<Google Voice #>` — owned by the operator) after a call/voicemail.
- Voicemail script: "No website on your Google listing, so we built you a Call Catcher site. Text us at \<Google Voice #\> to get the link."
- Text-ins are replied to manually.

## Sales & closure mechanics

- Offer is flat **$500 one-time**; the doorway offer of the business (upsells parked).
- Payment: Stripe Payment Link `https://buy.stripe.com/28E8wQ3OH2K36vncEngrS0c?client_reference_id={slug}` — same link is embedded in every live site's "Claim this site" banner. The slug in `client_reference_id` is the attribution key.
- **Stripe dashboard is the source of truth for payments** (no webhook automation yet; it's a parked item).
- After payment (manual, operator-done): remove the claim banner, collect the buyer's domain and edit requests by hand. Sold sites move to the owner's domain; previews live on `*.callcatcher.site`.

---

## Product spec (what we're selling)

- Site structure: home, services, service areas, about, contact, privacy/terms — the Paintastic structure (`Template/` teardown describes the reference site).
- **Kai quality bar** — every site must pass all 8 checks (enforced by `kai-check` in `pipeline/build.mjs`):
  1. Click-to-call (`tel:` with full number)  2. Homepage lead capture  3. Not a one-pager  4. Service pages  5. Service-area pages  6. On-site reviews (verbatim from Maps)  7. Booking/request-a-time widget  8. Privacy/terms
- Content floor: 6 services + 6 service-area pages, never thin. Area essays are grounded in `pipeline/data/atlanta-areas.json` (39 metro cities) — the featured area is the lead's own city.
- Hosting: one Cloudflare Worker (`callcatcher-previews`), wildcard route `*.callcatcher.site/*`, subdomain → `sites/{slug}/` folder.

---

## Common CRM-agent tasks

- **"Who can I call right now?"** — Join `sites/report.json` (`status == "ready"`) to the dialer sheet (F ↔ preview URL). Phone is column E / `lead.listing.phone`. 13 slugs are currently `ready`.
- **"Fill in preview URLs"** — Paste `slug → preview_url` into column F from `sites/previews.csv`.
- **"Log an outcome"** — Update column H only. Outcomes beyond the dropdown list need the open question above answered first.
- **"Is this lead's site live?"** — `sites/report.json` is truth, or check `https://{slug}.callcatcher.site` directly.
- **"A prospect wants changes / a demo link"** — Note it; edits and post-sale changes are a manual, operator step (edit policy is parked). Send them the preview URL.
- **"A lead is missing / duplicated"** — Join on `cid`, not on name strings; slugs were de-duplicated at generation. `leads/index.json` → `skipped[]` records every rejected business and why.

---

## Rebuilding the pipeline (when sites are missing)

Run from `pipeline/` (ops details in [`pipeline/README.md`](pipeline/README.md)):

```sh
cd pipeline && cp .env.example .env     # ANTHROPIC_API_KEY (+ CLOUDFLARE_API_TOKEN for deploy)
node content.mjs                        # leads → site.json; skips leads with valid site.json
node build.mjs                          # sites/{slug}/ + Kai checks → report.json, previews.csv
node deploy.mjs                         # wildcard Worker, prints column-F URLs
```

Current external blockers (2026-10-08): Anthropic API credits ran out mid-run (44 leads pending, ~$12–18 to finish), and the `*` DNS record for `callcatcher.site` isn't in the zone yet (`dns.mjs` or dashboard fix). 13 sites are live; the block is on the remaining 44.

The repo root is also a bare Astro workspace (`npm run dev`, `npm run build`) used for editor/dev-server plumbing — the selling site generates from `templates/cleaning/`. Dev server must be run backgrounded: `astro dev --background` (see `AGENTS.md`).

---

## Glossary

| Term | Meaning |
| --- | --- |
| **Call Catcher site** | The product: a pre-built preview site on `{slug}.callcatcher.site` for a business with no website, meant to be claimed for $500 |
| **Claim banner** | The "$500 / Claim this site — Get the site" banner at the top of every preview; removed after sale |
| **Kai / Kai checks** | Quality criteria reverse-engineered from paintasticpros.com (a "Kai build"); enforced by `kai-check` |
| **Starter pack** | Per-niche content floor (`templates/cleaning/starter-pack/cleaning.json`): 6 services + 6 areas, service FAQs |
| **Theme** | One of 3 color/font combos: `fresh`, `classic`, `warm` — rotated across leads by score order |
| **Slug** | URL-safe de-duplicated business name; the join key for everything (URL, sheet, files) |
| **CID** | Google Business ID from DataForSEO; stable external id (`listing.cid`) |
| **Previews** | The 13+ live sites; never guaranteed sold state, only built state |
| **Parked** | Explicitly deferred until the first sale (list in the control doc) |
| **Paintastic** | Reference structure source: paintasticpros.com teardown in `Template/` |

## Doc index

- [`first_sale_sprint.md`](first_sale_sprint.md) — control doc: sprint, locked decisions, parked list
- [`step3_build_plan.md`](step3_build_plan.md) — build plan + answered decisions (hosting, Stripe, DNS)
- [`pipeline/README.md`](pipeline/README.md) — pipeline ops manual (commands, flags, LLM contract, claims guard)
- [`templates/cleaning/docs/content-json.md`](templates/cleaning/docs/content-json.md) — site content JSON contract
- [`Template/Template Teardown Paintastic Pros.md`](Template/Template%20Teardown%20Paintastic%20Pros.md) — the structure reference
- [`AGENTS.md`](AGENTS.md) — dev-workspace conventions (backgrounded dev server)

# CallCatcher Sites Machine — Control Doc (reset 2026-10-06)

> **One goal right now: the FIRST $500 SALE.** If a task doesn't move the sprint below forward, it goes in "Parked."

## THE SPRINT (only work allowed)
Market: **House cleaners, Atlanta.** Target: 50 leads -> 50 live previews -> 50 calls.

- [x] **1. Leads** — DataForSEO Maps pull: Atlanta house cleaning, no website, rating >= 4.0, reviews >= 20, minus exclusion list. ~50 rows. Append to dialer sheet ("Calls Template" -> `scrapes` tab). *Done 2026-10-07: 57 leads selected, `leads/index.json` + `leads/{slug}/lead.json` (surplus over 50 is a call-through buffer). Sheet write-back happens with the preview URLs in step 3.*
- [x] **2. Template** — ONE house-cleaning template on the Paintastic structure (home, services, service areas, about, contact, privacy/terms) + 3 color/font themes. Must pass Kai criteria. *Done 2026-10-06: `templates/cleaning/` — `npm run check` passes all 8 Kai checks; content contract in `docs/content-json.md`.*
- [ ] **3. Build** — Listing data + cleaning starter pack -> LLM -> one content JSON per lead -> render -> `{slug}.callcatcher.site` with "Claim this site - $500" banner and theme switcher. Write the preview URL into column F. *Draft plan + open questions: `step3_build_plan.md`.*
- [ ] **4. Calls** — Human-dialed, leave voicemails by hand: "No website on your Google listing, so we built you a Call Catcher site. Text us at <Google Voice #> to get the link." Reply to text-ins manually.
- [ ] **5. Close** — Stripe **Payment Link** ($500). After payment: remove the banner by hand, collect domain/edits by hand.

Done = first $500 collected. Then review what broke and un-park the next item.

## LOCKED DECISIONS
- **Product:** Call Catcher Site, $500 one-time. This is the doorway offer; upsells come later.
- **Model:** Single operator, selling sites myself. No rev share, no reselling the tool.
- **Templates (locked 2026-10-06):** 1 template per niche + 3 color/font themes. *Replaces "3 templates built up front."*
- **Content:** Starter pack floor per niche (6 services + 6 service areas, never thin), personalized from the Maps listing. One content JSON per lead.
- **Preview domain:** callcatcher.site (owned). Sold sites move to the owner's domain.
- **Outreach:** Human-dialed calls and manual voicemails only. No ringless drops or prerecorded messages (TCPA). Scrub against DNC. No outbound texting. Text-in goes to Google Voice.
- **Hosting (locked 2026-10-08):** Static assets on one Cloudflare Worker, wildcard route `*.callcatcher.site/*`, subdomain maps to its `sites/{slug}/` folder. (Pages has no wildcard custom domains.)

## PARKED UNTIL FIRST SALE (do not touch)
- More niches (painting, pest, pressure washing) and more template-library research
- Kai signature fingerprinting / scanning for more Kai sites
- Cloudflare for SaaS custom hostnames + automated domain move
- "Hosting for life" ToS wording, domain-registration add-on terms
- Stripe Checkout + webhook automation (a Payment Link is enough for now)
- Frankie Fihn-style sales video (send the link first; record the video once the first prospects bite)
- n8n inbound-text assist (Gmail -> Postgres -> Telegram)
- Twilio toll-free scale path
- Upsells (AI lead-form response, chatbot)
- Edit policy, LLM-driven post-sale edits
- Cost test (tokens per JSON, deploy time): measure it during step 3, don't plan for it
- Paintastic funnel pages (/discount, /marketing-form, /thank-you, /review)
- Price calculator (from the old root site: `src/components/PricingCalc.astro`). Post-sale upsell only, priced from the owner's real rates stored in the content JSON — never invented prices on previews. Shape: bedrooms/baths base + frequency multiplier + service multiplier + add-ons. Preview-safe variant: same inputs, no dollars, answers feed the quote form.

## OPEN QUESTIONS (answer only when the sprint hits them)
- Column F = preview URL? (default yes)
- Dialer statuses: add "Left Voicemail", "Texted In", "Sold"? Check the dialer doesn't hardcode the list.

---

## REFERENCE

### Kai criteria (every site must pass)
1. Click-to-call (`tel:` with full number)
2. Homepage lead capture (form/quote CTA)
3. Not a one-pager (2+ real internal pages)
4. Service pages
5. Service areas
6. On-site reviews (from Maps)
7. Booking calendar (request-a-time widget is fine)
8. Privacy / terms

### Dialer sheet mapping (Calls Template -> scrapes, A:H)
A GMB (Maps URL from place_id/cid) · B Business Name · C Reviews Count · D Niche · E Phone · F Website (= preview URL) · G City · H Status ("Set Status" dropdown: Website Good, Needs Website, Yes To Video, Called No Answer (1-2X), Called No Answer (3-4X), Gatekeeper, Not Interested/DND, Disconnected)

### Template source: paintasticpros.com (Kai build)
- Astro static site, 23 indexed pages: Home, 2 category hubs, 8 service pages, 8 area pages (unique local essay + FAQ), About, Contact, Privacy, Terms.
- Full teardown: Claude Doc "Template Teardown: Paintastic Pros" — https://claude.ai/code/artifact/0590187d-e389-4859-ad1c-c1c73febcf6d
- Other Kai sites (parked reference): honestyandintegritypestcontrolmarin.com, drpressurepowerwashing.com
- Kai copy patterns worth reusing: "Real answers, no scripts."; text CTA "This text goes straight to my personal phone…"; SMS consent line on the form; Services menu = GBP categories verbatim.

### Data notes
- DataForSEO gives name, category, attributes, place_topics, hours, address, phone, coords, rating, full reviews, Q&A, is_claimed.
- Photos: only main_image. Use review images + main_image + category stock.
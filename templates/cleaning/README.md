# House-cleaning template (Call Catcher Sites)

The sprint's step 2 template. It follows the Paintastic Pros page structure (home, 2 category hubs, 6 service pages, 6 area pages, about, contact, privacy and terms) and offers 3 color/font themes. All content comes from one content JSON per business.

```sh
npm install
npm run check                 # build + Kai criteria gate (scripts/kai-check.mjs)
astro dev --background        # local preview at http://localhost:4321
SITE_DATA=leads/acme.json npx astro build --outDir dist/acme   # build another business
```

| Where | What |
| --- | --- |
| `src/content-schema.ts` | The content-JSON contract (zod). Thin or bad JSON fails the build. |
| `docs/content-json.md` | Field reference and content rules for the step 3 LLM prompt |
| `starter-pack/cleaning.json` | Niche floor: 6 services, process, FAQ, trust defaults, area-essay conditions |
| `src/data/site.json` | Worked example: a fictional Atlanta cleaner |
| `src/data/niche.ts` | CTA ladder, booking windows, legal text, theme registry |
| `src/styles/themes.css` | `fresh` / `classic` / `warm` themes |
| `docs/image-credits.md` | Stock photo sources (Unsplash License) |

`preview.enabled: true` keeps the site out of search engines with noindex and a robots.txt disallow. Set it to `false` after payment.

Forked from `../../Template/site` (the Paintastic reference clone). The funnel pages are parked until the first sale.

# Step 3 pipeline: leads → content JSON → built preview sites

```sh
cd pipeline && npm install
cp .env.example .env          # add ANTHROPIC_API_KEY
node leads.mjs                # discover/out → leads/{slug}/lead.json + leads/index.json
node content.mjs --limit 3    # try 3 leads first; check cost per lead in the summary
node content.mjs              # the rest (skips leads that already have a valid site.json)
node build.mjs                # sites/{slug} + kai-check → sites/report.json, sites/previews.csv
node deploy.mjs               # one wildcard Worker serves every sites/{slug} at {slug}.callcatcher.site
```

| Step | Reads | Writes |
| --- | --- | --- |
| `leads.mjs` | newest `discover/out/house_cleaning/{raw,qualified}-*` and `reviews-*.json` | `leads/{slug}/lead.json`, `leads/index.json` (order, theme rotation, skip reasons) |
| `content.mjs` | lead.json, `templates/cleaning/starter-pack/cleaning.json`, `data/atlanta-areas.json` | `leads/{slug}/site.json` (valid) or `site.invalid.json` + `llm.json`, `leads/usage.jsonl` |
| `build.mjs` | `leads/{slug}/site.json` | `sites/{slug}/`, `sites/report.json`, `sites/previews.csv` |
| `deploy.mjs` | `sites/`, `wrangler.toml` | the `callcatcher-previews` Worker (`*.callcatcher.site/*` → `sites/{slug}/`), prints column-F URLs |

Deploy needs Cloudflare auth (`npx wrangler login` or `CLOUDFLARE_API_TOKEN`) and the `callcatcher.site` zone. `run_worker_first = true` is required so the worker can map the subdomain to its folder. Sheet write-back (column F) is manual: paste from `sites/previews.csv`.

Flags: `--only slug,slug`, `--limit N`, `--force` (redo content), `--concurrency N` (content, default 4), `--print-prompt` (content: show the model input, no API call).

## Lead filter (`leads.mjs`)
Maps category is House cleaning / Cleaning / Janitorial service, the name doesn't say another trade, and the lead has at least 5 reviews of 4★+ with 20+ characters of text. Theme rotates fresh → classic → warm by score order.

## What the LLM writes and what it doesn't
- **No LLM:** name, phone, address, geo, hours, rating, reviews (top 5 by Google relevance, verbatim, newest first, "First L." names), services and FAQs (starter pack), and theme. The buy button lives on the dimension7s.com lander, not on the demo site.
- **Claude (`claude-sonnet-5-5`, effort medium):** business description, home hero/story/CTA copy, about and contact copy, meta tags, and the 6 area pages. The featured area is the lead's own city, and the other 5 are the nearest cities in `data/atlanta-areas.json`.
- **Gate:** the template's zod schema plus a claims guard (insurance, bonding, background checks, guarantees, founding years, years in business, prices, eco claims, staff counts). These pass only when the listing or reviews say them. Errors go back to the model, with up to 2 retries.

To cover a new city, add it to `data/atlanta-areas.json`. Use general, verifiable facts only, because the essays are written from them.

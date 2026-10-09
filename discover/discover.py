#!/usr/bin/env python3
"""
MapsMachine — Discovery prototype
Pulls local home-service businesses from DataForSEO Business Listings,
classifies their web presence (none / social_or_directory / booking_platform /
free_builder / real_site), scores lead candidates, and writes CSV + JSON.

Setup:
  Create .env next to this script:
    DFS_LOGIN=you@example.com
    DFS_PASSWORD=api_password
  Optional settings (built-in defaults shown); CLI flags override .env:
    MAIN_NICHE=house_cleaning
    CENTER=atlanta              # metro name or lat,lng
    RADIUS_KM=40
    LIMIT=1000
    MIN_STARS=4.0               # min Google rating for qualified
    MIN_REVIEWS=5               # min reviews for qualified
    MAX_REVIEWS=200             # max reviews for qualified; 0/empty = no cap
    MIN_SOURCE_VOTES=5          # API-side review-count filter
    EXCLUDE_STATUSES=real_site  # comma list of statuses kept out of leads
    FETCH_REVIEWS=0             # 1 = pull review content for qualified listings
    REVIEW_DEPTH=10             # reviews parsed per listing (billed per 10)
    REVIEW_KEEP=5               # top relevant text reviews kept per listing in the CSV
    REVIEW_MIN_CHARS=20         # shorter reviews (or star-only) don't count as text reviews
    REVIEW_RETRY_DEPTH=20       # re-post depth for listings short on text reviews
    REVIEW_TIMEOUT=900          # seconds to poll task_get before saving pending ids
    REVIEW_LANGUAGE=English

Usage:
  python3 discover.py --list-niches                 # show niche presets
  python3 discover.py                               # default: house_cleaning, Atlanta, 40km
  python3 discover.py --niche pressure_washing
  python3 discover.py --niche landscaping --radius 25 --limit 1000
  python3 discover.py --niche painting --check      # verify category IDs return results (cheap)
  python3 discover.py --niche all                   # run every niche, one summary table
  python3 discover.py --niche painting --reviews    # + review content for qualified listings only
  python3 discover.py --center nyc                  # by metro name (bad name lists all metros)
  python3 discover.py --center 33.95,-84.55         # different center point (lat,lng)
"""
import argparse, base64, csv, json, math, os, re, sys, time
from datetime import datetime
import requests

API = "https://api.dataforseo.com/v3/business_data/business_listings/search/live"
REVIEWS_POST_API = "https://api.dataforseo.com/v3/business_data/google/reviews/task_post"
REVIEWS_GET_API = "https://api.dataforseo.com/v3/business_data/google/reviews/task_get"
REVIEW_SORT = "relevant"        # substantive reviews, not thin/fresh ones
REVIEW_TASK_BATCH = 100         # max tasks per task_post call

# ---------------------------------------------------------------------------
# Niche presets — top 10 home-service niches for selling a $500 website.
# Ranked by: owner-operator share (no marketing team), share of listings with
# no real website, ticket size (a $500 site pays back in 1-2 jobs), and how much
# buyers in that niche check a website/photos before calling.
#   categories: Google Maps category IDs searched (max 10)
#   core:       the exact-target IDs (+10 lead score)
# Run --check on a niche before a full pull to confirm each ID returns results.
# ---------------------------------------------------------------------------
NICHES = {
    "house_cleaning": {
        "label": "House cleaners / maids",
        "categories": ["house_cleaning_service", "maid_service", "cleaning_service",
                       "janitorial_service", "carpet_cleaning_service", "window_cleaning_service"],
        "core": ["house_cleaning_service", "maid_service", "cleaning_service"],
    },
    "pressure_washing": {
        "label": "Pressure / soft washing",
        "categories": ["pressure_washing_service", "power_washing_service",
                       "window_cleaning_service", "gutter_cleaning_service"],
        "core": ["pressure_washing_service", "power_washing_service"],
    },
    "landscaping": {
        "label": "Lawn care / landscaping",
        "categories": ["lawn_care_service", "landscaper", "landscape_designer",
                       "gardener", "lawn_sprinkler_system_contractor"],
        "core": ["lawn_care_service", "landscaper"],
    },
    "handyman": {
        "label": "Handyman",
        "categories": ["handyman", "general_contractor", "home_improvement"],
        "core": ["handyman"],
    },
    "painting": {
        "label": "House painters",
        "categories": ["painter", "painting", "house_painter", "drywall_contractor"],
        "core": ["painter", "house_painter"],
    },
    "junk_removal": {
        "label": "Junk removal / hauling",
        "categories": ["junk_removal_service", "rubbish_removal_service",
                       "garbage_collection_service", "demolition_contractor"],
        "core": ["junk_removal_service", "rubbish_removal_service"],
    },
    "tree_service": {
        "label": "Tree service",
        "categories": ["tree_service", "arborist_and_tree_surgeon", "stump_removal_service"],
        "core": ["tree_service", "arborist_and_tree_surgeon"],
    },
    "fencing": {
        "label": "Fence contractors",
        "categories": ["fence_contractor", "fence_supply_store", "deck_builder"],
        "core": ["fence_contractor"],
    },
    "concrete": {
        "label": "Concrete / driveways / pavers",
        "categories": ["concrete_contractor", "paving_contractor", "masonry_contractor",
                       "patio_enclosure_supplier"],
        "core": ["concrete_contractor", "paving_contractor"],
    },
    "garage_doors": {
        "label": "Garage door repair",
        "categories": ["garage_door_supplier", "garage_builder", "door_supplier"],
        "core": ["garage_door_supplier"],
    },
}
DEFAULT_NICHE = "house_cleaning"

# ---------------------------------------------------------------------------
# Metro lookup — the API only accepts location_coordinate ("lat,lng,radius");
# location_name is silently ignored by search/live. Downtown centroid per metro,
# lowercase snake_case keys. Add a metro here when real pulls need it.
# ---------------------------------------------------------------------------
METROS = {
    "atlanta": (33.7490, -84.3880),
    "charlotte": (35.2271, -80.8431),
    "raleigh": (35.7796, -78.6382),
    "durham": (35.9940, -78.8986),
    "nashville": (36.1627, -86.7816),
    "memphis": (35.1495, -90.0490),
    "birmingham": (33.5186, -86.8104),
    "jacksonville": (30.3322, -81.6557),
    "orlando": (28.5383, -81.3792),
    "tampa": (27.9506, -82.4572),
    "miami": (25.7617, -80.1918),
    "savannah": (32.0809, -81.0917),
    "charleston": (32.7765, -79.9311),
    "columbia": (34.0007, -81.0348),
    "greenville": (34.8526, -82.3940),
    "knoxville": (35.9606, -83.9207),
    "chattanooga": (35.0456, -85.3097),
    "louisville": (38.2527, -85.7585),
    "lexington": (38.0403, -84.5037),
    "richmond": (37.5407, -77.4360),
    "norfolk": (36.8508, -76.2859),
    "virginia_beach": (36.8529, -75.9780),
    "houston": (29.7604, -95.3698),
    "dallas": (32.7767, -96.7970),
    "fort_worth": (32.7555, -97.3308),
    "austin": (30.2672, -97.7431),
    "san_antonio": (29.4241, -98.4936),
    "oklahoma_city": (35.4676, -97.5164),
    "tulsa": (36.1540, -95.9928),
    "new_orleans": (29.9511, -90.0715),
    "baton_rouge": (30.4515, -91.1871),
    "little_rock": (34.7465, -92.2896),
    "chicago": (41.8781, -87.6298),
    "indianapolis": (39.7684, -86.1581),
    "columbus": (39.9612, -82.9988),
    "cleveland": (41.4993, -81.6944),
    "cincinnati": (39.1031, -84.5120),
    "detroit": (42.3314, -83.0458),
    "milwaukee": (43.0389, -87.9065),
    "minneapolis": (44.9778, -93.2650),
    "st_louis": (38.6270, -90.1994),
    "kansas_city": (39.0997, -94.5786),
    "omaha": (41.2565, -95.9345),
    "new_york": (40.7128, -74.0060),
    "philadelphia": (39.9526, -75.1652),
    "pittsburgh": (40.4406, -79.9959),
    "boston": (42.3601, -71.0589),
    "baltimore": (39.2904, -76.6122),
    "washington": (38.9072, -77.0369),
    "buffalo": (42.8864, -78.8784),
    "rochester": (43.1566, -77.6088),
    "hartford": (41.7658, -72.6734),
    "providence": (41.8240, -71.4128),
    "los_angeles": (34.0522, -118.2437),
    "san_diego": (32.7157, -117.1611),
    "san_francisco": (37.7749, -122.4194),
    "san_jose": (37.3382, -121.8863),
    "sacramento": (38.5816, -121.4944),
    "phoenix": (33.4484, -112.0740),
    "tucson": (32.2226, -110.9747),
    "las_vegas": (36.1699, -115.1398),
    "denver": (39.7392, -104.9903),
    "salt_lake_city": (40.7608, -111.8910),
    "portland": (45.5152, -122.6784),
    "seattle": (47.6062, -122.3321),
    "albuquerque": (35.0844, -106.6504),
    "honolulu": (21.3069, -157.8581),
    "anchorage": (61.2181, -149.9003),
}
ALIASES = {"nyc": "new_york", "dc": "washington", "la": "los_angeles",
           "sf": "san_francisco", "slc": "salt_lake_city"}
DEFAULT_CENTER = "atlanta"

# Web-presence taxonomy. Anything NOT on these lists counts as a real_site
# (custom domain -> the one status that isn't a lead by default). Edit the
# domain lists here when real pulls surface new URL patterns.
# Matched on domain boundaries so e.g. "maddox.com" doesn't match "x.com".
SOCIAL_OR_DIRECTORY = [
    "facebook.com", "fb.me", "fb.com", "instagram.com", "yelp.com", "linktr.ee", "linkin.bio",
    "nextdoor.com", "thumbtack.com", "homeadvisor.com", "angi.com", "angieslist.com",
    "bark.com", "tiktok.com", "x.com", "twitter.com", "wa.me", "porch.com", "houzz.com",
    "bbb.org", "yellowpages.com", "mapquest.com", "manta.com", "yellowbook.com",
    "chamberofcommerce.com",
]
BOOKING_PLATFORM = [
    "jobber.com", "getjobber.com", "booksy.com", "vagaro.com", "calendly.com",
    "square.site", "squareup.com", "housecallpro.com", "myshopify.com",
]
FREE_BUILDER = [
    "wixsite.com", "godaddysites.com", "weebly.com", "business.site", "sites.google.com",
    "g.page", "webnode.com", "webflow.io",
]
LEAD_WEIGHTS = {
    "none": 40, "social_or_directory": 30, "booking_platform": 25,
    "free_builder": 15, "real_site": 0,
}


def _domain_regex(domains):
    return re.compile(
        r"(?:^|//|\.)(?:" + "|".join(re.escape(d) for d in sorted(domains)) + r")(?:[/:?#]|$)", re.I)


_BOOKING_RE = _domain_regex(BOOKING_PLATFORM)
_BUILDER_RE = _domain_regex(FREE_BUILDER)
_SOCIAL_RE = _domain_regex(SOCIAL_OR_DIRECTORY)


def load_env(path=None):
    """Load KEY=VALUE pairs from a .env file next to this script (no extra deps).
    Real environment variables take precedence over the file."""
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key, val = key.strip(), val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)


def _env_int(key, default):
    """Integer config: unset key -> default, empty -> 0 (= off / no cap), bad value -> fail fast."""
    raw = os.getenv(key)
    if raw is None:
        return default
    raw = raw.strip()
    if not raw:
        return 0
    try:
        return int(raw)
    except ValueError:
        sys.exit(f"{key}={raw!r} in .env/environment is not an integer (e.g. 5).")


def _env_float(key, default):
    """Float config: unset or empty key -> default, bad value -> fail fast."""
    raw = os.getenv(key)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw.strip())
    except ValueError:
        sys.exit(f"{key}={raw!r} in .env/environment is not a number (e.g. 4.0).")


def _env_bool(key, default=False):
    """Bool config: unset/empty -> default; 1/true/yes/on (any case) -> True."""
    raw = os.getenv(key)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def auth_header():
    load_env()
    login, pw = os.getenv("DFS_LOGIN"), os.getenv("DFS_PASSWORD")
    if not login or not pw:
        sys.exit("Missing DFS_LOGIN / DFS_PASSWORD. Put them in a .env file next to discover.py.")
    tok = base64.b64encode(f"{login}:{pw}".encode()).decode()
    return {"Authorization": f"Basic {tok}", "Content-Type": "application/json"}


def _request(method, url, headers, body=None, attempts=3):
    """One HTTP call. Retries 429/5xx/network errors up to `attempts` with 2s/5s backoff."""
    last_err = None
    for attempt in range(attempts):
        if attempt:
            time.sleep((2, 5)[min(attempt - 1, 1)])
        try:
            r = requests.request(method, url, headers=headers, json=body, timeout=120)
        except requests.exceptions.RequestException as e:
            last_err = e
            continue
        if r.status_code == 429 or r.status_code >= 500:
            last_err = RuntimeError(f"HTTP {r.status_code}: {r.reason}")
            continue
        r.raise_for_status()
        return r.json()
    raise last_err


def call_api(body, headers, attempts=3):
    """POST one search/live task and unwrap its first result."""
    data = _request("POST", API, headers, body, attempts)
    task = data["tasks"][0]
    if task.get("status_code") != 20000:
        raise RuntimeError(f"API error {task.get('status_code')}: {task.get('status_message')}")
    res = (task.get("result") or [{}])[0] or {}
    return res, (data.get("cost") or 0)


def fetch(categories, center, radius_km, limit, min_source_votes=5, page_size=1000):
    headers, items, offset, cost = auth_header(), [], 0, 0.0
    while len(items) < limit:
        body = [{
            "categories": categories,
            "location_coordinate": f"{center[0]},{center[1]},{radius_km}",
            "filters": [
                ["rating.votes_count", ">=", min_source_votes],
                "and",
                ["address_info.country_code", "=", "US"],
            ],
            "order_by": ["rating.votes_count,desc"],
            "limit": min(page_size, limit - len(items)),
            "offset": offset,
        }]
        res, c = call_api(body, headers)
        cost += c
        batch = res.get("items") or []
        items.extend(batch)
        print(f"  fetched {len(items)} / total available {res.get('total_count')}  (cost so far ${cost:.4f})")
        if len(batch) < body[0]["limit"]:
            break
        offset += len(batch)
        time.sleep(0.5)
    return items, cost


def check_categories(niche_key, center, radius_km):
    """Cheap sanity check: 1 result per category ID, prints total_count so you can spot dead IDs."""
    headers, cost = auth_header(), 0.0
    niche = NICHES[niche_key]
    print(f"\n[{niche_key}] {niche['label']}")
    for cat in niche["categories"]:
        body = [{"categories": [cat], "location_coordinate": f"{center[0]},{center[1]},{radius_km}",
                 "limit": 1}]
        try:
            res, c = call_api(body, headers)
            cost += c
            total = res.get("total_count") or 0
            flag = "OK  " if total else "DEAD"
            print(f"  {flag} {cat:40} {total:>6} listings")
        except Exception as e:
            print(f"  ERR  {cat:40} {e}")
        time.sleep(0.3)
    return cost


def site_status(url):
    """Classify a listing URL. Order matters only if a domain lands in two
    sets: booking, then builder, then social, then real_site."""
    if not url:
        return "none"
    if _BOOKING_RE.search(url):
        return "booking_platform"
    if _BUILDER_RE.search(url):
        return "free_builder"
    if _SOCIAL_RE.search(url):
        return "social_or_directory"
    return "real_site"


def is_closed(it):
    wt = it.get("work_time") or {}
    status = ((wt.get("work_hours") or {}).get("current_status") or "").lower()
    return status in ("closed_forever", "temporarily_closed")


def score(it, core, status):
    """0-~140. Higher = better lead (established, trusted, reachable, will look good
    on a site). Lead weight by site_status is added on top; real_site gets 0."""
    rating = (it.get("rating") or {}).get("value") or 0
    votes = (it.get("rating") or {}).get("votes_count") or 0
    photos = it.get("total_photos") or 0
    s = 0.0
    s += LEAD_WEIGHTS.get(status, 0)                          # buyer type: none > social > booking > builder
    s += max(0, min(rating - 3.5, 1.5)) / 1.5 * 30            # rating 3.5→5.0 : 0→30
    s += min(math.log10(votes + 1) / 2, 1) * 30               # 1→100+ reviews : 0→30
    s += 10 if it.get("is_claimed") else 0                    # owner manages profile
    s += 10 if it.get("phone") else 0                         # reachable
    s += min(photos / 20, 1) * 10                             # material for the site
    s += 10 if set(it.get("category_ids") or []) & set(core) else 0  # exact-target niche
    return round(s, 1)


def flatten(it, niche_key, core):
    a = it.get("address_info") or {}
    rt = it.get("rating") or {}
    status = site_status(it.get("url"))
    return {
        "score": score(it, core, status),
        "niche": niche_key,
        "title": it.get("title"),
        "category": it.get("category"),
        "phone": it.get("phone"),
        "site_status": status,
        "url": it.get("url"),
        "rating": rt.get("value"),
        "reviews": rt.get("votes_count"),
        "is_claimed": it.get("is_claimed"),
        "total_photos": it.get("total_photos"),
        "main_image": it.get("main_image"),
        "address": it.get("address"),
        "city": a.get("city"),
        "zip": a.get("zip"),
        "lat": it.get("latitude"),
        "lng": it.get("longitude"),
        "place_topics": ", ".join(list((it.get("place_topics") or {}).keys())[:8]),
        "cid": it.get("cid"),
        "place_id": it.get("place_id"),
        "maps_url": f"https://www.google.com/maps?cid={it.get('cid')}" if it.get("cid") else None,
    }


def run_niche(niche_key, args, center, stamp, exclude_statuses, min_source_votes):
    niche = NICHES[niche_key]
    print(f"\nPulling [{niche_key}] {niche['label']} within {args.radius}km of {center}...")
    raw, cost = fetch(niche["categories"], center, args.radius, args.limit, min_source_votes)

    outdir = os.path.join(args.out, niche_key)
    os.makedirs(outdir, exist_ok=True)
    with open(f"{outdir}/raw-{stamp}.json", "w") as f:
        json.dump(raw, f, indent=1)

    seen, rows = set(), []
    for it in raw:
        key = it.get("place_id") or it.get("cid")
        if key in seen or is_closed(it):
            continue
        seen.add(key)
        rows.append(flatten(it, niche_key, niche["core"]))

    leads = [r for r in rows if r["site_status"] not in exclude_statuses]
    qualified = [r for r in leads
                 if (r["rating"] or 0) >= args.min_rating
                 and (r["reviews"] or 0) >= args.min_reviews
                 and (not args.max_reviews or (r["reviews"] or 0) <= args.max_reviews)
                 and r["phone"]]
    qualified.sort(key=lambda r: r["score"], reverse=True)

    fields = list(rows[0].keys()) if rows else list(flatten({}, niche_key, niche["core"]))
    for name, data in (("all", rows), ("leads", leads), ("qualified", qualified)):
        with open(f"{outdir}/{name}-{stamp}.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader(); w.writerows(data)

    counts = {k: sum(r["site_status"] == k for r in rows) for k in LEAD_WEIGHTS}
    n = len(rows) or 1
    max_rv = f"..{args.max_reviews}" if args.max_reviews else ""
    per_lead = f"${cost/len(leads):.4f}" if leads else "-"
    per_qualified = f"${cost/len(qualified):.4f}" if qualified else "-"
    print(f"\n=== {niche['label']} ===")
    print(f"Unique open listings (>= {min_source_votes} reviews): {len(rows)}")
    print(f"  none (no URL):            {counts['none']:>5}  ({counts['none']/n:.0%})")
    print(f"  social_or_directory:      {counts['social_or_directory']:>5}  ({counts['social_or_directory']/n:.0%})")
    print(f"  booking_platform:         {counts['booking_platform']:>5}  ({counts['booking_platform']/n:.0%})")
    print(f"  free_builder:             {counts['free_builder']:>5}  ({counts['free_builder']/n:.0%})")
    print(f"  real_site:                {counts['real_site']:>5}  ({counts['real_site']/n:.0%})")
    print(f"Leads (status not in --exclude-statuses): {len(leads)} ({len(leads)/n:.0%})")
    print(f"Qualified ({args.min_rating}★+, {args.min_reviews}{max_rv} reviews, phone): {len(qualified)}")
    print(f"API cost: ${cost:.4f}  |  per lead: {per_lead}  |  per qualified: {per_qualified}")
    print("Top 10:")
    for r in qualified[:10]:
        print(f"  {r['score']:5}  {(r['title'] or '')[:40]:40}  {r['rating']}★ ({r['reviews']})  {r['phone']}")
    print(f"Files in {outdir}/")

    return {"niche": niche_key, "label": niche["label"], "listings": len(rows),
            "leads": len(leads), "leads_pct": round(len(leads) / n * 100),
            "none": counts["none"], "social": counts["social_or_directory"],
            "booking": counts["booking_platform"], "builder": counts["free_builder"],
            "real_site": counts["real_site"],
            "qualified": len(qualified), "cost": round(cost, 4),
            "cost_per_lead": round(cost / len(leads), 4) if leads else None,
            "cost_per_qualified": round(cost / len(qualified), 4) if qualified else None}, qualified


def _squash(s):
    return " ".join((s or "").split())


def _review_tasks(rows, depth, headers, args):
    """task_post `rows` at `depth` (cid preferred: exact match, 2x rate; place_id
    fallback), then poll task_get until every task finishes or the timeout hits.
    Returns (by_id, done, pending, failed, skipped, cost)."""
    tasks, skipped = [], []
    for r in rows:
        if r.get("cid"):
            ident = {"cid": str(r["cid"])}
        elif r.get("place_id"):
            ident = {"place_id": r["place_id"]}
        else:
            skipped.append(r)
            continue
        t = dict(ident)
        t["language_name"] = args.review_language
        t["depth"] = depth
        t["sort_by"] = REVIEW_SORT
        if r.get("lat") is not None and r.get("lng") is not None:
            t["location_coordinate"] = f"{float(r['lat']):.7f},{float(r['lng']):.7f},200"
        tasks.append((r, t))

    by_id, posted, cost = {}, [], 0.0
    for i in range(0, len(tasks), REVIEW_TASK_BATCH):
        batch = tasks[i:i + REVIEW_TASK_BATCH]
        data = _request("POST", REVIEWS_POST_API, headers, [t for _, t in batch])
        if data.get("status_code") != 20000:
            raise RuntimeError(f"task_post {data.get('status_code')}: {data.get('status_message')}")
        cost += data.get("cost") or 0
        for (r, _), tk in zip(batch, data.get("tasks") or []):
            if tk.get("status_code") == 20100 and tk.get("id"):
                by_id[tk["id"]] = r
                posted.append(tk["id"])
            else:
                print(f"  task rejected for {r.get('title')!r}: "
                      f"{tk.get('status_code')} {tk.get('status_message')}")
        print(f"  review tasks posted (depth {depth}): {min(i + REVIEW_TASK_BATCH, len(tasks))}/{len(tasks)}"
              f"  (cost so far ${cost:.4f})")

    pending, done, failed = set(posted), {}, {}
    deadline = time.time() + args.review_timeout
    while pending:
        for tid in list(pending):
            tk = (_request("GET", f"{REVIEWS_GET_API}/{tid}", headers).get("tasks") or [{}])[0]
            sc = tk.get("status_code")
            if sc == 20000:
                done[tid] = (tk.get("result") or [{}])[0] or {}
                pending.discard(tid)
            elif sc != 20100:  # anything else is a terminal error state
                failed[tid] = f"{sc}: {tk.get('status_message')}"
                pending.discard(tid)
        if not pending or time.time() >= deadline:
            break
        time.sleep(min(10, max(1, deadline - time.time())))
    return by_id, done, pending, failed, skipped, cost


def _slim_reviews(res, min_chars):
    items = sorted(res.get("items") or [], key=lambda x: x.get("rank_absolute") or 0)
    slim = [{
        "rank": it.get("rank_absolute"),
        "rating": (it.get("rating") or {}).get("value"),
        "reviewer": it.get("profile_name"),
        "time_ago": it.get("time_ago"),
        "timestamp": it.get("timestamp"),
        "review_text": _squash(it.get("review_text")),
        "owner_response": _squash((it.get("owner_response") or {}).get("text")) or None,
        "review_url": it.get("review_url"),
    } for it in items]
    for rv in slim:
        rv["has_text"] = len(rv["review_text"]) >= min_chars
    return slim


def fetch_reviews(rows, headers, args, outdir, stamp):
    """Review-content pull for QUALIFIED listings only (never the full scrape).
    Two-step Standard Queue: batch task_post, then poll task_get per task id.
    sort_by=relevant surfaces the substantive reviews. Star-only and very short
    reviews (< review_min_chars) don't count: the top `review_keep` reviews WITH
    text land in the CSV. Listings short on text reviews are re-posted once at
    `review_retry_depth`; any still short are marked `skipped` in the JSON and left
    out of the CSV. All fetched items stay in the JSON. Unfinished task ids are
    saved for a later GET (ids stay valid 30 days)."""
    keep = args.review_keep
    by_id, done, pending, failed, skipped, cost = _review_tasks(rows, args.review_depth, headers, args)
    posted = len(by_id)
    # One result per listing; a retry overwrites the first pass.
    results = {}
    for tid, res in done.items():
        r = by_id[tid]
        results[r.get("cid") or r.get("place_id")] = (r, res, args.review_depth)

    def _text_count(res):
        return sum(rv["has_text"] for rv in _slim_reviews(res, args.review_min_chars))

    retry_rows = [r for r, res, _ in results.values()
                  if _text_count(res) < keep
                  and (res.get("reviews_count") or 0) > len(res.get("items") or [])
                  and args.review_retry_depth > args.review_depth]
    retried = 0
    if retry_rows:
        print(f"  {len(retry_rows)} listing(s) under {keep} text reviews; "
              f"re-posting at depth {args.review_retry_depth}...")
        by_id2, done2, pending2, failed2, _, cost2 = _review_tasks(
            retry_rows, args.review_retry_depth, headers, args)
        cost += cost2
        posted += len(by_id2)
        by_id.update(by_id2); pending |= pending2; failed.update(failed2)
        for tid, res in done2.items():
            r = by_id2[tid]
            results[r.get("cid") or r.get("place_id")] = (r, res, args.review_retry_depth)
            retried += 1

    records, csv_rows, short = [], [], 0
    for r, res, depth in results.values():
        slim = _slim_reviews(res, args.review_min_chars)
        with_text = [rv for rv in slim if rv["has_text"]]
        kept = with_text[:keep]
        reason = None
        if len(with_text) < keep:
            reason = f"too few text reviews ({len(with_text)}/{keep})"
            short += 1
        records.append({
            "place_id": r.get("place_id"), "cid": r.get("cid"), "title": r.get("title"),
            "niche": r.get("niche"), "score": r.get("score"), "phone": r.get("phone"),
            "maps_url": r.get("maps_url"),
            "rating": (res.get("rating") or {}).get("value"),
            "reviews_count": res.get("reviews_count"),
            "depth": depth, "fetched": len(slim), "text_count": len(with_text),
            "kept": 0 if reason else len(kept), "kept_ranks": [] if reason else [rv["rank"] for rv in kept],
            "skipped": reason, "reviews": slim,
        })
        if reason:
            continue
        for rv in kept:
            csv_rows.append({
                "place_id": r.get("place_id"), "cid": r.get("cid"), "title": r.get("title"),
                "niche": r.get("niche"), "score": r.get("score"), "phone": r.get("phone"),
                "maps_url": r.get("maps_url"), **{k: v for k, v in rv.items() if k != "has_text"},
            })
    records.sort(key=lambda x: x.get("score") or 0, reverse=True)

    with open(f"{outdir}/reviews-{stamp}.json", "w") as f:
        json.dump(records, f, indent=1)
    if csv_rows:
        with open(f"{outdir}/reviews-{stamp}.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
            w.writeheader(); w.writerows(csv_rows)

    if pending or failed:
        leftovers = {tid: {"title": by_id[tid].get("title"), "place_id": by_id[tid].get("place_id"),
                           "status": "pending" if tid in pending else "failed",
                           "error": failed.get(tid)}
                     for tid in list(pending) + list(failed)}
        with open(f"{outdir}/reviews-pending-{stamp}.json", "w") as f:
            json.dump({"note": f"re-fetch with GET {REVIEWS_GET_API}/<task_id> (ids valid 30 days)",
                       "tasks": leftovers}, f, indent=1)

    print(f"\n=== Reviews (qualified listings only) ===")
    print(f"Posted {posted} | fetched {len(results)} | failed {len(failed)} "
          f"| pending {len(pending)} | skipped {len(skipped)} (no cid/place_id)")
    print(f"Kept top {keep} text reviews (>= {args.review_min_chars} chars) per listing, "
          f"depth {args.review_depth}, retry depth {args.review_retry_depth}, sort_by={REVIEW_SORT}")
    print(f"Retried {retried} | ready {len(results) - short} | too few text reviews {short}")
    print(f"API cost: ${cost:.4f}")
    print(f"Files: {outdir}/reviews-{stamp}.json"
          + (f", {outdir}/reviews-{stamp}.csv" if csv_rows else ""))
    if pending or failed:
        print(f"Unfinished tasks saved to {outdir}/reviews-pending-{stamp}.json")
    return cost


def normalize_metro(s):
    return re.sub(r"[\s\-]+", "_", s.strip().lower())

def parse_center(s):
    """Metro name (METROS/ALIASES) or raw 'lat,lng' -> (lat, lng) tuple."""
    s = (s or "").strip()
    if s:
        m = normalize_metro(s)
        m = ALIASES.get(m, m)
        if m in METROS:
            return METROS[m]
        try:
            lat, lng = (float(x) for x in s.split(","))
            return (lat, lng)
        except ValueError:
            pass
    sys.exit(f"Unknown center {s!r}. Use a metro name ({', '.join(sorted(METROS))}) "
             f"or 'lat,lng' e.g. 33.7490,-84.3880")


def main():
    load_env()  # before building the parser so .env backs the CLI defaults

    ap = argparse.ArgumentParser(description="MapsMachine discovery — find home-service lead candidates "
                                           "(no URL, social-only, booking-only, or free-builder).")
    ap.add_argument("--niche", default=os.getenv("MAIN_NICHE") or DEFAULT_NICHE,
                    help="niche preset, comma list, or 'all' (default: MAIN_NICHE, else house_cleaning). See --list-niches")
    ap.add_argument("--list-niches", action="store_true", help="print niche presets and exit")
    ap.add_argument("--check", action="store_true",
                    help="verify each category ID in the niche(s) returns listings (cheap), then exit")
    ap.add_argument("--center", default=os.getenv("CENTER") or DEFAULT_CENTER,
                    help="metro name or lat,lng (default: CENTER, else atlanta)")
    ap.add_argument("--radius", type=int, default=_env_int("RADIUS_KM", 40), help="km from center (default 40)")
    ap.add_argument("--limit", type=int, default=_env_int("LIMIT", 1000), help="max listings per niche (default 1000)")
    ap.add_argument("--min-rating", type=float, default=_env_float("MIN_STARS", 4.0),
                    help="min Google rating for qualified (default 4.0)")
    ap.add_argument("--min-reviews", type=int, default=_env_int("MIN_REVIEWS", 5),
                    help="min reviews for qualified (default 5)")
    ap.add_argument("--max-reviews", type=int, default=_env_int("MAX_REVIEWS", 200),
                    help="max reviews for qualified; 0/empty = no cap (default 200)")
    ap.add_argument("--exclude-statuses", default=os.getenv("EXCLUDE_STATUSES", "real_site"),
                    help="site statuses kept out of leads, comma list (default real_site)")
    ap.add_argument("--reviews", action="store_true", default=_env_bool("FETCH_REVIEWS"),
                    help="after discovery, pull Google review content for qualified listings only "
                         "(~$0.00075 per 10 reviews per listing)")
    ap.add_argument("--review-depth", type=int, default=_env_int("REVIEW_DEPTH", 10),
                    help="reviews parsed per listing; billed per 10, use multiples of 10 (default 10)")
    ap.add_argument("--review-keep", type=int, default=_env_int("REVIEW_KEEP", 5),
                    help="top relevant text reviews kept per listing in reviews CSV (default 5)")
    ap.add_argument("--review-min-chars", type=int, default=_env_int("REVIEW_MIN_CHARS", 20),
                    help="min characters for a review to count as a text review (default 20)")
    ap.add_argument("--review-retry-depth", type=int, default=_env_int("REVIEW_RETRY_DEPTH", 20),
                    help="re-post depth for listings with fewer than --review-keep text reviews; "
                         "<= --review-depth disables the retry (default 20)")
    ap.add_argument("--review-timeout", type=int, default=_env_int("REVIEW_TIMEOUT", 900),
                    help="seconds to poll task_get before saving pending ids (default 900)")
    ap.add_argument("--review-language", default=os.getenv("REVIEW_LANGUAGE") or "English",
                    help="reviews language_name (default English)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"),
                    help="output folder (default: out/ next to this script)")
    args = ap.parse_args()

    if args.list_niches:
        print("Niche presets (use --niche <key>, a comma list, or 'all'):\n")
        for k, v in NICHES.items():
            print(f"  {k:18} {v['label']}")
            print(f"  {'':18} categories: {', '.join(v['categories'])}\n")
        return

    exclude_statuses = {t.strip().lower() for t in args.exclude_statuses.split(",") if t.strip()}
    unknown = exclude_statuses - set(LEAD_WEIGHTS)
    if unknown:
        sys.exit(f"Unknown status(es) in --exclude-statuses / EXCLUDE_STATUSES: {', '.join(sorted(unknown))}. "
                 f"Valid: {', '.join(sorted(LEAD_WEIGHTS))}")
    if args.radius < 1:
        sys.exit("--radius / RADIUS_KM must be a positive number of km.")
    if args.reviews:
        if args.review_depth < 1:
            sys.exit("--review-depth / REVIEW_DEPTH must be >= 1.")
        if args.review_depth % 10 != 0:
            print(f"Note: review depth {args.review_depth} is not a multiple of 10; "
                  f"billing rounds up per 10 reviews.")
        args.review_keep = max(1, min(args.review_keep, max(args.review_depth, args.review_retry_depth)))

    keys = list(NICHES) if args.niche == "all" else [k.strip() for k in args.niche.split(",")]
    bad = [k for k in keys if k not in NICHES]
    if bad:
        sys.exit(f"Unknown niche(s): {', '.join(bad)}. Run --list-niches.")
    center = parse_center(args.center)
    min_source_votes = _env_int("MIN_SOURCE_VOTES", 5)

    if args.check:
        total = sum(check_categories(k, center, args.radius) for k in keys)
        print(f"\nCheck cost: ${total:.4f}. Remove DEAD IDs from NICHES before a full pull.")
        return

    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    summaries, all_qualified = [], []
    for k in keys:
        try:
            s, q = run_niche(k, args, center, stamp, exclude_statuses, min_source_votes)
            summaries.append(s); all_qualified.extend(q)
        except Exception as e:
            print(f"  [{k}] failed: {e}")

    # Dedup across niches (same business can qualify in several); one review task per business.
    all_qualified.sort(key=lambda r: r["score"], reverse=True)
    seen_q, deduped = set(), []
    for r in all_qualified:
        k = r["place_id"] or r["cid"]
        if k in seen_q:
            continue
        seen_q.add(k)
        deduped.append(r)

    if len(keys) > 1 and summaries:
        summaries.sort(key=lambda s: s["qualified"], reverse=True)
        os.makedirs(args.out, exist_ok=True)
        with open(f"{args.out}/summary-{stamp}.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(summaries[0].keys()))
            w.writeheader(); w.writerows(summaries)
        if deduped:
            with open(f"{args.out}/qualified-all-niches-{stamp}.csv", "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(deduped[0].keys()))
                w.writeheader(); w.writerows(deduped)
        print("\n=== Niche comparison (sorted by qualified leads) ===")
        print(f"  {'niche':18} {'listings':>8} {'leads':>6} {'%':>4} {'none':>5} {'social':>6} "
              f"{'booking':>7} {'builder':>7} {'qualified':>9} {'$/lead':>8}")
        for s in summaries:
            cpl = f"{s['cost_per_qualified']:.4f}" if s["cost_per_qualified"] is not None else "-"
            print(f"  {s['niche']:18} {s['listings']:>8} {s['leads']:>6} {s['leads_pct']:>3}% "
                  f"{s['none']:>5} {s['social']:>6} {s['booking']:>7} {s['builder']:>7} "
                  f"{s['qualified']:>9} {cpl:>8}")
        print(f"  total API cost: ${sum(s['cost'] for s in summaries):.4f}")
        print(f"\nFiles: {args.out}/summary-{stamp}.csv, {args.out}/qualified-all-niches-{stamp}.csv")

    if args.reviews and deduped:
        os.makedirs(args.out, exist_ok=True)
        print(f"\nPulling reviews for {len(deduped)} qualified listings "
              f"(depth {args.review_depth}, keep {args.review_keep} with text, sort_by={REVIEW_SORT})...")
        fetch_reviews(deduped, auth_header(), args, args.out, stamp)
    elif args.reviews:
        print("\n--reviews: no qualified listings to pull reviews for.")


if __name__ == "__main__":
    main()

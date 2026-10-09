export const business = {
  name: "[Business Name]",
  phoneDisplay: "[PHONE]",
  phoneTel: "tel:+14045550123",
  phoneSms: "sms:+14045550123",
  phoneE164: "+14045550123",
  email: "hello@[businessdomain].com",
  address: "[STREET ADDRESS], Atlanta, GA [ZIP]",
  founded: "[YEAR]",
  rating: "[RATING]",
  reviewCount: "[REVIEW COUNT]",
  insurance: "[INSURANCE CARRIER]",
  hours: "Office: Mon–Fri 8am–6pm, Sat 9am–2pm · Cleans: Mon–Sat",
};

export interface Service {
  slug: string;
  name: string;
  short: string;
  priceFrom: string;
  h1: string;
  pitch: string;
  bullets: string[];
  included: string[];
  priceChips: string[];
  howItWorks: { t: string; d: string }[];
  faq: { q: string; a: string }[];
  related: string[];
}

export const services: Service[] = [
  {
    slug: "recurring-cleaning",
    name: "Recurring cleaning",
    short: "Weekly, every 2 weeks, or monthly. Same team, same checklist, every visit.",
    priceFrom: "From $[XX]",
    h1: "Recurring house cleaning — same team, every visit.",
    pitch: "A standing clean on your schedule with an assigned team. Same people, same checklist, every visit — so the house stays at baseline without you thinking about it.",
    bullets: ["Weekly, every-2-weeks, or monthly plans", "Same assigned team every visit", "Rotating focus task each visit", "Flat per-visit price by home size", "Pause or skip with 48 hours' notice"],
    included: ["Kitchen counters, sink, stovetop and appliance exteriors wiped","Microwave cleaned inside","Bathrooms scrubbed (toilet, tub/shower, sink, mirrors)","All reachable surfaces dusted","Beds made (linens changed if left out)","Floors vacuumed and mopped","Trash emptied and relined","Light switches and door handles sanitized","Rotating focus task: baseboards, inside fridge, or blinds"],
    priceChips: ["Weekly: lowest per-visit rate","Every 2 weeks: most popular","Monthly: from $[XX]"],
    howItWorks: [
      { t: "First deep clean", d: "The first visit is a deeper reset so maintenance visits stay fast. Priced separately, confirmed upfront." },
      { t: "Assigned team", d: "You get the same team every visit. If someone is out, we tell you in advance who the backup is." },
      { t: "Stay or skip", d: "Skip, pause, or cancel anytime with 48 hours' notice. No contracts, no fees." },
    ],
    faq: [
      { q: "Is the first clean different?", a: "Yes. The first visit is a deep clean so recurring visits stay fast and consistent. It is priced separately and confirmed before we start." },
      { q: "Will I get the same cleaners?", a: "Yes. You get an assigned team for every recurring visit. If a backup ever covers, we tell you in advance." },
      { q: "Can I skip a visit?", a: "Yes. Skip, pause, or cancel anytime with 48 hours' notice at no charge." },
      { q: "Do you clean around pets?", a: "Yes. Note pets at booking and we plan entry and order of rooms around them." },
      { q: "Can I add tasks?", a: "Yes. Inside oven, inside fridge, laundry folding, and interior windows are available as add-ons at booking." },
    ],
    related: ["deep-cleaning", "move-in-move-out-cleaning", "airbnb-cleaning"],
  },
  {
    slug: "deep-cleaning",
    name: "Deep cleaning",
    short: "Baseboards, inside appliances, grout, blinds, and the places a regular clean skips.",
    priceFrom: "From $[XX]",
    h1: "A deep clean for the places a regular clean skips.",
    pitch: "A top-to-bottom reset for first-time clients, seasonal refreshes, or homes that have gone more than two months without a pro clean. Inside oven and fridge included.",
    bullets: ["Everything in a recurring clean, plus detail work", "Baseboards, vents, blinds, fans", "Inside oven and fridge included", "Grout, tile, and shower glass descaled", "Easy switch to recurring after"],
    included: ["Everything in recurring cleaning, plus:", "Baseboards and door frames wiped","Inside oven and fridge cleaned","Cabinet fronts degreased","Grout and tile scrubbed, shower glass descaled","Blinds and ceiling fans dusted","Vents and light fixtures wiped","Behind and under movable furniture","Window sills and tracks wiped"],
    priceChips: ["1–2 bed: $220–$350","3 bed: $280–$420","4+ bed: $400–$650"],
    howItWorks: [
      { t: "Walk the checklist", d: "We confirm priorities and condition at arrival so nothing is missed." },
      { t: "Detail pass", d: "Team works top to bottom, room by room, from the deep-clean checklist. Typically 4–7 team-hours." },
      { t: "Switch to recurring", d: "Most clients move to a lower-priced recurring plan after the reset. No contract required." },
    ],
    faq: [
      { q: "When do I need a deep clean vs. regular?", a: "Choose deep for first-time visits, seasonal resets, before hosting, or if it has been 2+ months since a professional clean." },
      { q: "How long does it take?", a: "Typically 4–7 team-hours depending on size and condition. We confirm the window at booking." },
      { q: "Do you move furniture?", a: "We move light furniture and clean behind it. Heavy items we clean around for safety." },
      { q: "Is inside the oven and fridge included?", a: "Yes. Inside oven and fridge are included in every deep clean." },
      { q: "Can I switch to recurring after?", a: "Yes. Recurring visits after a deep clean are priced lower than one-time cleans." },
    ],
    related: ["recurring-cleaning", "move-in-move-out-cleaning", "post-construction-cleaning"],
  },
  {
    slug: "move-in-move-out-cleaning",
    name: "Move-in / move-out",
    short: "Empty-home cleaning built around landlord and property-manager checklists.",
    priceFrom: "From $[XX]",
    h1: "Move-out cleaning built to get your deposit back.",
    pitch: "An empty-home deep clean that follows landlord and property-manager checklists, with timestamped completion photos for you or your landlord.",
    bullets: ["Empty-home deep clean", "Inside all cabinets, drawers, closets", "Inside oven, fridge, dishwasher, microwave", "Wall spot-cleaning and baseboards", "Completion photos included"],
    included: ["Empty-home deep clean throughout","Inside all cabinets, drawers, and closets","Inside oven, fridge, dishwasher, and microwave","Baseboards, doors, and frames wiped","Bathrooms descaled (toilet, tub, tile, glass)","Wall spot-cleaning","Window sills and tracks","Floors vacuumed and mopped edge to edge","Timestamped completion photos sent to you or your landlord"],
    priceChips: ["1–2 bed: $250–$400","3 bed: $350–$550","Inside appliances included"],
    howItWorks: [
      { t: "Send the checklist", d: "Send your landlord or manager checklist at booking and we follow it line by line." },
      { t: "Book after movers", d: "Book the afternoon window after movers leave so every surface is reachable." },
      { t: "Get photo proof", d: "We send timestamped completion photos the same day for your records or deposit file." },
    ],
    faq: [
      { q: "Does the home need to be empty?", a: "Yes, or nearly empty. Furniture limits what we can reach and what we can guarantee." },
      { q: "Do you work from my landlord's checklist?", a: "Yes. Send it at booking and we follow it. If anything conflicts, we flag it before we start." },
      { q: "Can you clean the same day as my move?", a: "Yes. Book the afternoon arrival window after movers leave." },
      { q: "Do you clean carpets?", a: "We vacuum thoroughly edge to edge. Steam cleaning is [policy — partner referral or add-on]." },
      { q: "Do you send proof?", a: "Yes. Timestamped completion photos are sent after every move clean." },
    ],
    related: ["deep-cleaning", "post-construction-cleaning", "recurring-cleaning"],
  },
  {
    slug: "airbnb-cleaning",
    name: "Airbnb cleaning",
    short: "Guest-ready turnovers with linen change, restock, and photo confirmation.",
    priceFrom: "From $[XX]",
    h1: "Airbnb and short-term rental turnovers, guest-ready every time.",
    pitch: "Reliable turnovers synced to your booking calendar, with hotel-style beds, restocks from your list, and a timestamped photo set after every clean.",
    bullets: ["Calendar-synced scheduling", "Linen and towel change", "Restock from your supply list", "Damage and missing-item reports", "Timestamped photo set every turnover"],
    included: ["Full clean between stays","Linen and towel change (your linens or our linen service add-on)","Beds made hotel-style","Restock of supplies from your list","Dishes done and dishwasher emptied","Trash taken out","Damage and missing-item report with photos","Timestamped photo set sent after each turnover","Calendar sync so turnovers schedule from your bookings"],
    priceChips: ["Studio–1 bed: $75–$110","2–3 bed: $110–$180","Linen service: add-on"],
    howItWorks: [
      { t: "Sync your calendar", d: "We connect to your listing calendar so turnovers schedule automatically." },
      { t: "Standard 11am–3pm window", d: "Same-day turnovers run in the standard checkout-to-checkin window, adjusted as needed." },
      { t: "Photos every time", d: "You get a timestamped photo set, restock note, and any damage report the same day." },
    ],
    faq: [
      { q: "Can you work from my booking calendar?", a: "Yes. We sync to your listing calendar so turnovers are scheduled from your bookings." },
      { q: "What if a checkout runs late?", a: "We adjust within the same-day window and message you about the revised timing." },
      { q: "Do you restock supplies?", a: "Yes. We restock from your on-site stock, or supplies billed at cost by agreement." },
      { q: "Do you report damage?", a: "Yes. Damage or missing items are reported with photos the same day." },
      { q: "Do you offer same-day turnovers?", a: "Yes. Same-day turnovers in the standard 11am–3pm window are our core service." },
    ],
    related: ["deep-cleaning", "recurring-cleaning", "move-in-move-out-cleaning"],
  },
  {
    slug: "post-construction-cleaning",
    name: "Post-construction",
    short: "Fine dust, paint flecks, and sticker residue removed after a remodel.",
    priceFrom: "Quoted per space",
    h1: "Post-construction cleaning that gets the dust out of everything.",
    pitch: "HEPA-filtered fine-dust removal, paint-fleck and sticker cleanup, and a final pass before move-in or listing photos. Quoted after a walkthrough or photos.",
    bullets: ["Fine dust on every surface, vent, fixture", "Paint flecks and sticker residue removed", "Inside new cabinets and drawers", "HEPA vacuuming + damp methods", "Final pass before move-in or photos"],
    included: ["Fine dust removed from every surface, vent, and fixture","Paint flecks and sticker residue removed","Inside new cabinets and drawers wiped","Windows, sills, and tracks cleaned","Light fixtures and fans wiped","HEPA vacuuming throughout","Floors cleaned to manufacturer spec","Final pass before move-in or listing photos"],
    priceChips: ["Typically $0.30–$0.60/sq ft","Quoted after walkthrough or photos","Builders: volume rates"],
    howItWorks: [
      { t: "Walkthrough or photos", d: "Send photos or book a walkthrough. We quote a flat price before scheduling." },
      { t: "Rough + final pass", d: "Most jobs need a rough clean after trades finish plus a final touch-up before move-in." },
      { t: "Photo-ready finish", d: "Final pass timed before furniture, move-in, or listing photos." },
    ],
    faq: [
      { q: "When should I book it?", a: "After all trades are done and before furniture goes in. That order avoids re-dusting." },
      { q: "Do you remove construction debris?", a: "No. We clean; bulk debris and haul-away stays with the contractor or a hauler." },
      { q: "Do you work for contractors directly?", a: "Yes, with invoicing and a certificate of insurance on request, plus volume rates." },
      { q: "How many visits does it take?", a: "Often two: a rough clean plus a final touch-up before handoff." },
      { q: "How do you control drywall dust?", a: "We use HEPA filtration and damp methods so fine dust is captured, not spread." },
    ],
    related: ["deep-cleaning", "move-in-move-out-cleaning", "office-cleaning"],
  },
  {
    slug: "office-cleaning",
    name: "Office cleaning",
    short: "After-hours cleaning for small offices, studios, and suites.",
    priceFrom: "Quoted per space",
    h1: "Office cleaning after hours, so your team walks into a clean space.",
    pitch: "Evening and weekend cleaning for studios, suites, and small offices, with a visit log after every clean and a certificate of insurance on request.",
    bullets: ["Evenings and weekends", "Kitchens, restrooms, trash, floors", "High-touch points sanitized", "Visit log after every clean", "Month-to-month, 30-day notice"],
    included: ["Desks and shared surfaces wiped","Kitchens and break rooms cleaned","Restrooms cleaned and restocked","Trash and recycling taken out","High-touch points sanitized","Floors vacuumed and mopped","Entry glass cleaned","Log sheet or app note left after each visit"],
    priceChips: ["Most small offices: $120–$300/visit","Nightly, weekly, or bi-weekly","Certificate of insurance on request"],
    howItWorks: [
      { t: "Walkthrough quote", d: "Tell us about the space on /contact. We quote a flat per-visit price." },
      { t: "After-hours schedule", d: "Evenings or weekends on a nightly, weekly, or bi-weekly cadence." },
      { t: "Logged every visit", d: "Your team finds a log note after each visit. Issues are flagged the same night." },
    ],
    faq: [
      { q: "Do you clean after hours?", a: "Yes. Evenings and weekends are standard for office clients." },
      { q: "Do you supply restroom paper goods?", a: "Yes, billed at cost — or we use your supplied stock." },
      { q: "How do you handle alarms and keys?", a: "Dedicated codes and logged entry. Only your assigned team holds access." },
      { q: "What size offices do you serve?", a: "Studios, suites, and offices up to about [XX] sq ft. Larger spaces quoted after a walkthrough." },
      { q: "Do you require a contract?", a: "No long-term contract. Month-to-month with 30-day notice." },
    ],
    related: ["post-construction-cleaning", "deep-cleaning", "recurring-cleaning"],
  },
];

export interface Area {
  slug: string;
  name: string;
  housing: string;
  size: string;
  access: string;
  jobs: string;
  body: string;
  prices: string[];
}

export const areas: Area[] = [
  {
    slug: "buckhead",
    name: "Buckhead",
    housing: "Large single-family homes, 4–6 bedrooms, gated drives and estate parking.",
    size: "Typical clean: 3,000–5,500 sq ft, 4–6 bed / 3–5 bath.",
    access: "Gated drive or estate entry; alarm codes and house-manager coordination standard.",
    jobs: "Weekly recurring cleans and pre-event deep cleans are most booked here.",
    body: "Buckhead cleans run long because the homes are large and often occupied by families with staff or house managers. We coordinate entry, alarms, and priorities with whoever runs the household, and the same team returns each visit so setup stays consistent.",
    prices: ["4 bed recurring: typically $200–$300/visit", "Deep clean, 4+ bed: typically $400–$650"],
  },
  {
    slug: "midtown",
    name: "Midtown",
    housing: "High-rise condos and apartments, 1–2 bedrooms, concierge buildings.",
    size: "Typical clean: 700–1,400 sq ft, 1–2 bed / 1–2 bath.",
    access: "Concierge check-in, building COI on file, loading-dock or garage parking.",
    jobs: "Every-2-weeks cleans for professionals and lease-end move-outs.",
    body: "Midtown work is high-rise work: we carry building COIs, check in with concierge, and plan around loading-dock windows and elevator bookings. Most clients are professionals on an every-2-weeks cadence plus a move-out clean at lease end.",
    prices: ["2 bed / 2 bath recurring: typically $130–$180", "Move-out, 2 bed: typically $280–$450"],
  },
  {
    slug: "sandy-springs",
    name: "Sandy Springs",
    housing: "Family homes from the 70s to 2000s, 3–5 bedrooms, kids and pets.",
    size: "Typical clean: 2,000–3,500 sq ft, 3–5 bed / 2–4 bath.",
    access: "Driveway parking; garage code or lockbox entry most common.",
    jobs: "Every-2-weeks recurring with pet-hair focus, plus seasonal deep cleans.",
    body: "Sandy Springs is family-home territory: kids, dogs, and well-used kitchens. Recurring visits focus on floors, pet hair, and bathrooms, with a seasonal deep clean for baseboards, blinds, and grout.",
    prices: ["3 bed recurring: typically $150–$210", "Deep clean, 3 bed: typically $280–$420"],
  },
  {
    slug: "decatur",
    name: "Decatur",
    housing: "Older bungalows and craftsman homes with original hardwoods and tile.",
    size: "Typical clean: 1,200–2,400 sq ft, 2–4 bed / 1–3 bath.",
    access: "Street or driveway parking; lockbox or porch-key entry common.",
    jobs: "Deep cleans and fragrance-free recurring visits are most requested.",
    body: "Decatur's older homes need a gentler hand: original hardwoods, vintage tile, and plaster walls. We use gentle, fragrance-free products on request and detail the trim, sills, and grout that age shows first.",
    prices: ["2 bed recurring: typically $130–$180", "Deep clean, 3 bed: typically $280–$420"],
  },
  {
    slug: "brookhaven",
    name: "Brookhaven",
    housing: "Townhomes and newer infill, 2–4 bedrooms, HOA communities.",
    size: "Typical clean: 1,600–2,800 sq ft, 2–4 bed / 2–3 bath.",
    access: "HOA guest parking rules; garage or lockbox entry typical.",
    jobs: "Recurring cleans for dual-income households and move-in cleans for new builds.",
    body: "Brookhaven mixes townhome HOAs with newer infill builds. We follow guest-parking rules, handle multi-level layouts efficiently, and see heavy demand for move-in cleans as new construction turns over.",
    prices: ["3 bed recurring: typically $150–$210", "Move-in, 3 bed: typically $350–$550"],
  },
  {
    slug: "old-fourth-ward",
    name: "Old Fourth Ward",
    housing: "Lofts, condos, and short-term rentals near the BeltLine.",
    size: "Typical clean: 800–1,800 sq ft, 1–3 bed / 1–2 bath.",
    access: "Tight street parking; keypad entry and lockbox handoffs standard.",
    jobs: "Airbnb turnovers with same-day windows are the top booking here.",
    body: "Old Fourth Ward runs on rentals and turnovers near the BeltLine. We handle keypad entry, tight parking, and standard 11am–3pm same-day turnovers with photo confirmation after every stay.",
    prices: ["Airbnb 2-bed turnover: typically $110–$180", "2 bed recurring: typically $130–$180"],
  },
];

export const reviews = [
  { quote: "[REVIEW 1 QUOTE]", name: "[REVIEW 1 NAME]", area: "[REVIEW 1 AREA]", service: "[REVIEW 1 SERVICE]" },
  { quote: "[REVIEW 2 QUOTE]", name: "[REVIEW 2 NAME]", area: "[REVIEW 2 AREA]", service: "[REVIEW 2 SERVICE]" },
  { quote: "[REVIEW 3 QUOTE]", name: "[REVIEW 3 NAME]", area: "[REVIEW 3 AREA]", service: "[REVIEW 3 SERVICE]" },
  { quote: "[REVIEW 4 QUOTE]", name: "[REVIEW 4 NAME]", area: "[REVIEW 4 AREA]", service: "[REVIEW 4 SERVICE]" },
  { quote: "[REVIEW 5 QUOTE]", name: "[REVIEW 5 NAME]", area: "[REVIEW 5 AREA]", service: "[REVIEW 5 SERVICE]" },
  { quote: "[REVIEW 6 QUOTE]", name: "[REVIEW 6 NAME]", area: "[REVIEW 6 AREA]", service: "[REVIEW 6 SERVICE]" },
  { quote: "[REVIEW 7 QUOTE]", name: "[REVIEW 7 NAME]", area: "[REVIEW 7 AREA]", service: "[REVIEW 7 SERVICE]" },
  { quote: "[REVIEW 8 QUOTE]", name: "[REVIEW 8 NAME]", area: "[REVIEW 8 AREA]", service: "[REVIEW 8 SERVICE]" },
];

export const homeFaq = [
  { q: "Are your cleaners background-checked and insured?", a: "Yes. Every cleaner passes a background check, and we carry general liability insurance and bonding through [INSURANCE CARRIER]. Cleaners are trained, managed, and paid by us — never dispatched from an anonymous gig app." },
  { q: "Do I need to be home?", a: "No. Most clients give us a lockbox, door code, or key. Codes are stored encrypted and only your assigned team ever sees them — nothing is written on paper or shared." },
  { q: "Do you bring supplies?", a: "Yes. We bring all supplies and equipment to every clean. Prefer your own products or fragrance-free? Note it at booking and we will follow it." },
  { q: "What if I'm not happy with something?", a: "Tell us within 24 hours and we will come back to re-clean that area free. See the full terms on the guarantee page." },
  { q: "Do I have to sign a contract?", a: "No. Recurring plans are flexible — skip, pause, or cancel anytime with 48 hours' notice." },
  { q: "What areas do you serve?", a: "Buckhead, Midtown, Sandy Springs, Decatur, Brookhaven, Old Fourth Ward, and nearby Metro Atlanta. Not sure? Call or text [PHONE]." },
];

export const fullFaq: { group: string; items: { q: string; a: string }[] }[] = [
  { group: "Booking & pricing", items: [
    { q: "How does flat pricing work?", a: "We price by home size (bedrooms, bathrooms) and service type — not by the hour. You see the number before anyone shows up, and a slower clean never costs you more." },
    { q: "How much do recurring clients save?", a: "Recurring clients save 10–20% versus one-time cleans, with weekly and every-2-weeks rates lowest. No contracts." },
    { q: "What is the cancellation policy?", a: "Skip, pause, or cancel with 48 hours' notice at no charge. Cancellations inside 48 hours and lockouts (we cannot access the home) may incur a fee up to one visit rate." },
  ]},
  { group: "Before your clean", items: [
    { q: "What should I do before cleaners arrive?", a: "Pick up clutter and secure valuables and sensitive documents. We handle the cleaning; clearing surfaces lets us spend time on actual soil, not tidying toys and mail." },
    { q: "How do entry and keys work?", a: "Choose: you are home, lockbox, door code, or key on file. Codes are stored encrypted, only your assigned team sees them, and entry is logged." },
    { q: "What about pets?", a: "Tell us about pets at booking. We plan entry and room order around them. Aggressive animals must be secured during the visit." },
  ]},
  { group: "During the clean", items: [
    { q: "Do you bring supplies and equipment?", a: "Yes — all supplies and equipment, every visit. Eco or fragrance-free on request; note it at booking." },
    { q: "Will it be the same people every time?", a: "For recurring clients, yes: an assigned team. If a backup ever covers, we tell you in advance with names." },
    { q: "Do I tip?", a: "Tipping is optional and never expected. Our teams are paid fairly. If you want to tip, 100% goes to the team." },
  ]},
  { group: "Trust & safety", items: [
    { q: "Are cleaners background-checked and insured?", a: "Yes. Background check, reference check, paid in-house training, and supervised first cleans. Insured and bonded through [INSURANCE CARRIER]." },
    { q: "What if something breaks?", a: "Report it within 24 hours with a photo. Breakage is covered by our insurance per the terms page. We document and resolve every claim in writing." },
  ]},
  { group: "After the clean", items: [
    { q: "What is the re-clean guarantee?", a: "If anything on the booked checklist was missed, tell us within 24 hours and we return within 2 business days to re-clean that area free. Full terms on /guarantee." },
  ]},
];

export function serviceBySlug(slug: string) {
  return services.find((s) => s.slug === slug);
}
export function areaBySlug(slug: string) {
  return areas.find((a) => a.slug === slug);
}

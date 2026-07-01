# masalaMacros — Product & Technical Spec

> A personal-dietitian web app that tracks what you eat — tuned first for Indian
> (North & South) home cooking, with first-class support for other cuisines
> (Mexican, Italian, etc.). It logs meals, extracts nutrients, and coaches you
> *before* and *after* you eat across day → meal → week → month horizons.

_Status: Draft v0.1 — living document_
_Owner: Santosh_

---

## 1. Vision & Positioning

Most calorie trackers are built around Western packaged foods and barcodes. They
fall apart on real Indian meals — "2 rotis, a katori of dal, a bowl of bhindi
sabzi, and some curd." masalaMacros is built the other way around: **home-cooked,
cuisine-aware, portion-in-katoris**, with a nutrition engine that understands
composite dishes and cooking methods (tadka, deep-fry, dry roast).

**One-line pitch:** _Your personal dietitian that actually understands ghar ka khana._

**Core promises**
1. Logging Indian food is fast and natural (talk/type it the way you'd say it).
2. Nutrient numbers are trustworthy (curated DB first, AI fallback second).
3. It coaches, not just counts — before you eat and across time.

---

## 2. Decisions Locked (from discovery)

| Area | Decision |
|---|---|
| Platform | **Web app** (mobile-friendly PWA; native later if needed) |
| Logging | **Natural language / voice** + **dish-database search** |
| Nutrition depth | **Rich** — calories, macros, fiber, key micros, health flags |
| Data source | **Curated DB (IFCT + USDA) + LLM fallback** for uncovered dishes |
| Health focus | General healthy eating **+** weight management **+** glycemic/blood-sugar **+** protein/fitness (all tracked simultaneously) |
| "Before I eat" | **Assess + suggest adjustments**, in the context of the day so far |
| Product scope | Built as a **real product** — accounts, privacy, scale-aware |
| Stack | Chosen by builder (see §7) |
| Seed data | Start with **user's real rotation** (~30–50 dishes), curate precisely, then broaden |
| Targets | **Auto-calculate** (Mifflin-St Jeor + goal) **with manual override** |
| Coaching tone | **Clinical / precise** — neutral, data-forward, dietitian-professional |

---

## 3. Primary Use Cases

1. **Log a meal (post-hoc):** "Had 2 phulkas, dal tadka, aloo gobi, and a cup of
   chai with sugar." → parsed into dishes + portions → nutrients computed → saved
   to today's timeline.
2. **Pre-eat assessment (the differentiator):** Before eating, describe/select the
   meal → get a verdict (benefits, concerns), key flags (glycemic load, oil,
   sodium, protein), and **concrete tweaks** ("add a katori of curd for protein +
   satiety", "half the rice, keep the dal").
3. **Day view:** Meal-by-meal timeline with running totals vs. targets and a
   "budget remaining" for the rest of the day.
4. **Week view:** Trends, streaks, protein/fiber consistency, glycemic pattern,
   most-repeated dishes, variety score.
5. **Month roll-up:** High-level habit report — averages, improvements, recurring
   red flags, weight trend correlation.
6. **Cross-cuisine day:** Log a Mexican or Italian meal without friction; same
   engine, different food data.

---

## 4. Nutrition Engine (the heart of the app)

### 4.1 Data sources
- **IFCT 2017** (Indian Food Composition Tables) — authoritative for raw Indian
  ingredients and many prepared foods. Primary source for Indian items.
- **USDA FoodData Central** — broad coverage for non-Indian ingredients and
  packaged foods.
- **Curated composite-dish table (ours):** standard recipes for common dishes
  (dal tadka, chicken curry, masala dosa, rajma, biryani…) expressed as ingredient
  breakdowns + typical cooking-oil load, so nutrients are computed from ingredients
  rather than guessed wholesale. This is the moat.
- **LLM fallback (Claude):** when a dish/description isn't in the DB, Claude
  decomposes it into likely ingredients + portions, which run through the same
  ingredient math. Results are cached and flagged as `estimated` for later
  curation.

### 4.2 Portion model (Indian-first)
Support natural household units and normalize to grams:
- `roti/phulka/chapati`, `paratha`, `dosa`, `idli`, `katori` (small ~150ml / large
  ~250ml), `bowl`, `cup`, `glass`, `tbsp/tsp`, `piece`, plus grams/ml.
- A **units table** maps each to a default gram weight per food class, editable by
  the user (your katori may differ). This is critical — portion error dominates
  nutrition error for home food.

### 4.3 Computed outputs per meal/day
- **Macros:** calories, protein, carbs (total + sugar + added sugar est.), fat
  (total + saturated), fiber.
- **Key micros:** iron, calcium, vitamin B12, folate, sodium, potassium
  (extendable). B12/iron/protein matter for veg Indian diets specifically.
- **Health flags / scores:**
  - **Glycemic load** estimate (dish-level) → blood-sugar lens.
  - **Oil/fried factor** (deep-fried vs. dry vs. steamed).
  - **Sodium load** (papad, pickle, processed callouts).
  - **Protein adequacy** vs. target.
  - **Fiber adequacy**, **added-sugar** callout, **ultra-processed** flag.
  - Overall **meal quality score** (0–100) with a plain-language "why".

### 4.4 Confidence & provenance
Every number carries a source tag: `curated | ifct | usda | ai-estimated` and a
confidence band. Estimated items are visually distinct and queued for curation.

---

## 5. "Before I Eat" Coach

Input: proposed meal (NL or picks). Context: today's intake so far + user targets
+ health foci.

Output card:
- **Verdict** (e.g., "Solid choice, watch the rice") with a score.
- **Benefits:** protein from dal, fiber from sabzi, good micro coverage…
- **Concerns:** high glycemic load, oil-heavy, low protein for the meal…
- **Adjustments (actionable):** portion swaps, additions, timing ("if this is
  dinner, drop the rice by half"), pairing suggestions.
- **Day fit:** how it lands against remaining calorie/protein/carb budget.

Powered by the nutrition engine + a Claude reasoning pass that turns numbers into
personalized, non-preachy coaching text constrained to the user's goals.

---

## 6. Feature Set by Phase

### MVP (v1) — prove the loop
- Auth + single user profile (goals, weight, targets, dietary prefs veg/nonveg/
  vegan/Jain, allergies).
- NL meal logging (typed) → parse → nutrients → save.
- Dish-database search + quick-add with editable portions.
- Day view with totals vs. targets + budget remaining.
- Pre-eat assessment card (assess + suggest).
- Curated seed DB (~150–300 common Indian dishes + ingredients) + IFCT/USDA import
  + AI fallback with caching.
- Rich nutrient panel with flags + provenance tags.

### v1.5
- Voice logging (browser speech-to-text → same NL pipeline).
- Week view with trends and repeated-dish insights.
- Editable personal portion units.
- Favorites / recent meals / "log again".
- Non-Indian cuisines fully supported (Mexican, Italian) via same engine.

### v2
- Month roll-up habit report + weight-trend correlation.
- Meal/photo logging (image → dish guess → confirm).
- Recipe builder (define your household recipes once; reuse exact nutrients).
- Weekly personalized report ("dietitian note") generated by Claude.
- Goal coaching adjustments over time.

### Exploratory / Opportunity Backlog
- **Pantry & meal planning:** suggest what to cook given goals + what's at home.
- **Grocery list generation** from planned meals.
- **Thali balancer:** compose a balanced Indian plate to hit remaining targets.
- **Festival/seasonal mode:** realistic handling of sweets, fasting (vrat) foods.
- **Family accounts / cook mode:** one household cook logs for multiple members.
- **Restaurant/menu assist:** paste a menu, get the best-fit picks.
- **Wearable/CGM import:** correlate meals with glucose (Freestyle Libre) or steps.
- **Streaks & gentle nudges** (habit formation without shame-based UX).
- **Dietitian-share export:** clean PDF/report to share with a real doctor/dietitian.
- **Regional depth:** tag dishes by region (Punjabi, Tamil, Bengali, Gujarati…)
  for cuisine analytics and better defaults.
- **Doctor-mode flags:** condition-aware watchlists (e.g., renal → potassium/sodium).
- **Offline-first PWA** for logging without signal.

---

## 7. Technical Architecture (proposed)

**Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui. PWA-enabled
for mobile home-screen use and offline logging. Web Speech API for voice.

**Backend:** Next.js server routes / server actions (monolith to start) — simple ops,
easy scale path. Extract a separate service only if the nutrition engine grows heavy.

**Database:** PostgreSQL (hosted — Supabase or Neon). Prisma ORM. Postgres gives us
relational integrity for foods/recipes/logs and JSONB for flexible nutrient blobs.

**LLM:** Claude API (claude-opus-4-8 for the coaching/reasoning passes; a smaller/
faster tier like Haiku for cheap parsing where quality allows). Used for (a) NL meal
parsing, (b) dish decomposition fallback, (c) coaching text, (d) weekly reports.
All LLM outputs validated against strict schemas (tool use / structured output).

**Auth:** Managed auth (Supabase Auth / Clerk / Auth.js) — email + Google.

**Hosting:** Vercel (frontend/app) + managed Postgres. Object storage (later) for
meal photos.

**Key engineering principles**
- **Deterministic math, probabilistic parsing.** The LLM decides *what* you ate;
  fixed formulas compute *the numbers*. Never let the model free-hand calorie totals.
- **Everything cached & curatable.** AI estimates get stored, tagged, and are
  promotable into the curated DB.
- **Schema-validated LLM I/O** so parsing can't corrupt the log.
- **Privacy by design** (health data): encryption at rest, per-user data isolation,
  export & delete, no training on user data.

### 7.1 Core data model (sketch)
- `users` (profile, prefs, goals, dietary type, allergies)
- `targets` (calorie/macro/micro goals; can be date-ranged for weight phases)
- `ingredients` (nutrients per 100g; source tag) ← IFCT/USDA import
- `dishes` (composite; recipe = list of ingredient + qty; cooking method; region tags)
- `portion_units` (unit → grams, per food class; user overrides)
- `meals` (user, timestamp, meal type) → `meal_items` (dish/ingredient + portion)
- `nutrition_snapshots` (computed per meal & per day; cached)
- `assessments` (pre-eat cards, for history/learning)
- `reports` (weekly/monthly generated summaries)

### 7.2 Logging pipeline
```
raw text/voice
  → LLM parse (→ structured: [{dish, qty, unit}], schema-validated)
  → resolve each item: curated DB → IFCT/USDA → LLM decompose (cached)
  → portion → grams via units table
  → deterministic nutrient computation
  → flags/scores
  → persist meal + snapshot
  → (optional) coaching pass
```

---

## 8. Open Questions

### Resolved
- **Seed data:** Start with the user's real rotation (~30–50 dishes), curate those
  precisely, then broaden. Need the actual dish list from Santosh.
- **Targets:** Auto-calculate from profile (Mifflin-St Jeor + goal) with manual
  override.
- **Coaching tone:** Clinical / precise — neutral, data-forward.

### Still open (resolve before/during build)
1. **IFCT data licensing/format** — confirm we can ingest IFCT 2017 tables and how
   (PDF/CSV). Fallback plan if licensing is restrictive.
2. **Blood-sugar depth:** glycemic *load* estimates only for now; CGM import (Libre)
   deferred to exploratory backlog — confirm that's acceptable for v1.
3. **Voice:** browser Web Speech API (free, decent) vs. a paid STT for accuracy.
   Proposed: start with Web Speech API in v1.5.
4. **Weight/measurement input:** manual entry for v1; scale/Apple Health integration
   later — confirm.

---

## 9. Suggested Next Steps

1. Confirm/adjust §8 open questions.
2. Lock the MVP scope (§6 MVP) as the build target.
3. Design the data model + nutrient computation formulas in detail.
4. Stand up the repo (Next.js + Postgres + Prisma) and the ingredient import.
5. Build the logging pipeline end-to-end for ~20 seed dishes as a vertical slice.

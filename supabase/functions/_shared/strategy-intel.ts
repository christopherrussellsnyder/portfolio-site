// ============================================================================
// Strategy Intelligence Layer
// External-truth gathering + verification helpers used by generate-strategy.
// Every fetcher degrades gracefully: if a source is unavailable the strategy
// still generates, just without that grounding block.
//
// COST CONTROL: every network-bound source is cached in `strategy_intel_cache`
// keyed by (source, key) with a TTL, so repeat generations in the same niche
// cost nothing.
// ============================================================================

export interface IntelResult {
  section: string;      // prompt-ready text ('' when unavailable)
  source: string;       // provenance label
  ok: boolean;
}

const EMPTY: IntelResult = { section: '', source: 'unavailable', ok: false };

// ---------------------------------------------------------------- cache ----

export async function getCached(
  supabase: any,
  source: string,
  key: string,
): Promise<any | null> {
  try {
    const { data } = await supabase
      .from('strategy_intel_cache')
      .select('payload, expires_at')
      .eq('source', source)
      .eq('cache_key', key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.payload;
  } catch {
    return null;
  }
}

export async function setCached(
  supabase: any,
  source: string,
  key: string,
  payload: any,
  ttlHours: number,
): Promise<void> {
  try {
    await supabase.from('strategy_intel_cache').upsert(
      {
        source,
        cache_key: key,
        payload,
        expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
      },
      { onConflict: 'source,cache_key' },
    );
  } catch (e) {
    console.warn('intel cache write failed', e);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function timedFetch(url: string, init: RequestInit = {}, ms = 9000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    console.warn('intel fetch failed', url, (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ------------------------------------------------ 1. search-demand (SERP) --

/**
 * Live keyword / search-demand grounding via the Semrush connector gateway.
 * Requires the Semrush connection to be linked (SEMRUSH_API_KEY env var).
 */
export async function fetchSearchDemand(
  supabase: any,
  niche: string,
  products: string,
  geo: string,
): Promise<IntelResult> {
  const semrushKey = Deno.env.get('SEMRUSH_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!semrushKey || !lovableKey) return EMPTY;

  const seed = (products.split(',')[0] || niche).trim().slice(0, 60);
  const database = /uk|united kingdom/i.test(geo) ? 'uk' : /canada/i.test(geo) ? 'ca' : /australia/i.test(geo) ? 'au' : 'us';
  const cacheKey = `${seed}|${database}`.toLowerCase();

  let rows: any = await getCached(supabase, 'search_demand', cacheKey);
  if (!rows) {
    const qs = new URLSearchParams({
      phrase: seed,
      database,
      export_columns: 'Ph,Nq,Cp,Co,Kd',
      display_limit: '15',
    });
    const res = await timedFetch(
      `https://connector-gateway.lovable.dev/semrush/keywords/phrase_related?${qs}`,
      { headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': semrushKey } },
    );
    if (!res || !res.ok) return EMPTY;
    const json = await res.json().catch(() => null);
    rows = json?.data?.rows || null;
    if (!rows?.length) return EMPTY;
    // Keyword volumes move slowly — 14-day TTL is plenty and saves credits.
    await setCached(supabase, 'search_demand', cacheKey, rows, 24 * 14);
  }

  const lines = (rows as any[]).slice(0, 12).map((r: any) => {
    const [phrase, volume, cpc, comp, kd] = Array.isArray(r) ? r : [r.Ph, r.Nq, r.Cp, r.Co, r.Kd];
    return `- "${phrase}" — ${volume} searches/mo, CPC $${cpc}, competition ${comp}, difficulty ${kd}`;
  });

  return {
    ok: true,
    source: `semrush:${database}`,
    section: `=== LIVE SEARCH DEMAND (REAL DATA — GROUND HOOKS IN THESE) ===
These are actual monthly search volumes in the ${database.toUpperCase()} market for this niche:
${lines.join('\n')}

SEARCH-DEMAND RULES:
1. Hooks and captions must use the language people actually search for above — not invented phrasing.
2. Prioritise high-volume, low-difficulty phrases for educational/awareness posts.
3. High-CPC phrases signal commercial intent — reserve those for conversion-phase and paid posts.
4. Do not claim a search volume in copy; use the phrasing, not the numbers.`,
  };
}

// ---------------------------------------- 2. competitor ad reconnaissance --

/**
 * Best-effort recon of currently-running ads in the niche.
 * Meta Ad Library and TikTok Creative Center are fetched publicly; when they
 * block server-side requests we return whatever succeeded and let the model
 * know the recon was partial rather than inventing competitor data.
 */
export async function fetchCompetitorAds(
  supabase: any,
  niche: string,
  competitors: string,
  platform: string,
  country: string,
): Promise<IntelResult> {
  const cc = /uk|united kingdom/i.test(country) ? 'GB' : /canada/i.test(country) ? 'CA' : /australia/i.test(country) ? 'AU' : 'US';
  const terms = [
    ...competitors.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 3),
    niche,
  ];
  const cacheKey = `${platform}|${cc}|${terms.join('+')}`.toLowerCase().slice(0, 200);

  let snippets: string[] | null = await getCached(supabase, 'competitor_ads', cacheKey);

  if (!snippets) {
    // Independent per-term lookups — run them concurrently so the worst case is one
    // timeout window rather than the sum of three.
    const perTerm = await Promise.all(
      terms.slice(0, 3).map(async (term) => {
        const out: string[] = [];
        const url =
          `https://www.facebook.com/ads/library/async/search_ads/?q=${encodeURIComponent(term)}` +
          `&count=20&active_status=active&ad_type=all&country=${cc}&media_type=all`;
        const res = await timedFetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KorexIntelligence/1.0)',
            Accept: 'text/html,application/json',
          },
        });
        if (!res || !res.ok) return out;
        const body = await res.text().catch(() => '');
        // The async endpoint returns a `for (;;);`-prefixed JSON payload.
        const cleaned = body.replace(/^for\s*\(;;\);/, '');
        const bodies = [...cleaned.matchAll(/"body"\s*:\s*\{\s*"markup"[\s\S]{0,400}?"__html"\s*:\s*"([^"]{40,400})"/g)]
          .map((m) => stripHtml(m[1].replace(/\\u003C/g, '<').replace(/\\n/g, ' ')))
          .filter(Boolean);
        const titles = [...cleaned.matchAll(/"title"\s*:\s*"([^"]{15,180})"/g)].map((m) => m[1]);
        out.push(...bodies.slice(0, 6).map((b) => `[${term}] ${b.slice(0, 220)}`));
        out.push(...titles.slice(0, 6).map((t) => `[${term}] ${t}`));
        return out;
      }),
    );
    snippets = Array.from(new Set(perTerm.flat())).slice(0, 24);
    // Ad creative in a niche turns over weekly — 3-day TTL keeps it fresh but cheap.
    if (snippets.length) await setCached(supabase, 'competitor_ads', cacheKey, snippets, 72);
  }


  if (!snippets?.length) {
    return {
      ok: false,
      source: 'ad-library:blocked',
      section: `=== COMPETITOR AD RECONNAISSANCE ===
Live ad-library recon returned no results for this niche right now. Do NOT invent competitor ad data. Instead, treat the following as saturated by default and avoid them: generic "transform your life" promises, unsourced percentage claims, stock-footage talking-head intros, and discount-only hooks with no mechanism. Differentiate on mechanism, proof, and specificity.`,
    };
  }

  return {
    ok: true,
    source: 'meta-ad-library',
    section: `=== COMPETITOR AD RECONNAISSANCE (ADS CURRENTLY RUNNING IN THIS NICHE) ===
${snippets.map((s) => `- ${s}`).join('\n')}

ANTI-SATURATION RULES (MANDATORY):
1. Read the recon above and identify the 3-5 dominant angles, hook structures, and offer framings already saturating this niche.
2. Your strategy must NOT reuse those angles. Explicitly pick unoccupied positioning.
3. Record what you deliberately avoided in differentiation_plan.avoid_generic_niche_tropes, quoting the saturated pattern.
4. Where a saturated angle is saturated because it works, keep the underlying mechanic but change the anchor (product specific, pain-point specific, proof-type specific) so the creative reads as new.`,
  };
}

// ------------------------------------------------- 5. deep product crawl --

/** Crawls the business website for real product names, prices, guarantees, proof. */
export async function crawlBusinessSite(supabase: any, website: string): Promise<IntelResult> {
  if (!website) return EMPTY;
  let base: URL;
  try {
    base = new URL(website.startsWith('http') ? website : `https://${website}`);
  } catch {
    return EMPTY;
  }

  const cacheKey = base.hostname.toLowerCase();
  let pages: { url: string; text: string }[] | null = await getCached(supabase, 'site_crawl', cacheKey);

  if (!pages) {
    pages = [];
    const home = await timedFetch(base.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KorexIntelligence/1.0)' },
    });
    if (!home || !home.ok) return EMPTY;
    const homeHtml = await home.text().catch(() => '');
    pages.push({ url: base.toString(), text: stripHtml(homeHtml).slice(0, 4000) });

    // Follow up to 3 high-signal internal links.
    const links = [...homeHtml.matchAll(/href="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((h) => /product|shop|pricing|service|collection|review|testimonial|about/i.test(h))
      .map((h) => {
        try { return new URL(h, base).toString(); } catch { return ''; }
      })
      .filter((h) => h && h.startsWith(base.origin));

    // Fetch the internal pages concurrently — they are independent, so worst case
    // is one timeout window (~9s) instead of three sequential ones (~27s).
    const linkResults = await Promise.all(
      Array.from(new Set(links)).slice(0, 3).map(async (link) => {
        const r = await timedFetch(link, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KorexIntelligence/1.0)' } });
        if (!r || !r.ok) return null;
        const text = await r.text().catch(() => '');
        if (!text) return null;
        return { url: link, text: stripHtml(text).slice(0, 3000) };
      }),
    );
    for (const p of linkResults) if (p) pages.push(p);

    // Site copy changes rarely — 7-day TTL.
    await setCached(supabase, 'site_crawl', cacheKey, pages, 24 * 7);
  }

  if (!pages.length) return EMPTY;

  const prices = Array.from(
    new Set(pages.flatMap((p) => [...p.text.matchAll(/[$£€]\s?\d[\d,]*(?:\.\d{2})?/g)].map((m) => m[0]))),
  ).slice(0, 12);

  return {
    ok: true,
    source: `crawl:${base.hostname}`,
    section: `=== LIVE PRODUCT & OFFER TRUTH (CRAWLED FROM ${base.hostname}) ===
${pages.map((p) => `- ${p.url}\n  ${p.text.slice(0, 1200)}`).join('\n')}
${prices.length ? `\nObserved prices on site: ${prices.join(', ')}` : ''}

PRODUCT-TRUTH RULES:
1. Use ONLY real product/service names, prices, guarantees and proof points found above. Never invent a product, price, or claim.
2. Where the crawl shows specific wording (guarantee terms, shipping, materials, credentials), reuse that exact specificity in copy.
3. If a needed detail is not in the crawl, write around it rather than fabricating it.`,
  };
}

// ------------------------------------------------ 6. voice-of-customer ----

/** Mines real customer language from public Reddit discussion in the niche. */
export async function fetchVoiceOfCustomer(
  supabase: any,
  niche: string,
  products: string,
): Promise<IntelResult> {
  const q = `${niche} ${products.split(',')[0] || ''}`.trim().slice(0, 80);
  const cacheKey = q.toLowerCase();

  let quotes: string[] | null = await getCached(supabase, 'voice_of_customer', cacheKey);

  if (!quotes) {
    const res = await timedFetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&t=year&limit=25`,
      { headers: { 'User-Agent': 'web:korex-intelligence:1.0 (by /u/korex)' } },
    );
    if (!res || !res.ok) return EMPTY;
    const json = await res.json().catch(() => null);
    const children = json?.data?.children || [];
    quotes = children
      .map((c: any) => {
        const t = (c?.data?.title || '').trim();
        const s = (c?.data?.selftext || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        return [t, s].filter(Boolean).join(' — ');
      })
      .filter((s: string) => s.length > 30)
      .slice(0, 15);
    if (quotes?.length) await setCached(supabase, 'voice_of_customer', cacheKey, quotes, 24 * 7);
  }

  if (!quotes?.length) return EMPTY;

  return {
    ok: true,
    source: 'reddit',
    section: `=== VOICE OF CUSTOMER (REAL PEOPLE, REAL WORDS — LAST 12 MONTHS) ===
${quotes.map((q2) => `- "${q2}"`).join('\n')}

VOICE-OF-CUSTOMER RULES:
1. Mirror this vocabulary. Real customer phrasing consistently outperforms marketer phrasing.
2. Extract the recurring frustrations above and turn the top 3 into hooks.
3. Extract recurring objections and pre-handle them in body copy for consideration/conversion posts.
4. Never quote a person verbatim as a testimonial — use the language pattern, not the quote.`,
  };
}

// ------------------------------------------------- 7. seasonality/calendar --

const US_HOLIDAYS: { md: string; name: string; commercial: string }[] = [
  { md: '01-01', name: "New Year's Day", commercial: 'resolution/reset demand peak' },
  { md: '02-14', name: "Valentine's Day", commercial: 'gifting peak, CPMs up ~20%' },
  { md: '03-17', name: "St. Patrick's Day", commercial: 'light social engagement lift' },
  { md: '05-05', name: 'Cinco de Mayo', commercial: 'food/beverage lift' },
  { md: '05-26', name: 'Memorial Day', commercial: 'major retail sale weekend' },
  { md: '07-04', name: 'Independence Day', commercial: 'sale weekend, lower weekday reach' },
  { md: '09-01', name: 'Labor Day', commercial: 'back-to-school sale close' },
  { md: '10-31', name: 'Halloween', commercial: 'high organic engagement, creative moment' },
  { md: '11-27', name: 'Thanksgiving', commercial: 'CPM surge begins' },
  { md: '11-28', name: 'Black Friday', commercial: 'highest CPMs and highest intent of the year' },
  { md: '12-01', name: 'Cyber Monday', commercial: 'peak ecommerce conversion' },
  { md: '12-25', name: 'Christmas', commercial: 'gifting close, then post-holiday clearance' },
];

export function buildSeasonalitySection(startDateISO: string, durationDays: number, geo: string): string {
  const start = new Date(startDateISO);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  const hits: string[] = [];
  for (const h of US_HOLIDAYS) {
    for (const year of [start.getUTCFullYear(), start.getUTCFullYear() + 1]) {
      const d = new Date(`${year}-${h.md}T00:00:00Z`);
      if (d >= start && d <= end) {
        hits.push(`- ${d.toISOString().split('T')[0]} — ${h.name}: ${h.commercial}`);
      }
    }
  }

  // Pay cycles: 1st and 15th are the dominant US consumer purchase windows.
  const payDays: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDate();
    if (day === 1 || day === 15) payDays.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const quarterEnd = (() => {
    const m = end.getUTCMonth();
    return [2, 5, 8, 11].includes(m) ? 'Strategy ends near a quarter close — B2B budget-flush urgency applies in the final week.' : '';
  })();

  return `=== SEASONALITY & CALENDAR AWARENESS (${startDateISO} → ${end.toISOString().split('T')[0]}${geo ? `, ${geo}` : ''}) ===
${hits.length ? hits.join('\n') : '- No major commercial holidays fall inside this window.'}
${payDays.length ? `- Consumer pay-cycle windows (highest purchase intent): ${payDays.join(', ')}` : ''}
${quarterEnd ? `- ${quarterEnd}` : ''}

CALENDAR RULES:
1. Schedule conversion/offer posts on or 1-2 days before pay-cycle dates and commercial holidays.
2. Where CPMs surge (holiday peaks), shift paid weight earlier and lean organic during the peak itself.
3. Reference the moment naturally in copy when it lands in-window; never force a holiday angle that does not fit the brand.
4. Awareness and education posts belong in the low-intent gaps between these dates.`;
}

// ------------------------------------------------- 11. budget awareness ----

export function buildBudgetSection(
  budgetRange: string | null,
  contentMode: string,
  cac: number | null,
  durationDays: number,
): string {
  if (!budgetRange && !cac) {
    return `=== BUDGET AWARENESS ===
No ad budget on file. Assume a lean test budget: 3-5 creatives total for paid, single campaign, no more than 2 ad sets. Scale advice must be phrased conditionally ("once you exceed $X/day, add...").`;
  }

  const parsed = budgetRange ? Number((budgetRange.match(/\d[\d,]*/g) || ['0'])[0].replace(/,/g, '')) : 0;
  const monthly = parsed || 0;
  const daily = monthly ? Math.round(monthly / 30) : 0;

  let tier: string;
  if (daily === 0) tier = 'unknown';
  else if (daily < 50) tier = 'micro';
  else if (daily < 200) tier = 'small';
  else if (daily < 1000) tier = 'mid';
  else tier = 'scale';

  const guidance: Record<string, string> = {
    micro: '1 campaign, 1 ad set, 2-3 creatives max. Do not recommend audience splitting — there is not enough budget to exit the learning phase. Weight the strategy toward organic.',
    small: '1 campaign, 1-2 ad sets, 3-4 creatives, weekly creative refresh. Consolidated budget (CBO/Advantage+) beats splitting at this level.',
    mid: '1-2 campaigns, prospecting + retargeting split, 4-6 creatives per ad set, refresh every 7 days. ABO testing becomes viable alongside a CBO scaling campaign.',
    scale: 'Full structure: dedicated testing campaign (ABO), scaling campaign (CBO/Advantage+), and retargeting. 6-10 creatives in rotation, refresh every 5-7 days.',
    unknown: 'Assume a lean budget and phrase scale advice conditionally.',
  };

  return `=== BUDGET AWARENESS (SCALE THE OUTPUT TO REAL SPEND) ===
- Reported ad budget: ${budgetRange || 'not provided'}${daily ? ` (~$${daily}/day)` : ''}
${cac ? `- Known customer acquisition cost: $${cac}. At this CAC, the ${durationDays}-day plan should target roughly ${daily && cac ? Math.max(1, Math.floor((daily * durationDays) / cac)) : 'a realistic number of'} acquisitions — do not predict conversions beyond what the budget mathematically allows.` : ''}
- Budget tier: ${tier}. ${guidance[tier]}

BUDGET RULES:
1. Never recommend a campaign structure the budget cannot statistically support (each ad set needs ~50 conversions/week to exit learning).
2. Creative volume in the plan must match what this budget can actually test.
3. predicted_metrics.expected_conversions must be consistent with budget ÷ CAC. Unrealistic forecasts destroy trust.
4. For ${contentMode} mode, weight recommendations accordingly — a micro budget means organic carries the plan.`;
}

// -------------------------------------------- 12. hook diversity enforcement --

const HOOK_ARCHETYPES = [
  'curiosity_gap', 'pattern_interrupt', 'bold_statement', 'question',
  'contrarian', 'stakes_first', 'social_proof', 'how_to', 'story_open', 'listicle',
];

/**
 * Deterministic post-processing: no two posts may share the same hook archetype
 * back-to-back, and no archetype may exceed ~25% of the plan.
 * Returns the posts with a `diversity_note` added where reassignment happened.
 */
export function enforceHookDiversity(posts: any[]): { posts: any[]; reassigned: number } {
  const counts: Record<string, number> = {};
  const cap = Math.max(2, Math.ceil(posts.length * 0.25));
  let reassigned = 0;
  let prev = '';

  for (const post of posts) {
    const hook = post?.copy_elements?.hook;
    if (!hook) continue;
    let technique = String(hook.technique || 'curiosity_gap').toLowerCase();

    const overCap = (counts[technique] || 0) >= cap;
    if (technique === prev || overCap) {
      const alt = HOOK_ARCHETYPES
        .filter((a) => a !== prev)
        .sort((a, b) => (counts[a] || 0) - (counts[b] || 0))[0];
      if (alt && alt !== technique) {
        hook.technique = alt;
        hook.diversity_note = `Reassigned from ${technique} to ${alt} to prevent hook-archetype repetition across the plan.`;
        technique = alt;
        reassigned++;
      }
    }

    counts[technique] = (counts[technique] || 0) + 1;
    prev = technique;
  }

  return { posts, reassigned };
}

export const DIVERSITY_PROMPT = `=== HOOK DIVERSITY REQUIREMENT ===
Across this batch, no two consecutive posts may use the same hook technique, and no single technique may be used for more than 25% of posts. Rotate across: curiosity_gap, pattern_interrupt, bold_statement, question, contrarian, stakes_first, social_proof, how_to, story_open, listicle. Vary the opening sentence structure too — do not start multiple posts with the same word or construction.`;

// ------------------------------------------------------- 8. confidence -----

export const CONFIDENCE_PROMPT = `=== PER-POST CONFIDENCE SCORING (REQUIRED) ===
Every post must include performance_prediction.confidence_level (High|Medium|Low), a numeric performance_prediction.confidence_score (0-100), and performance_prediction.prediction_basis that names the SPECIFIC data source driving the forecast — e.g. "user's own top-performing carousel at 4.8% engagement", "live search demand for '<phrase>'", "competitor recon shows this angle unoccupied", or "general platform benchmark (no user data)". If the only basis is a general benchmark, confidence must be Low or Medium — never High.`;

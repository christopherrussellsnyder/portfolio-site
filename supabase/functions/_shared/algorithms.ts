// ============================================================================
// Korex Algorithm Layer
//
// Deterministic, zero-AI-cost algorithms shared by the research engine,
// strategy generation and content generation pipelines.
//
// DESIGN RULES (non-negotiable):
// 1. Nothing in this file invents a data point. Every function only ranks,
//    dedupes, compares, scores or labels signals that were actually gathered.
//    Where a value is absent, the output says so instead of filling the gap.
// 2. Provenance is preserved end to end. A signal's `sourceType`
//    ('first_party' | 'real_api' | 'ai_estimated') travels with it into every
//    derived score and every prompt line.
// 3. Everything here is pure CPU. No network, no model calls, no extra spend.
// ============================================================================

// ============================================================================
// SECTION A — TEXT PRIMITIVES
// ============================================================================

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'these',
  'those', 'as', 'at', 'by', 'from', 'your', 'you', 'our', 'we', 'they',
  'their', 'has', 'have', 'had', 'will', 'can', 'more', 'most', 'not', 'no',
  'so', 'if', 'than', 'then', 'when', 'how', 'what', 'why', 'about', 'into',
]);

export function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9$%.\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Jaccard overlap of token sets — cheap near-duplicate detector. */
export function jaccard(a: string, b: string): number {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Character-trigram similarity — catches reworded duplicates that token
 *  overlap misses (e.g. "free next-day delivery" vs "next day delivery free"). */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = ` ${String(s).toLowerCase().replace(/\s+/g, ' ').trim()} `;
    const out = new Set<string>();
    for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

/** Combined similarity used for deduplication decisions. */
export function similarity(a: string, b: string): number {
  return Math.max(jaccard(a, b), trigramSimilarity(a, b) * 0.95);
}

// ============================================================================
// SECTION B — RESEARCH ENGINE: EVIDENCE FUSION
//
// Replaces "concatenate every source block in a fixed order and hope the model
// weighs them sensibly" with an explicit ranked, deduplicated,
// contradiction-aware evidence ledger.
// ============================================================================

export type SourceType = 'first_party' | 'real_api' | 'ai_estimated';

export interface RawSignal {
  /** The claim/observation itself, verbatim from the source. */
  text: string;
  /** Provenance label carried through from the fetcher (e.g. 'crawl:acme.com'). */
  source: string;
  sourceType: SourceType;
  /** When the underlying data was observed. Unknown = treated as stale-neutral. */
  observedAt?: string | null;
  /** Optional pre-known sample size (first-party measurements). */
  sampleSize?: number | null;
}

export interface FusedSignal extends RawSignal {
  /** 0-1. Reliability x recency x relevance. */
  weight: number;
  reliability: number;
  recency: number;
  relevance: number;
  /** How many *independent* sources asserted substantially the same thing. */
  corroboration: number;
  corroboratedBy: string[];
}

export interface Contradiction {
  subject: string;
  claims: { text: string; source: string; sourceType: SourceType }[];
  kind: 'numeric_conflict' | 'directional_conflict';
  /** Which claim wins on source reliability, and why. */
  resolution: string;
}

export interface EvidenceLedger {
  signals: FusedSignal[];
  contradictions: Contradiction[];
  /** 0-100 overall confidence in the synthesized picture. */
  confidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  confidenceBasis: string;
  /** Counts by provenance so the UI/prompt can never over-claim. */
  composition: Record<SourceType, number>;
  duplicatesCollapsed: number;
}

/**
 * Reliability priors by source class. These are deliberately conservative and
 * ordered by how directly the source measures reality for THIS advertiser:
 * their own measured outcomes beat a vendor API, which beats a public scrape,
 * which beats a model's prior knowledge.
 */
const RELIABILITY: { match: RegExp; score: number }[] = [
  { match: /^performance_feedback|first_party|niche_calibration/i, score: 1.0 },
  { match: /^meta-marketing-api|real_api|connected_ad_account/i, score: 0.9 },
  { match: /^crawl:/i, score: 0.85 },          // the business's own published truth
  { match: /^semrush/i, score: 0.8 },          // licensed measurement vendor
  { match: /^meta-ad-library/i, score: 0.6 },  // real but unrepresentative sample
  { match: /^reddit/i, score: 0.5 },           // real language, unverified claims
  { match: /^seasonality|^budget/i, score: 0.7 }, // deterministic, from real inputs
  { match: /campaign_intelligence_signals|ai_estimated/i, score: 0.25 },
];

export function reliabilityOf(source: string, sourceType: SourceType): number {
  for (const r of RELIABILITY) if (r.match.test(source)) return r.score;
  return sourceType === 'first_party' ? 0.9 : sourceType === 'real_api' ? 0.8 : 0.25;
}

/**
 * Exponential recency decay with a source-appropriate half-life. Ad creative
 * turns over in days; site copy and search volume in months. Unknown dates get
 * a neutral 0.6 rather than being treated as fresh.
 */
export function recencyOf(source: string, observedAt?: string | null): number {
  if (!observedAt) return 0.6;
  const ageDays = (Date.now() - new Date(observedAt).getTime()) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0.6;
  const halfLife = /ad-library|reddit|campaign_intelligence/i.test(source)
    ? 14
    : /semrush|crawl/i.test(source)
    ? 90
    : 45;
  return Math.max(0.1, Math.pow(0.5, ageDays / halfLife));
}

/** Query-specific relevance: token overlap between the signal and the actual
 *  business/query terms, so a generic industry factoid ranks below a signal
 *  that names this business's product. */
export function relevanceOf(text: string, queryTerms: string[]): number {
  if (!queryTerms.length) return 0.6;
  const sig = new Set(tokenize(text));
  if (!sig.size) return 0;
  let hits = 0;
  for (const q of queryTerms) {
    const qt = tokenize(q);
    if (qt.some((t) => sig.has(t))) hits++;
  }
  // Saturating: matching 3+ query terms is already maximally relevant.
  return Math.min(1, 0.35 + (hits / Math.min(queryTerms.length, 3)) * 0.65);
}

const NUM_RE = /(-?\d[\d,]*\.?\d*)\s*(%|percent|\/mo|per month|searches|days?|hours?|x)?/gi;
const MONEY_RE = /[$£€]\s?\d[\d,]*(?:\.\d{2})?/g;

function numericClaims(text: string): { value: number; unit: string }[] {
  const out: { value: number; unit: string }[] = [];
  for (const m of String(text).matchAll(NUM_RE)) {
    const v = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(v)) out.push({ value: v, unit: (m[2] || '').toLowerCase() });
  }
  for (const m of String(text).matchAll(MONEY_RE)) {
    const v = Number(m[0].replace(/[^0-9.]/g, ''));
    if (Number.isFinite(v)) out.push({ value: v, unit: 'currency' });
  }
  return out;
}

/** Topic key for grouping claims that are *about* the same thing. */
function subjectKey(text: string): string {
  const t = tokenize(text).filter((w) => !/^\d/.test(w));
  return t.slice(0, 4).sort().join('-') || 'general';
}

const POSITIVE = /\b(increase|higher|up|grow|outperform|beats?|lift|strong|works?|effective|best)\b/i;
const NEGATIVE = /\b(decrease|lower|down|decline|underperform|worse|weak|fails?|ineffective|avoid)\b/i;

/**
 * Collapses signals that assert substantially the same underlying fact so one
 * fact seen in three places is counted as one corroborated fact, not three
 * independent data points. Corroboration is only credited across *different*
 * sources — the same source repeating itself adds nothing.
 */
export function dedupeSignals(signals: FusedSignal[], threshold = 0.62): { kept: FusedSignal[]; collapsed: number } {
  const kept: FusedSignal[] = [];
  let collapsed = 0;

  // Highest-weight signal wins the slot; weaker near-duplicates fold into it.
  for (const sig of [...signals].sort((a, b) => b.weight - a.weight)) {
    const dup = kept.find((k) => similarity(k.text, sig.text) >= threshold);
    if (!dup) {
      kept.push({ ...sig });
      continue;
    }
    collapsed++;
    if (dup.source !== sig.source && !dup.corroboratedBy.includes(sig.source)) {
      dup.corroboratedBy.push(sig.source);
      dup.corroboration = 1 + dup.corroboratedBy.length;
      // Independent corroboration raises confidence in the surviving claim,
      // with diminishing returns and a hard ceiling.
      dup.weight = Math.min(1, dup.weight * (1 + 0.12 * dup.corroboratedBy.length));
    }
  }
  return { kept, collapsed };
}

/**
 * Surfaces disagreement instead of blending it away. Two kinds are detected:
 *  - numeric_conflict: same subject, materially different numbers (>35% apart)
 *  - directional_conflict: same subject, opposite polarity claims
 * Resolution states which source is more reliable — it does NOT delete the
 * losing claim, so the model (and the user) can see the disagreement exists.
 */
export function detectContradictions(signals: FusedSignal[]): Contradiction[] {
  const bySubject = new Map<string, FusedSignal[]>();
  for (const s of signals) {
    const k = subjectKey(s.text);
    if (!bySubject.has(k)) bySubject.set(k, []);
    bySubject.get(k)!.push(s);
  }

  const out: Contradiction[] = [];
  for (const [subject, group] of bySubject) {
    if (group.length < 2) continue;

    const best = [...group].sort((a, b) => b.weight - a.weight)[0];
    const resolution =
      `Higher-reliability source "${best.source}" (${best.sourceType}) takes precedence; ` +
      `the conflicting claim is retained and must not be presented as settled fact.`;

    // Numeric conflict
    const numeric = group
      .map((g) => ({ g, nums: numericClaims(g.text).filter((n) => n.unit) }))
      .filter((x) => x.nums.length);
    if (numeric.length >= 2) {
      for (const unit of new Set(numeric.flatMap((x) => x.nums.map((n) => n.unit)))) {
        const vals = numeric
          .map((x) => ({ g: x.g, v: x.nums.find((n) => n.unit === unit)?.value }))
          .filter((x) => typeof x.v === 'number') as { g: FusedSignal; v: number }[];
        if (vals.length < 2) continue;
        const min = Math.min(...vals.map((v) => v.v));
        const max = Math.max(...vals.map((v) => v.v));
        if (min > 0 && (max - min) / max > 0.35) {
          out.push({
            subject,
            kind: 'numeric_conflict',
            claims: vals.map((v) => ({ text: v.g.text, source: v.g.source, sourceType: v.g.sourceType })),
            resolution,
          });
        }
      }
    }

    // Directional conflict
    const pos = group.filter((g) => POSITIVE.test(g.text) && !NEGATIVE.test(g.text));
    const neg = group.filter((g) => NEGATIVE.test(g.text) && !POSITIVE.test(g.text));
    if (pos.length && neg.length) {
      out.push({
        subject,
        kind: 'directional_conflict',
        claims: [...pos.slice(0, 2), ...neg.slice(0, 2)].map((g) => ({
          text: g.text, source: g.source, sourceType: g.sourceType,
        })),
        resolution,
      });
    }
  }
  return out.slice(0, 6);
}

/**
 * Confidence in the synthesized picture, from three real properties of the
 * evidence: how reliable the sources are, how much independent agreement
 * exists, and how fresh it is — minus a penalty for unresolved contradictions.
 * A picture built only from model priors is capped at Low.
 */
export function scoreConfidence(signals: FusedSignal[], contradictions: Contradiction[]): {
  confidence: number; label: 'High' | 'Medium' | 'Low'; basis: string;
} {
  if (!signals.length) {
    return { confidence: 0, label: 'Low', basis: 'No evidence gathered — output rests on the business profile alone.' };
  }

  const totalW = signals.reduce((s, x) => s + x.weight, 0);
  const avgReliability = signals.reduce((s, x) => s + x.reliability * x.weight, 0) / (totalW || 1);
  const avgRecency = signals.reduce((s, x) => s + x.recency * x.weight, 0) / (totalW || 1);
  const corroborated = signals.filter((s) => s.corroboration > 1).length;
  const agreement = signals.length > 1 ? corroborated / signals.length : 0;

  const measured = signals.filter((s) => s.sourceType !== 'ai_estimated');
  const measuredShare = measured.length / signals.length;

  let score =
    100 * (0.40 * avgReliability + 0.20 * avgRecency + 0.20 * agreement + 0.20 * measuredShare);
  score -= contradictions.length * 6;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Hard honesty cap: model priors alone can never read as High confidence.
  if (measuredShare === 0) score = Math.min(score, 35);

  const label: 'High' | 'Medium' | 'Low' = score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low';
  const basis =
    `${measured.length}/${signals.length} signals from measured sources; ` +
    `${corroborated} independently corroborated; ` +
    `avg source reliability ${(avgReliability * 100).toFixed(0)}%, freshness ${(avgRecency * 100).toFixed(0)}%` +
    (contradictions.length ? `; ${contradictions.length} unresolved contradiction(s)` : '');

  return { confidence: score, label, basis };
}

/** Full research-fusion pipeline: weight → dedupe → contradict → score. */
export function buildEvidenceLedger(raw: RawSignal[], queryTerms: string[]): EvidenceLedger {
  const weighted: FusedSignal[] = raw
    .filter((r) => r?.text && String(r.text).trim().length > 12)
    .map((r) => {
      const reliability = reliabilityOf(r.source, r.sourceType);
      const recency = recencyOf(r.source, r.observedAt);
      const relevance = relevanceOf(r.text, queryTerms);
      return {
        ...r,
        text: String(r.text).replace(/\s+/g, ' ').trim(),
        reliability,
        recency,
        relevance,
        weight: reliability * (0.55 + 0.45 * recency) * (0.5 + 0.5 * relevance),
        corroboration: 1,
        corroboratedBy: [] as string[],
      };
    });

  const { kept, collapsed } = dedupeSignals(weighted);
  const ranked = kept.sort((a, b) => b.weight - a.weight);
  const contradictions = detectContradictions(ranked);
  const { confidence, label, basis } = scoreConfidence(ranked, contradictions);

  const composition: Record<SourceType, number> = { first_party: 0, real_api: 0, ai_estimated: 0 };
  for (const s of ranked) composition[s.sourceType]++;

  return {
    signals: ranked,
    contradictions,
    confidence,
    confidenceLabel: label,
    confidenceBasis: basis,
    composition,
    duplicatesCollapsed: collapsed,
  };
}

/** Renders the ledger as a prompt block the generation model can act on. */
export function renderEvidenceLedger(ledger: EvidenceLedger, maxSignals = 22): string {
  if (!ledger.signals.length) return '';

  const tierLabel = (t: SourceType) =>
    t === 'first_party' ? 'MEASURED (this advertiser)' : t === 'real_api' ? 'MEASURED (live API)' : 'AI-ESTIMATED (model prior)';

  const lines = ledger.signals.slice(0, maxSignals).map((s, i) => {
    const corro = s.corroboration > 1 ? ` [corroborated by ${s.corroboratedBy.join(', ')}]` : '';
    return `${i + 1}. (w=${s.weight.toFixed(2)} | ${tierLabel(s.sourceType)} | ${s.source})${corro} ${s.text}`;
  });

  const contra = ledger.contradictions.length
    ? `\n=== CONTRADICTIONS BETWEEN SOURCES (DO NOT AVERAGE THESE AWAY) ===\n` +
      ledger.contradictions
        .map(
          (c, i) =>
            `${i + 1}. [${c.kind}] on "${c.subject}":\n` +
            c.claims.map((cl) => `   - ${cl.source} (${cl.sourceType}): ${cl.text.slice(0, 180)}`).join('\n') +
            `\n   Resolution: ${c.resolution}`,
        )
        .join('\n')
    : '';

  return `=== RANKED EVIDENCE LEDGER (weighted by source reliability × recency × relevance) ===
Confidence in this evidence base: ${ledger.confidenceLabel} (${ledger.confidence}/100).
Basis: ${ledger.confidenceBasis}
Composition: ${ledger.composition.first_party} first-party, ${ledger.composition.real_api} live-API, ${ledger.composition.ai_estimated} AI-estimated. ${ledger.duplicatesCollapsed} duplicate signal(s) collapsed so no fact is double-counted.

${lines.join('\n')}
${contra}

EVIDENCE RULES (MANDATORY):
1. Higher-weight signals override lower-weight ones. A measured first-party number always beats an AI-estimated trend.
2. Never present an AI-ESTIMATED line as measured, live, or sourced from platform data.
3. Where a contradiction is listed above, do not silently pick a side or split the difference — follow the stated resolution and phrase the claim with appropriate hedging.
4. A signal corroborated by multiple independent sources may be stated with more certainty than a single-source signal. A repeated signal from the SAME source is not corroboration.
5. If the evidence base is Low confidence, say what you would need to raise it rather than compensating with confident-sounding generic advice.`;
}

// ============================================================================
// SECTION C — STRATEGY GENERATION: STRUCTURED CANDIDATE SCORING
//
// Replaces a single holistic "does this look good" judgment with explicit,
// measurable dimensions computed from the output text itself. Zero AI cost,
// so it can run on every candidate.
// ============================================================================

/** Phrases that mark generic best-practice filler rather than business-specific
 *  strategy. Every one of these is content a competitor could publish verbatim. */
export const FILLER_PHRASES = [
  'engage your audience', 'take your business to the next level', 'in today\'s digital',
  'game changer', 'game-changer', 'unlock the power', 'boost your', 'elevate your',
  'stay ahead of the curve', 'the sky is the limit', 'transform your life',
  'revolutionize', 'cutting-edge solution', 'best-in-class', 'world-class',
  'seamless experience', 'leverage the power', 'drive results', 'maximize your potential',
  'don\'t miss out', 'act now', 'limited time only', 'you won\'t believe',
  'we\'ve got you covered', 'look no further', 'the ultimate guide',
  'quality you can trust', 'passionate about', 'dedicated to excellence',
];

export interface StrategyScore {
  total: number;
  dimensions: {
    specificity: number;      // names real products/prices/proof rather than abstractions
    grounding: number;        // measurably reuses gathered evidence
    originality: number;      // low internal repetition across posts
    filler: number;           // inverse of generic-phrase density
    actionability: number;    // concrete CTA + measurable prediction present
    calibrationFit: number;   // aligns with measured niche calibration
  };
  flaggedPosts: { index: number; day?: number; reasons: string[] }[];
}

interface ScorePost {
  day_number?: number;
  copy_elements?: { hook?: { text?: string }; body?: string; full_caption?: string; cta?: { text?: string } };
  strategic_rationale?: { differentiation_anchor?: string };
  performance_prediction?: { confidence_score?: number; prediction_basis?: string };
}

function postText(p: ScorePost): string {
  return [
    p?.copy_elements?.hook?.text,
    p?.copy_elements?.body,
    p?.copy_elements?.full_caption,
    p?.copy_elements?.cta?.text,
  ].filter(Boolean).join(' ');
}

/**
 * Scores a candidate strategy on six measurable dimensions and flags the
 * specific posts that drag it down, so the (paid) critic pass can be pointed
 * directly at them instead of re-reading everything blind.
 *
 * `groundingTerms` are the concrete nouns/numbers pulled from real gathered
 * evidence (product names, crawled prices, high-volume search phrases).
 */
export function scoreStrategyCandidate(
  posts: ScorePost[],
  groundingTerms: string[],
  calibratedPatterns: { pattern_value: string; error_pct: number }[] = [],
): StrategyScore {
  const flagged: { index: number; day?: number; reasons: string[] }[] = [];
  if (!posts.length) {
    return {
      total: 0,
      dimensions: { specificity: 0, grounding: 0, originality: 0, filler: 0, actionability: 0, calibrationFit: 0 },
      flaggedPosts: [],
    };
  }

  const texts = posts.map(postText);
  const groundTokens = new Set(groundingTerms.flatMap((t) => tokenize(t)));

  // --- specificity: proper nouns, prices, concrete numbers per post ---
  let specHits = 0;
  // --- grounding: share of posts that reuse a real gathered term ---
  let groundHits = 0;
  // --- filler: generic-phrase occurrences ---
  let fillerHits = 0;
  // --- actionability ---
  let actionHits = 0;

  texts.forEach((text, i) => {
    const reasons: string[] = [];
    const lower = text.toLowerCase();

    const hasNumber = /\b\d/.test(text);
    const hasMoney = /[$£€]\s?\d/.test(text);
    const properNouns = (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
    const specific = hasMoney || (hasNumber && properNouns >= 1) || properNouns >= 3;
    if (specific) specHits++; else reasons.push('no concrete number, price or named product — reads as abstract');

    const toks = new Set(tokenize(text));
    let overlap = 0;
    for (const t of toks) if (groundTokens.has(t)) overlap++;
    if (overlap >= 2) groundHits++;
    else if (groundTokens.size) reasons.push('does not reuse any real gathered evidence term');

    const fillers = FILLER_PHRASES.filter((f) => lower.includes(f));
    fillerHits += fillers.length;
    if (fillers.length) reasons.push(`generic filler: ${fillers.slice(0, 3).map((f) => `"${f}"`).join(', ')}`);

    const cta = posts[i]?.copy_elements?.cta?.text || '';
    const hasAction = cta.length > 8 && /\b(get|book|shop|try|claim|download|start|call|dm|comment|save|order|visit|reply)\b/i.test(cta);
    if (hasAction) actionHits++; else reasons.push('CTA is missing or too vague to act on');

    if (!posts[i]?.strategic_rationale?.differentiation_anchor) {
      reasons.push('no differentiation anchor to a real product/UVP/pain point');
    }

    if (reasons.length) flagged.push({ index: i, day: posts[i]?.day_number, reasons });
  });

  // --- originality: pairwise similarity across posts (lower = better) ---
  let simSum = 0;
  let pairs = 0;
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const s = similarity(texts[i], texts[j]);
      simSum += s;
      pairs++;
      if (s > 0.55) {
        const f = flagged.find((x) => x.index === j);
        const reason = `near-duplicate of post ${i + 1} (similarity ${(s * 100).toFixed(0)}%)`;
        if (f) f.reasons.push(reason);
        else flagged.push({ index: j, day: posts[j]?.day_number, reasons: [reason] });
      }
    }
  }
  const avgSim = pairs ? simSum / pairs : 0;

  // --- calibrationFit: does the plan lean on patterns measured to beat
  //     expectations, and avoid ones measured to disappoint? ---
  let calScore = 0.5; // neutral when no calibration exists — never invented
  if (calibratedPatterns.length) {
    let good = 0;
    let bad = 0;
    const all = texts.join(' ').toLowerCase();
    for (const c of calibratedPatterns) {
      const present = all.includes(String(c.pattern_value).toLowerCase());
      if (!present) continue;
      if (c.error_pct > 0) good++; else bad++;
    }
    calScore = good + bad === 0 ? 0.5 : good / (good + bad);
  }

  const n = posts.length;
  const dimensions = {
    specificity: specHits / n,
    grounding: groundTokens.size ? groundHits / n : 0.5, // neutral when nothing was gathered
    originality: Math.max(0, 1 - avgSim * 1.8),
    filler: Math.max(0, 1 - fillerHits / n),
    actionability: actionHits / n,
    calibrationFit: calScore,
  };

  // Weighted: specificity and grounding are what make a strategy defensible.
  const total = Math.round(
    100 *
      (0.26 * dimensions.specificity +
        0.24 * dimensions.grounding +
        0.18 * dimensions.originality +
        0.14 * dimensions.filler +
        0.10 * dimensions.actionability +
        0.08 * dimensions.calibrationFit),
  );

  flagged.sort((a, b) => b.reasons.length - a.reasons.length);
  return { total, dimensions, flaggedPosts: flagged };
}

/**
 * Picks the strongest of N candidate overviews on the same measurable rubric.
 * Returns the winner plus a comparison trace for logging.
 */
export function selectBestCandidate<T>(
  candidates: { candidate: T; score: StrategyScore }[],
): { best: T; score: StrategyScore; trace: string } {
  const ranked = [...candidates].sort((a, b) => b.score.total - a.score.total);
  const trace = ranked
    .map((c, i) => `#${i + 1} total=${c.score.total} ` +
      Object.entries(c.score.dimensions).map(([k, v]) => `${k}=${(v as number).toFixed(2)}`).join(' '))
    .join(' | ');
  return { best: ranked[0].candidate, score: ranked[0].score, trace };
}

/** Turns flagged posts into a targeted instruction for the critic pass, so the
 *  paid critic call spends its tokens on known-weak posts instead of re-judging
 *  the whole batch from scratch. */
export function buildTargetedCriticNote(score: StrategyScore, limit = 8): string {
  if (!score.flaggedPosts.length) return '';
  const lines = score.flaggedPosts.slice(0, limit).map(
    (f) => `- index ${f.index}${f.day ? ` (day ${f.day})` : ''}: ${f.reasons.join('; ')}`,
  );
  return `=== DETERMINISTIC PRE-SCREEN (computed from the drafted text, not opinion) ===
Overall plan score: ${score.total}/100 — ${Object.entries(score.dimensions)
    .map(([k, v]) => `${k} ${(v as number * 100).toFixed(0)}%`)
    .join(', ')}.
These posts already failed objective checks and MUST be rewritten:
${lines.join('\n')}
Prioritise these. Do not spend the rewrite budget on posts not listed here unless they are clearly worse.`;
}

// ============================================================================
// SECTION D — CONTENT GENERATION: MULTI-OBJECTIVE SELECTION
//
// Generates-then-selects rather than accepting the first draft: one model call
// produces N candidates, and these deterministic scorers choose the best
// maximally-distinct pair.
// ============================================================================

export interface CaptionScore {
  total: number;
  hookStrength: number;
  ctaClarity: number;
  readability: number;
  voiceMatch: number;
  specificity: number;
  fillerPenalty: number;
  notes: string[];
}

const POWER_OPENERS = /^(stop|why|how|what|the|nobody|most|if you|here'?s|you'?re|we|3|5|7|\d)/i;

/** Flesch-style readability proxy — short sentences and short words read better
 *  in-feed. Returns 0-1 where 1 is easiest. */
function readabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 2);
  const words = text.split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return 0;
  const wps = words.length / sentences.length;
  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  // Ideal in-feed: ~12 words/sentence, ~4.7 chars/word.
  const wpsScore = Math.max(0, 1 - Math.abs(wps - 12) / 18);
  const lenScore = Math.max(0, 1 - Math.abs(avgLen - 4.7) / 4);
  return (wpsScore * 0.6 + lenScore * 0.4);
}

/**
 * Scores one caption on independent objectives. `voiceReference` should be the
 * business's real brand-voice traits plus prior approved captions — consistency
 * is measured against actual past output, not an abstract ideal.
 */
export function scoreCaption(
  caption: string,
  opts: {
    hook?: string;
    voiceReference?: string;
    groundingTerms?: string[];
    platform?: string;
  } = {},
): CaptionScore {
  const text = String(caption || '');
  const notes: string[] = [];
  const lower = text.toLowerCase();
  const hook = String(opts.hook || text.split(/[.!?\n]/)[0] || '');

  // Hook strength
  let hookStrength = 0;
  if (hook.length >= 15 && hook.length <= 90) hookStrength += 0.3; else notes.push('hook length is outside the scroll-stopping range');
  if (POWER_OPENERS.test(hook.trim())) hookStrength += 0.25;
  if (/\d/.test(hook)) hookStrength += 0.2;
  if (/\?/.test(hook)) hookStrength += 0.1;
  if (!/\b(we are|we're excited|introducing|check out)\b/i.test(hook)) hookStrength += 0.15;
  else notes.push('hook opens with brand-centric phrasing instead of the reader');
  hookStrength = Math.min(1, hookStrength);

  // CTA clarity
  const ctaVerbs = /\b(get|book|shop|try|claim|download|start|call|dm|comment|save|order|visit|reply|tap|swipe|join)\b/i;
  const ctaClarity = ctaVerbs.test(text) ? (/\b(link in bio|below|now|today)\b/i.test(text) ? 1 : 0.7) : 0.2;
  if (ctaClarity < 0.5) notes.push('no clear action verb — reader does not know what to do next');

  // Readability
  const readability = readabilityScore(text);

  // Voice match against real reference material
  const voiceMatch = opts.voiceReference ? Math.min(1, similarity(text, opts.voiceReference) * 2.4) : 0.5;
  if (opts.voiceReference && voiceMatch < 0.3) notes.push('drifts from the business\'s established voice and prior approved copy');

  // Specificity: concrete anchors from real gathered terms
  const terms = opts.groundingTerms || [];
  const groundTokens = new Set(terms.flatMap((t) => tokenize(t)));
  const toks = new Set(tokenize(text));
  let overlap = 0;
  for (const t of toks) if (groundTokens.has(t)) overlap++;
  const hasNumber = /\b\d/.test(text);
  const specificity = Math.min(1, (overlap >= 2 ? 0.6 : overlap === 1 ? 0.35 : 0) + (hasNumber ? 0.4 : 0));
  if (specificity < 0.35) notes.push('no specific product, number or proof point — could be any competitor\'s post');

  // Filler penalty
  const fillers = FILLER_PHRASES.filter((f) => lower.includes(f));
  const fillerPenalty = Math.min(1, fillers.length * 0.25);
  if (fillers.length) notes.push(`generic filler: ${fillers.slice(0, 2).map((f) => `"${f}"`).join(', ')}`);

  const total = Math.round(
    100 *
      Math.max(0,
        0.28 * hookStrength +
        0.18 * ctaClarity +
        0.14 * readability +
        0.18 * voiceMatch +
        0.22 * specificity -
        0.20 * fillerPenalty),
  );

  return { total, hookStrength, ctaClarity, readability, voiceMatch, specificity, fillerPenalty, notes };
}

/**
 * Picks `count` captions that are both high-scoring AND maximally different
 * from each other, so an A/B test compares genuinely distinct angles rather
 * than two rewordings of the same idea (greedy max-marginal-relevance).
 */
export function selectDiverseCaptions<T extends { caption: string }>(
  candidates: T[],
  scores: CaptionScore[],
  count = 2,
  lambda = 0.65,
): { picked: { item: T; score: CaptionScore }[]; rejected: { item: T; score: CaptionScore; reason: string }[] } {
  const pool = candidates.map((item, i) => ({ item, score: scores[i] }))
    .filter((x) => x.item?.caption)
    .sort((a, b) => b.score.total - a.score.total);

  const picked: { item: T; score: CaptionScore }[] = [];
  const rejected: { item: T; score: CaptionScore; reason: string }[] = [];

  while (picked.length < count && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const maxSim = picked.length
        ? Math.max(...picked.map((p) => similarity(p.item.caption, pool[i].item.caption)))
        : 0;
      // Relevance minus redundancy.
      const val = lambda * (pool[i].score.total / 100) - (1 - lambda) * maxSim;
      if (val > bestVal) { bestVal = val; bestIdx = i; }
    }
    picked.push(pool[bestIdx]);
    pool.splice(bestIdx, 1);
  }

  for (const leftover of pool) {
    const maxSim = Math.max(...picked.map((p) => similarity(p.item.caption, leftover.item.caption)), 0);
    rejected.push({
      ...leftover,
      reason: maxSim > 0.6
        ? `too similar to a selected variant (${(maxSim * 100).toFixed(0)}%)`
        : `lower objective score (${leftover.score.total})`,
    });
  }

  return { picked, rejected };
}

/** Collects real, concrete terms from gathered evidence for use as grounding
 *  anchors in scoring. Only pulls terms that actually appear in the evidence —
 *  never synthesizes plausible-sounding ones. */
export function extractGroundingTerms(sections: (string | null | undefined)[], limit = 60): string[] {
  const terms = new Set<string>();
  for (const s of sections) {
    if (!s) continue;
    for (const m of s.matchAll(/[$£€]\s?\d[\d,]*(?:\.\d{2})?/g)) terms.add(m[0]);
    for (const m of s.matchAll(/"([^"]{4,60})"/g)) terms.add(m[1]);
    for (const m of s.matchAll(/\b[A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9]{2,}){0,2}\b/g)) {
      const t = m[0];
      if (!/^(THE|AND|RULES|LIVE|REAL|DATA|MANDATORY|CRITICAL|USE|DO|NEVER)/i.test(t)) terms.add(t);
    }
    if (terms.size > limit * 3) break;
  }
  return [...terms].slice(0, limit);
}

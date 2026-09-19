// ============================================================================
// Korex Research Algorithm Layer
//
// Deterministic, zero-AI-cost algorithms used by the research engine.
//
// DESIGN RULES (same as _shared/algorithms.ts, non-negotiable):
// 1. Nothing here invents a data point. Every function ranks, clusters,
//    compares, decays or labels signals that were actually observed. Where a
//    value is absent the output says so instead of filling the gap.
// 2. Provenance travels end to end. A claim's source list and source types
//    survive into every derived score.
// 3. Pure CPU. No network, no model calls, no extra spend.
// ============================================================================

import { similarity, tokenize, type SourceType } from "./algorithms.ts";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ResearchClaim {
  /** The claim text, verbatim from the source. */
  text: string;
  /** Source identifier (domain, "meta_api", "first_party", model name...). */
  source: string;
  sourceType: SourceType;
  /** ISO timestamp of when the claim was observed, if known. */
  observedAt?: string | null;
  /** Optional numeric value the claim asserts (rate, lift, count). */
  value?: number | null;
}

export type EvidenceGrade = "A" | "B" | "C" | "D";

// ---------------------------------------------------------------------------
// 1 — CROSS-SOURCE CORROBORATION
//
// Groups near-identical claims coming from DIFFERENT sources and scores
// confidence by how many *independent* sources agree, weighted by source type.
// Ten restatements from one model count once; two independent sources count
// far more.
// ---------------------------------------------------------------------------

const SOURCE_TYPE_WEIGHT: Record<SourceType, number> = {
  first_party: 1.0,
  real_api: 0.9,
  ai_estimated: 0.35,
};

export interface CorroboratedClaim {
  text: string;
  sources: string[];
  sourceTypes: SourceType[];
  /** Count of distinct sources (not distinct restatements). */
  independentSources: number;
  /** 0..1 — independence- and reliability-weighted agreement. */
  corroborationScore: number;
  grade: EvidenceGrade;
  restatements: number;
}

function rootOf(source: string): string {
  const s = String(source || "unknown").toLowerCase().trim();
  const host = s.replace(/^https?:\/\//, "").split("/")[0];
  const parts = host.split(".").filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join(".") : host || "unknown";
}

export function crossSourceCorroboration(
  claims: ResearchClaim[],
  threshold = 0.55,
): CorroboratedClaim[] {
  const clusters: { rep: string; members: ResearchClaim[] }[] = [];

  for (const c of claims) {
    const text = String(c?.text ?? "").trim();
    if (!text) continue;
    const hit = clusters.find((cl) => similarity(cl.rep, text) >= threshold);
    if (hit) hit.members.push({ ...c, text });
    else clusters.push({ rep: text, members: [{ ...c, text }] });
  }

  return clusters
    .map((cl) => {
      const bySource = new Map<string, ResearchClaim>();
      for (const m of cl.members) {
        const key = rootOf(m.source);
        // keep the strongest source type per independent source
        const prev = bySource.get(key);
        if (
          !prev ||
          SOURCE_TYPE_WEIGHT[m.sourceType] > SOURCE_TYPE_WEIGHT[prev.sourceType]
        ) {
          bySource.set(key, m);
        }
      }
      const independent = [...bySource.values()];
      // Diminishing returns: each extra independent source adds less.
      let score = 0;
      independent
        .sort((a, b) => SOURCE_TYPE_WEIGHT[b.sourceType] - SOURCE_TYPE_WEIGHT[a.sourceType])
        .forEach((s, i) => {
          score += SOURCE_TYPE_WEIGHT[s.sourceType] * Math.pow(0.6, i);
        });
      const corroborationScore = Math.max(0, Math.min(1, score));

      const grade: EvidenceGrade =
        independent.some((s) => s.sourceType === "first_party") && independent.length >= 2
          ? "A"
          : corroborationScore >= 0.9
          ? "B"
          : corroborationScore >= 0.5
          ? "C"
          : "D";

      return {
        text: cl.rep,
        sources: independent.map((s) => s.source),
        sourceTypes: independent.map((s) => s.sourceType),
        independentSources: independent.length,
        corroborationScore: Number(corroborationScore.toFixed(3)),
        grade,
        restatements: cl.members.length,
      };
    })
    .sort((a, b) => b.corroborationScore - a.corroborationScore);
}

// ---------------------------------------------------------------------------
// 2 — CHANGE-POINT DETECTION (two-sided CUSUM)
//
// Finds the point in an observed series where the underlying level shifted,
// so "engagement on this format dropped three weeks ago" is detected instead
// of averaged away. Requires real observations — returns detected:false when
// history is too short.
// ---------------------------------------------------------------------------

export interface ChangePoint {
  detected: boolean;
  index: number | null;
  at: string | null;
  direction: "rise" | "drop" | null;
  meanBefore: number | null;
  meanAfter: number | null;
  /** Relative shift, e.g. -0.32 = 32% lower after the change point. */
  shift: number | null;
  observations: number;
  note: string;
}

export function detectChangePoint(
  series: { value: number; at?: string | null }[],
  opts: { minPoints?: number; sensitivity?: number } = {},
): ChangePoint {
  const minPoints = opts.minPoints ?? 6;
  const k = opts.sensitivity ?? 0.5; // slack in std-dev units
  const pts = (series || []).filter((p) => Number.isFinite(p?.value));
  const n = pts.length;

  if (n < minPoints) {
    return {
      detected: false, index: null, at: null, direction: null,
      meanBefore: null, meanAfter: null, shift: null, observations: n,
      note: `Not enough observations (${n}/${minPoints}) to detect a change point.`,
    };
  }

  const vals = pts.map((p) => p.value);
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd =
    Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1e-9;

  let cHi = 0, cLo = 0, best = 0, bestIdx = -1, dir: "rise" | "drop" | null = null;
  for (let i = 0; i < n; i++) {
    const z = (vals[i] - mean) / sd;
    cHi = Math.max(0, cHi + z - k);
    cLo = Math.max(0, cLo - z - k);
    if (cHi > best) { best = cHi; bestIdx = i; dir = "rise"; }
    if (cLo > best) { best = cLo; bestIdx = i; dir = "drop"; }
  }

  const threshold = 4; // std-dev units of accumulated drift
  if (best < threshold || bestIdx < 1 || bestIdx >= n - 1) {
    return {
      detected: false, index: null, at: null, direction: null,
      meanBefore: null, meanAfter: null, shift: null, observations: n,
      note: "No statistically meaningful level shift in the observed series.",
    };
  }

  const before = vals.slice(0, bestIdx);
  const after = vals.slice(bestIdx);
  const mb = before.reduce((a, b) => a + b, 0) / before.length;
  const ma = after.reduce((a, b) => a + b, 0) / after.length;

  return {
    detected: true,
    index: bestIdx,
    at: pts[bestIdx].at ?? null,
    direction: dir,
    meanBefore: Number(mb.toFixed(4)),
    meanAfter: Number(ma.toFixed(4)),
    shift: mb === 0 ? null : Number(((ma - mb) / Math.abs(mb)).toFixed(3)),
    observations: n,
    note: `Level ${dir === "rise" ? "rose" : "dropped"} at observation ${bestIdx + 1} of ${n}.`,
  };
}

// ---------------------------------------------------------------------------
// 3 — DECAY MODELLING
//
// Marketing intel rots. Every observation gets an exponential-decay weight
// based on its age and a per-channel half-life, so a stale pattern can never
// outrank a fresh one purely by having been repeated more often.
// ---------------------------------------------------------------------------

export const HALF_LIFE_DAYS: Record<string, number> = {
  tiktok: 21,
  instagram: 30,
  twitter: 14,
  facebook: 45,
  youtube: 60,
  linkedin: 60,
  default: 30,
};

export interface DecayResult {
  weight: number;
  ageDays: number | null;
  halfLifeDays: number;
  status: "fresh" | "aging" | "stale" | "unknown";
}

export function decayWeight(
  observedAt: string | null | undefined,
  platform = "default",
  now = Date.now(),
): DecayResult {
  const halfLife = HALF_LIFE_DAYS[platform] ?? HALF_LIFE_DAYS.default;
  if (!observedAt) {
    return { weight: 0.5, ageDays: null, halfLifeDays: halfLife, status: "unknown" };
  }
  const t = new Date(observedAt).getTime();
  if (!Number.isFinite(t)) {
    return { weight: 0.5, ageDays: null, halfLifeDays: halfLife, status: "unknown" };
  }
  const ageDays = Math.max(0, (now - t) / 86_400_000);
  const weight = Math.pow(0.5, ageDays / halfLife);
  const status: DecayResult["status"] =
    weight >= 0.75 ? "fresh" : weight >= 0.4 ? "aging" : "stale";
  return {
    weight: Number(weight.toFixed(3)),
    ageDays: Number(ageDays.toFixed(1)),
    halfLifeDays: halfLife,
    status,
  };
}

/** Decay-weighted mean of a series — recent observations dominate. */
export function decayWeightedMean(
  series: { value: number; at?: string | null }[],
  platform = "default",
  now = Date.now(),
): { value: number | null; effectiveSampleSize: number } {
  let num = 0, den = 0;
  for (const p of series || []) {
    if (!Number.isFinite(p?.value)) continue;
    const w = decayWeight(p.at, platform, now).weight;
    num += p.value * w;
    den += w;
  }
  return {
    value: den > 0 ? Number((num / den).toFixed(4)) : null,
    effectiveSampleSize: Number(den.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// 4 — EMERGING TOPIC DETECTION
//
// Burst detection over two observation windows. A topic is "emerging" when its
// share of recent mentions materially exceeds its share in the prior window,
// with a minimum absolute count so single mentions can't spike.
// ---------------------------------------------------------------------------

export interface EmergingTopic {
  term: string;
  recentCount: number;
  priorCount: number;
  /** Ratio of recent share to prior share. >1 = growing. */
  burst: number;
  status: "emerging" | "growing" | "steady" | "declining";
  isNew: boolean;
}

export function detectEmergingTopics(
  recentTexts: string[],
  priorTexts: string[],
  opts: { minCount?: number; limit?: number } = {},
): EmergingTopic[] {
  const minCount = opts.minCount ?? 2;
  const limit = opts.limit ?? 12;

  const count = (texts: string[]) => {
    const m = new Map<string, number>();
    for (const t of texts || []) {
      for (const tok of new Set(tokenize(t))) m.set(tok, (m.get(tok) ?? 0) + 1);
    }
    return m;
  };

  const rec = count(recentTexts);
  const pri = count(priorTexts);
  const recTotal = [...rec.values()].reduce((a, b) => a + b, 0) || 1;
  const priTotal = [...pri.values()].reduce((a, b) => a + b, 0) || 1;

  const out: EmergingTopic[] = [];
  for (const [term, rc] of rec) {
    if (rc < minCount) continue;
    const pc = pri.get(term) ?? 0;
    const recShare = rc / recTotal;
    const priShare = pc / priTotal;
    // Laplace-smoothed so brand-new terms get a finite, comparable burst.
    const burst = (recShare + 1 / recTotal) / (priShare + 1 / priTotal);
    const status: EmergingTopic["status"] =
      burst >= 2.5 ? "emerging" : burst >= 1.3 ? "growing" : burst >= 0.8 ? "steady" : "declining";
    out.push({
      term,
      recentCount: rc,
      priorCount: pc,
      burst: Number(burst.toFixed(2)),
      status,
      isNew: pc === 0,
    });
  }

  return out.sort((a, b) => b.burst - a.burst || b.recentCount - a.recentCount).slice(0, limit);
}

// ---------------------------------------------------------------------------
// 5 — CLAIM ↔ EVIDENCE LINKING
//
// Binds each recommendation to the specific observations that support or
// contradict it and grades it. An unsupported claim is labelled unsupported —
// it is never silently promoted.
// ---------------------------------------------------------------------------

export interface LinkedClaim {
  claim: string;
  supporting: { text: string; source: string; sourceType: SourceType; match: number }[];
  contradicting: { text: string; source: string; sourceType: SourceType }[];
  grade: EvidenceGrade;
  basis: "measured" | "corroborated" | "single_source" | "unsupported";
  note: string;
}

const NEGATION = /\b(no longer|not|never|stopped|declin\w*|down|worse|avoid|hurt\w*|penaliz\w*)\b/i;

export function linkClaimsToEvidence(
  claims: string[],
  evidence: ResearchClaim[],
  threshold = 0.3,
): LinkedClaim[] {
  return (claims || [])
    .map((raw) => String(raw ?? "").trim())
    .filter(Boolean)
    .map((claim) => {
      const supporting: LinkedClaim["supporting"] = [];
      const contradicting: LinkedClaim["contradicting"] = [];

      for (const e of evidence || []) {
        const m = similarity(claim, e.text);
        if (m < threshold) continue;
        const claimNeg = NEGATION.test(claim);
        const evNeg = NEGATION.test(e.text);
        if (claimNeg !== evNeg) {
          contradicting.push({ text: e.text, source: e.source, sourceType: e.sourceType });
        } else {
          supporting.push({
            text: e.text, source: e.source, sourceType: e.sourceType,
            match: Number(m.toFixed(3)),
          });
        }
      }

      supporting.sort((a, b) => b.match - a.match);
      const distinctSources = new Set(supporting.map((s) => rootOf(s.source))).size;
      const hasMeasured = supporting.some(
        (s) => s.sourceType === "first_party" || s.sourceType === "real_api",
      );

      const basis: LinkedClaim["basis"] = hasMeasured
        ? "measured"
        : distinctSources >= 2
        ? "corroborated"
        : distinctSources === 1
        ? "single_source"
        : "unsupported";

      const grade: EvidenceGrade =
        basis === "measured" ? (contradicting.length ? "B" : "A")
        : basis === "corroborated" ? "B"
        : basis === "single_source" ? "C"
        : "D";

      const note =
        basis === "unsupported"
          ? "No observation in the gathered evidence supports this claim — treat as an untested hypothesis."
          : contradicting.length
          ? `${supporting.length} supporting and ${contradicting.length} contradicting observation(s).`
          : `Supported by ${distinctSources} distinct source(s).`;

      return { claim, supporting: supporting.slice(0, 5), contradicting: contradicting.slice(0, 3), grade, basis, note };
    });
}

// ---------------------------------------------------------------------------
// 6 — ENTITY / COMPETITOR RESOLUTION
//
// Collapses the many surface forms of one competitor ("Acme", "Acme Inc.",
// "acme.com", "@acmehq") into a single canonical entity, so mention counts and
// share-of-voice are not split across spellings.
// ---------------------------------------------------------------------------

const LEGAL_SUFFIX = /\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|plc|sa|bv|group|holdings|hq|official)\b/gi;

export function normalizeEntity(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|ai|app|shop|store)(\/.*)?$/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ResolvedEntity {
  canonical: string;
  aliases: string[];
  mentions: number;
  sources: string[];
  shareOfVoice: number;
}

export function resolveEntities(
  mentions: { name: string; source?: string }[],
  threshold = 0.72,
): ResolvedEntity[] {
  const clusters: { key: string; aliases: Map<string, number>; sources: Set<string>; count: number }[] = [];

  for (const m of mentions || []) {
    const raw = String(m?.name ?? "").trim();
    const key = normalizeEntity(raw);
    if (!key) continue;
    const hit = clusters.find(
      (c) => c.key === key || similarity(c.key, key) >= threshold ||
        c.key.startsWith(key) || key.startsWith(c.key),
    );
    const target = hit ?? { key, aliases: new Map<string, number>(), sources: new Set<string>(), count: 0 };
    if (!hit) clusters.push(target);
    target.count += 1;
    target.aliases.set(raw, (target.aliases.get(raw) ?? 0) + 1);
    if (m.source) target.sources.add(m.source);
  }

  const total = clusters.reduce((a, c) => a + c.count, 0) || 1;
  return clusters
    .map((c) => {
      const sorted = [...c.aliases.entries()].sort((a, b) => b[1] - a[1]);
      return {
        canonical: sorted[0]?.[0] ?? c.key,
        aliases: sorted.map(([a]) => a),
        mentions: c.count,
        sources: [...c.sources],
        shareOfVoice: Number((c.count / total).toFixed(3)),
      };
    })
    .sort((a, b) => b.mentions - a.mentions);
}

// ---------------------------------------------------------------------------
// 7 — GAP ANALYSIS
//
// Compares what the market/competitors are covering against what the user is
// actually doing, and separately flags where the research itself is thin
// (topics with no measured backing). Both are reported as gaps in *observed
// coverage*, never as invented opportunities.
// ---------------------------------------------------------------------------

export interface CoverageGap {
  topic: string;
  marketMentions: number;
  yourMentions: number;
  gapScore: number;
  type: "uncovered" | "underweighted" | "overweighted" | "aligned";
}

export interface GapAnalysis {
  gaps: CoverageGap[];
  evidenceGaps: string[];
  comparedTopics: number;
  note: string;
}

export function analyzeGaps(
  marketTexts: string[],
  yourTexts: string[],
  opts: { minMarketCount?: number; limit?: number } = {},
): GapAnalysis {
  const minMarket = opts.minMarketCount ?? 2;
  const limit = opts.limit ?? 15;

  const tally = (texts: string[]) => {
    const m = new Map<string, number>();
    for (const t of texts || []) {
      for (const tok of new Set(tokenize(t))) m.set(tok, (m.get(tok) ?? 0) + 1);
    }
    return m;
  };

  const market = tally(marketTexts);
  const mine = tally(yourTexts);
  const marketTotal = [...market.values()].reduce((a, b) => a + b, 0) || 1;
  const mineTotal = [...mine.values()].reduce((a, b) => a + b, 0) || 1;

  const gaps: CoverageGap[] = [];
  for (const [topic, mc] of market) {
    if (mc < minMarket) continue;
    const yc = mine.get(topic) ?? 0;
    const marketShare = mc / marketTotal;
    const myShare = yc / mineTotal;
    const gapScore = Number((marketShare - myShare).toFixed(4));
    const type: CoverageGap["type"] =
      yc === 0 ? "uncovered"
      : gapScore > 0.005 ? "underweighted"
      : gapScore < -0.005 ? "overweighted"
      : "aligned";
    gaps.push({ topic, marketMentions: mc, yourMentions: yc, gapScore, type });
  }

  gaps.sort((a, b) => b.gapScore - a.gapScore);

  const evidenceGaps: string[] = [];
  if (!yourTexts?.length) {
    evidenceGaps.push("No first-party content on this account yet — every gap below is relative to market coverage only, not to measured performance.");
  }
  if (!marketTexts?.length) {
    evidenceGaps.push("No market/competitor observations were gathered — gap analysis could not run.");
  }

  return {
    gaps: gaps.slice(0, limit),
    evidenceGaps,
    comparedTopics: gaps.length,
    note: gaps.length
      ? `Compared ${gaps.length} observed topics between market coverage and your own content.`
      : "Not enough overlapping observations to compute coverage gaps.",
  };
}

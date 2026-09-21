import { describe, expect, it } from 'vitest';
import {
  analyzeGaps,
  crossSourceCorroboration,
  decayWeight,
  decayWeightedMean,
  detectChangePoint,
  detectEmergingTopics,
  linkClaimsToEvidence,
  normalizeEntity,
  resolveEntities,
  type ResearchClaim,
} from './research-algorithms';

describe('crossSourceCorroboration', () => {
  it('grades a claim A when two independent sources agree and one is first_party', () => {
    const claims: ResearchClaim[] = [
      { text: 'Reels outperform static posts by 2x', source: 'instagram.com', sourceType: 'first_party' },
      { text: 'Reels outperform static posts by 2x', source: 'competitor-blog.com', sourceType: 'real_api' },
    ];
    const [top] = crossSourceCorroboration(claims);
    expect(top.independentSources).toBe(2);
    expect(top.grade).toBe('A');
  });

  it('does not double-count repeated restatements from the same source root', () => {
    const claims: ResearchClaim[] = [
      { text: 'Video ads convert better', source: 'blog.acme.com', sourceType: 'ai_estimated' },
      { text: 'Video ads convert better', source: 'www.acme.com', sourceType: 'ai_estimated' },
    ];
    const [top] = crossSourceCorroboration(claims);
    expect(top.independentSources).toBe(1);
    expect(top.restatements).toBe(2);
    expect(top.grade).toBe('D');
  });

  it('keeps dissimilar claims in separate clusters', () => {
    const claims: ResearchClaim[] = [
      { text: 'Reels outperform static posts', source: 'a.com', sourceType: 'real_api' },
      { text: 'Email open rates are declining industry-wide', source: 'b.com', sourceType: 'real_api' },
    ];
    expect(crossSourceCorroboration(claims)).toHaveLength(2);
  });
});

describe('detectChangePoint', () => {
  it('reports not detected when there are too few observations', () => {
    const result = detectChangePoint([{ value: 1 }, { value: 2 }]);
    expect(result.detected).toBe(false);
    expect(result.observations).toBe(2);
  });

  it('detects a sustained dip that later recovers', () => {
    // 10 steady-high, 10 sharply-dipped, 5 recovered -- a real dip-and-recover
    // pattern, which is what this two-sided CUSUM is tuned to catch (a
    // permanent step with no recovery tends to peak the accumulator at the
    // very last observation, which the boundary check deliberately excludes).
    const series = [
      ...Array.from({ length: 10 }, (_, i) => ({ value: 100, at: `d${i}` })),
      ...Array.from({ length: 10 }, (_, i) => ({ value: 5, at: `d${10 + i}` })),
      ...Array.from({ length: 5 }, (_, i) => ({ value: 100, at: `d${20 + i}` })),
    ];
    const result = detectChangePoint(series);
    expect(result.detected).toBe(true);
    expect(result.index).toBeGreaterThan(0);
    expect(result.index).toBeLessThan(series.length - 1);
  });

  it('reports no change point for a flat, noisy series', () => {
    const series = Array.from({ length: 12 }, (_, i) => ({ value: 50 + (i % 2 === 0 ? 1 : -1) }));
    const result = detectChangePoint(series);
    expect(result.detected).toBe(false);
  });
});

describe('decayWeight', () => {
  it('returns a status of unknown weight when observedAt is missing', () => {
    const result = decayWeight(null, 'tiktok');
    expect(result.status).toBe('unknown');
    expect(result.weight).toBe(0.5);
  });

  it('returns fresh for a very recent observation', () => {
    const now = Date.parse('2026-01-10T00:00:00Z');
    const result = decayWeight('2026-01-09T00:00:00Z', 'tiktok', now);
    expect(result.status).toBe('fresh');
    expect(result.ageDays).toBe(1);
  });

  it('decays to exactly half weight at one half-life', () => {
    const now = Date.parse('2026-01-22T00:00:00Z');
    const result = decayWeight('2026-01-01T00:00:00Z', 'tiktok', now); // 21 days = tiktok half-life
    expect(result.weight).toBeCloseTo(0.5, 2);
  });

  it('falls back to the default half-life for an unknown platform', () => {
    const result = decayWeight('2026-01-01T00:00:00Z', 'unknown-platform', Date.parse('2026-01-01T00:00:00Z'));
    expect(result.halfLifeDays).toBe(30);
  });
});

describe('decayWeightedMean', () => {
  it('weights recent observations more heavily than old ones', () => {
    const now = Date.parse('2026-02-01T00:00:00Z');
    const series = [
      { value: 100, at: '2025-01-01T00:00:00Z' }, // very old, near-zero weight
      { value: 10, at: '2026-01-31T00:00:00Z' }, // fresh
    ];
    const result = decayWeightedMean(series, 'default', now);
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeLessThan(55);
  });

  it('returns null value when no observations are finite', () => {
    const result = decayWeightedMean([{ value: NaN }]);
    expect(result.value).toBeNull();
    expect(result.effectiveSampleSize).toBe(0);
  });
});

describe('detectEmergingTopics', () => {
  it('flags a brand-new term meeting minCount as emerging', () => {
    const recent = ['ugc creator ads', 'ugc creator ads', 'ugc creator ads'];
    const prior = ['static image ads', 'static image ads'];
    const topics = detectEmergingTopics(recent, prior);
    const ugc = topics.find((t) => t.term === 'ugc');
    expect(ugc).toBeDefined();
    expect(ugc!.isNew).toBe(true);
    expect(ugc!.status).toBe('emerging');
  });

  it('excludes terms below the minimum count', () => {
    const topics = detectEmergingTopics(['one mention only'], [], { minCount: 2 });
    expect(topics).toHaveLength(0);
  });

  it('marks a term declining when its share drops versus the prior window', () => {
    const recent = ['carousel', 'reels', 'reels', 'reels'];
    const prior = ['carousel', 'carousel', 'carousel', 'carousel'];
    const topics = detectEmergingTopics(recent, prior, { minCount: 1 });
    const carousel = topics.find((t) => t.term === 'carousel');
    expect(carousel?.status).toBe('declining');
  });
});

describe('linkClaimsToEvidence', () => {
  it('grades a claim as measured when backed by first-party evidence', () => {
    const evidence: ResearchClaim[] = [
      { text: 'Carousel posts get higher saves', source: 'instagram_api', sourceType: 'first_party' },
    ];
    const [linked] = linkClaimsToEvidence(['Carousel posts get higher saves'], evidence);
    expect(linked.basis).toBe('measured');
    expect(linked.grade).toBe('A');
  });

  it('marks a claim unsupported when no evidence is similar enough', () => {
    const evidence: ResearchClaim[] = [
      { text: 'Completely unrelated observation about email subject lines', source: 'a.com', sourceType: 'real_api' },
    ];
    const [linked] = linkClaimsToEvidence(['Video ads outperform images'], evidence);
    expect(linked.basis).toBe('unsupported');
    expect(linked.grade).toBe('D');
  });

  it('detects contradiction when polarity differs between claim and evidence', () => {
    const evidence: ResearchClaim[] = [
      { text: 'Engagement is no longer rising on Reels', source: 'a.com', sourceType: 'real_api' },
    ];
    const [linked] = linkClaimsToEvidence(['Engagement is rising on Reels'], evidence, 0.2);
    expect(linked.contradicting.length).toBeGreaterThan(0);
  });
});

describe('normalizeEntity', () => {
  it('strips protocol, www, and TLD from a URL', () => {
    expect(normalizeEntity('https://www.acme.com')).toBe('acme');
  });

  it('strips legal suffixes and punctuation', () => {
    expect(normalizeEntity('Acme, Inc.')).toBe('acme');
  });

  it('strips a leading @ from a handle', () => {
    expect(normalizeEntity('@Acme')).toBe('acme');
  });
});

describe('resolveEntities', () => {
  it('collapses different surface forms of the same competitor', () => {
    const resolved = resolveEntities([
      { name: 'Acme', source: 'x.com' },
      { name: 'Acme Inc.', source: 'instagram.com' },
      { name: '@acmehq', source: 'x.com' },
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].mentions).toBe(3);
  });

  it('keeps genuinely different entities separate', () => {
    const resolved = resolveEntities([
      { name: 'Acme' },
      { name: 'Globex' },
    ]);
    expect(resolved).toHaveLength(2);
  });
});

describe('analyzeGaps', () => {
  it('flags a topic the market covers but the account never mentions as uncovered', () => {
    const result = analyzeGaps(['sustainability messaging', 'sustainability messaging'], ['pricing promo']);
    const gap = result.gaps.find((g) => g.topic === 'sustainability');
    expect(gap?.type).toBe('uncovered');
  });

  it('adds an evidence gap note when the account has no content', () => {
    const result = analyzeGaps(['topic one', 'topic one'], []);
    expect(result.evidenceGaps.length).toBeGreaterThan(0);
  });

  it('reports no comparable topics when both inputs are empty', () => {
    const result = analyzeGaps([], []);
    expect(result.comparedTopics).toBe(0);
    expect(result.evidenceGaps.length).toBe(2);
  });
});

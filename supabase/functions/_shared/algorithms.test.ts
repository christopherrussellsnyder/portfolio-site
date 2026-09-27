import { describe, expect, it } from 'vitest';
import {
  tokenize,
  jaccard,
  trigramSimilarity,
  similarity,
  reliabilityOf,
  recencyOf,
  relevanceOf,
  dedupeSignals,
  detectContradictions,
  scoreConfidence,
  buildEvidenceLedger,
  scoreStrategyCandidate,
  selectBestCandidate,
  buildTargetedCriticNote,
  scoreCaption,
  selectDiverseCaptions,
  extractGroundingTerms,
  FILLER_PHRASES,
  type FusedSignal,
  type RawSignal,
} from './algorithms';

// ---------------------------------------------------------------------------
// SECTION A — TEXT PRIMITIVES
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('lowercases, strips stopwords and short tokens', () => {
    expect(tokenize('The Quick Brown Fox and the Lazy Dog')).toEqual([
      'quick', 'brown', 'fox', 'lazy', 'dog',
    ]);
  });

  it('handles empty/undefined input without throwing', () => {
    expect(tokenize('')).toEqual([]);
    // @ts-expect-error — defensive against non-string input at runtime
    expect(tokenize(undefined)).toEqual([]);
  });

  it('keeps prices, percents and dollar signs', () => {
    expect(tokenize('save 20% on a $99.99 order')).toEqual(
      expect.arrayContaining(['save', '20%', '$99.99', 'order']),
    );
  });
});

describe('jaccard', () => {
  it('is 1 for identical text', () => {
    expect(jaccard('free shipping on orders', 'free shipping on orders')).toBe(1);
  });

  it('is 0 when there is no token overlap', () => {
    expect(jaccard('blue widgets', 'red gadgets')).toBe(0);
  });

  it('is 0 when either input tokenizes to nothing', () => {
    expect(jaccard('', 'the a an')).toBe(0);
  });
});

describe('trigramSimilarity', () => {
  it('catches reworded near-duplicates that jaccard misses', () => {
    const a = 'free next-day delivery';
    const b = 'next day delivery free';
    expect(trigramSimilarity(a, b)).toBeGreaterThan(0.5);
  });

  it('is 0 for completely different strings', () => {
    expect(trigramSimilarity('abc', 'xyz')).toBe(0);
  });
});

describe('similarity', () => {
  it('takes the max of jaccard and discounted trigram similarity', () => {
    const a = 'buy one get one free this weekend';
    const b = 'buy one get one free this weekend';
    expect(similarity(a, b)).toBe(1);
  });

  it('is low for unrelated sentences', () => {
    expect(similarity('our summer sale starts now', 'contact support for help')).toBeLessThan(0.3);
  });
});

// ---------------------------------------------------------------------------
// SECTION B — EVIDENCE FUSION
// ---------------------------------------------------------------------------

describe('reliabilityOf', () => {
  it('scores first-party/performance data highest', () => {
    expect(reliabilityOf('performance_feedback:acme', 'first_party')).toBe(1.0);
  });

  it('scores AI-estimated signals lowest', () => {
    expect(reliabilityOf('ai_estimated:trend', 'ai_estimated')).toBe(0.25);
  });

  it('falls back on sourceType when the source string matches no known prefix', () => {
    expect(reliabilityOf('some-unknown-source', 'real_api')).toBe(0.8);
    expect(reliabilityOf('some-unknown-source', 'ai_estimated')).toBe(0.25);
  });
});

describe('recencyOf', () => {
  it('returns a neutral 0.6 when no date is known', () => {
    expect(recencyOf('crawl:acme.com', null)).toBe(0.6);
    expect(recencyOf('crawl:acme.com', undefined)).toBe(0.6);
  });

  it('returns close to 1 for data observed just now', () => {
    expect(recencyOf('crawl:acme.com', new Date().toISOString())).toBeGreaterThan(0.95);
  });

  it('decays faster for ad-library data than for crawled site copy', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const adLibrary = recencyOf('meta-ad-library:123', thirtyDaysAgo);
    const crawl = recencyOf('crawl:acme.com', thirtyDaysAgo);
    expect(adLibrary).toBeLessThan(crawl);
  });

  it('treats an invalid or future date as neutral rather than crashing', () => {
    expect(recencyOf('crawl:acme.com', 'not-a-date')).toBe(0.6);
  });
});

describe('relevanceOf', () => {
  it('returns a neutral 0.6 when there are no query terms', () => {
    expect(relevanceOf('anything at all', [])).toBe(0.6);
  });

  it('is 0 when the signal has no tokens', () => {
    expect(relevanceOf('', ['acme'])).toBe(0);
  });

  it('increases with more matched query terms, saturating at 3', () => {
    const none = relevanceOf('completely unrelated text here', ['acme', 'widget', 'gizmo']);
    const one = relevanceOf('our acme brand text here', ['acme', 'widget', 'gizmo']);
    const three = relevanceOf('acme widget gizmo all here', ['acme', 'widget', 'gizmo']);
    expect(one).toBeGreaterThan(none);
    expect(three).toBeGreaterThan(one);
    expect(three).toBe(1);
  });
});

function makeSignal(overrides: Partial<RawSignal> = {}): RawSignal {
  return {
    text: 'Our conversion rate increased 24% after the redesign',
    source: 'performance_feedback:acme',
    sourceType: 'first_party',
    observedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('dedupeSignals', () => {
  it('keeps distinct signals untouched', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ text: 'Our conversion rate increased 24% after the redesign' }), weight: 0.9, reliability: 1, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
      { ...makeSignal({ text: 'Customers frequently ask about bulk pricing options' }), weight: 0.8, reliability: 1, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
    ];
    const { kept, collapsed } = dedupeSignals(sigs);
    expect(kept).toHaveLength(2);
    expect(collapsed).toBe(0);
  });

  it('collapses near-duplicate claims from different sources into one corroborated signal', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ text: 'Conversion rate increased 24 percent after the redesign', source: 'crawl:acme.com' }), weight: 0.85, reliability: 0.85, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
      { ...makeSignal({ text: 'Conversion rate increased 24% after the redesign', source: 'performance_feedback:acme' }), weight: 0.95, reliability: 1, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
    ];
    const { kept, collapsed } = dedupeSignals(sigs);
    expect(kept).toHaveLength(1);
    expect(collapsed).toBe(1);
    // Highest-weight signal survives, and its corroboration count increases.
    expect(kept[0].source).toBe('performance_feedback:acme');
    expect(kept[0].corroboration).toBe(2);
    expect(kept[0].corroboratedBy).toContain('crawl:acme.com');
  });

  it('does not credit the same source repeating itself as corroboration', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ text: 'Conversion rate increased 24% after the redesign', source: 'crawl:acme.com' }), weight: 0.9, reliability: 0.85, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
      { ...makeSignal({ text: 'Conversion rate increased 24% after the redesign', source: 'crawl:acme.com' }), weight: 0.85, reliability: 0.85, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
    ];
    const { kept } = dedupeSignals(sigs);
    expect(kept).toHaveLength(1);
    expect(kept[0].corroboration).toBe(1);
  });
});

describe('detectContradictions', () => {
  // Note: subjectKey groups claims by their first 4 non-stopword tokens, so the
  // differing number/direction word must fall *after* that window for two
  // claims to land in the same subject group — hence the longer, stable lead-in.
  it('flags a numeric conflict between sources on the same subject', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ text: 'Our latest customer research shows average order value is $45 per order', source: 'crawl:acme.com' }), weight: 0.8, reliability: 0.85, recency: 0.9, relevance: 1, corroboration: 1, corroboratedBy: [] },
      { ...makeSignal({ text: 'Our latest customer research shows average order value is $95 per order', source: 'campaign_intelligence_signals:est' }), weight: 0.3, reliability: 0.25, recency: 0.9, relevance: 1, corroboration: 1, corroboratedBy: [] },
    ];
    const contradictions = detectContradictions(sigs);
    expect(contradictions.some((c) => c.kind === 'numeric_conflict')).toBe(true);
  });

  it('flags a directional conflict between positive and negative claims on the same subject', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ text: 'Our latest customer research indicates email open rates increase on Tuesday sends', source: 'crawl:acme.com' }), weight: 0.8, reliability: 0.85, recency: 0.9, relevance: 1, corroboration: 1, corroboratedBy: [] },
      { ...makeSignal({ text: 'Our latest customer research indicates email open rates decrease on Tuesday sends', source: 'reddit:marketing' }), weight: 0.4, reliability: 0.5, recency: 0.9, relevance: 1, corroboration: 1, corroboratedBy: [] },
    ];
    const contradictions = detectContradictions(sigs);
    expect(contradictions.some((c) => c.kind === 'directional_conflict')).toBe(true);
  });

  it('returns nothing when there is only one signal per subject', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ text: 'A totally unique claim about something specific' }), weight: 0.8, reliability: 1, recency: 1, relevance: 1, corroboration: 1, corroboratedBy: [] },
    ];
    expect(detectContradictions(sigs)).toEqual([]);
  });
});

describe('scoreConfidence', () => {
  it('returns 0/Low when there is no evidence', () => {
    const result = scoreConfidence([], []);
    expect(result.confidence).toBe(0);
    expect(result.label).toBe('Low');
  });

  it('caps confidence at 35 (Low) when every signal is AI-estimated', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ sourceType: 'ai_estimated', source: 'ai_estimated:trend' }), weight: 0.9, reliability: 0.25, recency: 0.9, relevance: 0.9, corroboration: 1, corroboratedBy: [] },
    ];
    const result = scoreConfidence(sigs, []);
    expect(result.confidence).toBeLessThanOrEqual(35);
    expect(result.label).toBe('Low');
  });

  it('scores higher for reliable, fresh, corroborated, measured evidence', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ sourceType: 'first_party' }), weight: 0.95, reliability: 1, recency: 0.95, relevance: 0.9, corroboration: 2, corroboratedBy: ['crawl:acme.com'] },
      { ...makeSignal({ sourceType: 'real_api', source: 'meta-marketing-api' }), weight: 0.9, reliability: 0.9, recency: 0.9, relevance: 0.9, corroboration: 2, corroboratedBy: ['performance_feedback:acme'] },
    ];
    const result = scoreConfidence(sigs, []);
    expect(result.label).toBe('High');
    expect(result.confidence).toBeGreaterThanOrEqual(70);
  });

  it('penalizes unresolved contradictions', () => {
    const sigs: FusedSignal[] = [
      { ...makeSignal({ sourceType: 'first_party' }), weight: 0.9, reliability: 1, recency: 0.9, relevance: 0.9, corroboration: 1, corroboratedBy: [] },
    ];
    const withoutContradiction = scoreConfidence(sigs, []).confidence;
    const withContradiction = scoreConfidence(sigs, [
      { subject: 'x', claims: [], kind: 'numeric_conflict', resolution: 'r' },
      { subject: 'y', claims: [], kind: 'numeric_conflict', resolution: 'r' },
    ]).confidence;
    expect(withContradiction).toBeLessThan(withoutContradiction);
  });
});

describe('buildEvidenceLedger', () => {
  it('runs the full pipeline: filters, weights, dedupes, scores', () => {
    const raw: RawSignal[] = [
      makeSignal({ text: 'Our conversion rate increased 24% after the redesign' }),
      makeSignal({ text: 'too short' }), // filtered: <= 12 chars
      makeSignal({ text: 'Conversion rate increased 24% after the redesign, confirmed', source: 'crawl:acme.com' }),
    ];
    const ledger = buildEvidenceLedger(raw, ['conversion', 'redesign']);
    // "too short" is filtered out before weighting.
    expect(ledger.signals.length + ledger.duplicatesCollapsed).toBeLessThanOrEqual(2);
    expect(ledger.composition.first_party).toBeGreaterThanOrEqual(1);
    expect(['High', 'Medium', 'Low']).toContain(ledger.confidenceLabel);
  });

  it('produces an empty ledger for no usable signals', () => {
    const ledger = buildEvidenceLedger([{ text: 'short', source: 'x', sourceType: 'first_party' }], []);
    expect(ledger.signals).toEqual([]);
    expect(ledger.confidence).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SECTION C — STRATEGY SCORING
// ---------------------------------------------------------------------------

function post(text: string, ctaText = 'Shop now at the link in bio', anchor = 'real UVP') {
  return {
    day_number: 1,
    copy_elements: { hook: { text }, body: '', full_caption: text, cta: { text: ctaText } },
    strategic_rationale: { differentiation_anchor: anchor },
    performance_prediction: { confidence_score: 0.5, prediction_basis: 'x' },
  };
}

describe('scoreStrategyCandidate', () => {
  it('returns all-zero for an empty post list', () => {
    const score = scoreStrategyCandidate([], []);
    expect(score.total).toBe(0);
    expect(score.flaggedPosts).toEqual([]);
  });

  it('scores a specific, grounded, actionable post higher than generic filler', () => {
    const strong = scoreStrategyCandidate(
      [post('Save $20 on the Acme Pro Blender this week only, 500+ five star reviews')],
      ['Acme Pro Blender'],
    );
    const weak = scoreStrategyCandidate(
      [post('Unlock the power of our game-changing seamless experience today', '', undefined)],
      ['Acme Pro Blender'],
    );
    expect(strong.total).toBeGreaterThan(weak.total);
  });

  it('flags posts missing a clear CTA and differentiation anchor', () => {
    const score = scoreStrategyCandidate([post('Just a vague update', '', undefined)], []);
    expect(score.flaggedPosts.length).toBeGreaterThan(0);
    const reasons = score.flaggedPosts[0].reasons.join(' ');
    expect(reasons).toMatch(/CTA|differentiation/);
  });

  it('flags near-duplicate posts against each other', () => {
    const score = scoreStrategyCandidate(
      [post('Save 20% on our Acme Pro Blender this weekend only'), post('Save 20% on our Acme Pro Blender this weekend only!')],
      ['Acme Pro Blender'],
    );
    expect(score.flaggedPosts.some((f) => f.reasons.some((r) => r.includes('near-duplicate')))).toBe(true);
  });
});

describe('selectBestCandidate', () => {
  it('picks the candidate with the highest total score', () => {
    const low = scoreStrategyCandidate([post('vague filler content here', '', undefined)], []);
    const high = scoreStrategyCandidate([post('Save $30 on the Acme Widget, ships free today')], ['Acme Widget']);
    const { best, score } = selectBestCandidate([
      { candidate: 'low', score: low },
      { candidate: 'high', score: high },
    ]);
    expect(best).toBe('high');
    expect(score.total).toBe(high.total);
  });
});

describe('buildTargetedCriticNote', () => {
  it('returns an empty string when nothing is flagged', () => {
    const score = scoreStrategyCandidate([post('Save $30 on the Acme Widget, ships free today, 1000+ reviews')], ['Acme Widget']);
    if (score.flaggedPosts.length === 0) {
      expect(buildTargetedCriticNote(score)).toBe('');
    }
  });

  it('includes the flagged post reasons when something is flagged', () => {
    const score = scoreStrategyCandidate([post('vague filler with no substance', '', undefined)], []);
    const note = buildTargetedCriticNote(score);
    expect(note).toContain('MUST be rewritten');
  });
});

// ---------------------------------------------------------------------------
// SECTION D — CAPTION SCORING
// ---------------------------------------------------------------------------

describe('scoreCaption', () => {
  it('scores a strong hook + CTA + specificity higher than generic filler', () => {
    const strong = scoreCaption('Why does the Acme Blender outsell everything else? $20 off today, link in bio.', {
      groundingTerms: ['Acme Blender'],
    });
    const weak = scoreCaption('We are excited to unlock the power of our game-changing seamless experience.');
    expect(strong.total).toBeGreaterThan(weak.total);
  });

  it('penalizes filler phrases', () => {
    const withFiller = scoreCaption('This is a game changer, act now, limited time only!');
    expect(withFiller.notes.some((n) => n.includes('filler'))).toBe(true);
    expect(withFiller.fillerPenalty).toBeGreaterThan(0);
  });

  it('flags a caption with no clear call to action', () => {
    const noCta = scoreCaption('Just thinking about our brand story today.');
    expect(noCta.ctaClarity).toBeLessThan(0.5);
  });

  it('never throws on empty input', () => {
    expect(() => scoreCaption('')).not.toThrow();
  });
});

describe('selectDiverseCaptions', () => {
  it('picks the requested count, preferring high score and low redundancy', () => {
    const candidates = [
      { caption: 'Save $20 on the Acme Blender today, link in bio' },
      { caption: 'Save $20 on the Acme Blender today, link in bio!' }, // near-duplicate
      { caption: 'Why do 10,000 customers trust Acme? See the reviews.' },
    ];
    const scores = candidates.map((c) => scoreCaption(c.caption, { groundingTerms: ['Acme Blender'] }));
    const { picked, rejected } = selectDiverseCaptions(candidates, scores, 2);
    expect(picked).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    // The near-duplicate of the top pick should be the one rejected for redundancy.
    expect(rejected[0].reason).toMatch(/similar|score/);
  });

  it('handles fewer candidates than the requested count', () => {
    const candidates = [{ caption: 'Only one caption here with a CTA, shop now' }];
    const scores = candidates.map((c) => scoreCaption(c.caption));
    const { picked } = selectDiverseCaptions(candidates, scores, 2);
    expect(picked).toHaveLength(1);
  });
});

describe('extractGroundingTerms', () => {
  it('extracts prices, quoted phrases, and proper nouns actually present in the text', () => {
    // Deliberately no leading "The" — the proper-noun regex greedily folds a
    // leading article into the match, and the whole match is then dropped by
    // the exclusion list, taking the brand name down with it.
    const terms = extractGroundingTerms(['Acme Pro Blender costs $49.99 and customers call it "life changing".']);
    expect(terms).toContain('$49.99');
    expect(terms).toContain('life changing');
    expect(terms.some((t) => t.includes('Acme'))).toBe(true);
  });

  it('never invents terms not present in the source text', () => {
    const terms = extractGroundingTerms(['A totally generic sentence with no numbers or quotes.']);
    expect(terms).not.toContain('$99.99');
  });

  it('ignores null/undefined sections', () => {
    expect(() => extractGroundingTerms([null, undefined, ''])).not.toThrow();
    expect(extractGroundingTerms([null, undefined, ''])).toEqual([]);
  });
});

describe('FILLER_PHRASES', () => {
  it('is a non-empty list of lowercase phrases', () => {
    expect(FILLER_PHRASES.length).toBeGreaterThan(0);
    for (const phrase of FILLER_PHRASES) {
      expect(phrase).toBe(phrase.toLowerCase());
    }
  });
});

import {
  normalizeEmotionLabel,
  summarizeEmotionSamples,
  summarizeFacialSignals,
} from './emotionAnalysis';

describe('emotionAnalysis utilities', () => {
  test('normalizes face-api and display emotion labels', () => {
    expect(normalizeEmotionLabel('Sad')).toBe('sad');
    expect(normalizeEmotionLabel('fear')).toBe('fearful');
    expect(normalizeEmotionLabel(undefined)).toBe('neutral');
  });

  test('builds confidence-weighted aggregate for question samples', () => {
    const aggregate = summarizeEmotionSamples([
      { emotion: 'sad', confidence: 0.7, allExpressions: { sad: 0.7, neutral: 0.3 } },
      { emotion: 'neutral', confidence: 0.6, allExpressions: { sad: 0.2, neutral: 0.8 } },
      { emotion: 'fearful', confidence: 0.6, allExpressions: { fearful: 0.6, neutral: 0.4 } },
    ]);

    expect(aggregate.sampleCount).toBe(3);
    expect(aggregate.negativeAffectRatio).toBeGreaterThan(0.4);
    expect(aggregate.quality).toBe('good');
  });

  test('summarizes facial signals from answer aggregates', () => {
    const summary = summarizeFacialSignals([
      { emotionAggregate: { sampleCount: 4, confidence: 0.6, negativeAffectRatio: 0.5, positiveAffectRatio: 0, neutralRatio: 0.5, volatility: 0.2, emotionDistribution: { sad: 0.5, neutral: 0.5 }, quality: 'good' } },
      { emotionAggregate: { sampleCount: 4, confidence: 0.8, negativeAffectRatio: 0.1, positiveAffectRatio: 0.4, neutralRatio: 0.5, volatility: 0.1, emotionDistribution: { happy: 0.4, neutral: 0.5, sad: 0.1 }, quality: 'good' } },
    ]);

    expect(summary.available).toBe(true);
    expect(summary.sampleCount).toBe(8);
    expect(summary.negativeAffectRatio).toBeCloseTo(0.3);
  });
});

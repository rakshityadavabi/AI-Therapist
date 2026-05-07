import { computeSentiment } from './speechAnalysis';

describe('computeSentiment', () => {
  test('treats negated distress phrases as reassuring', () => {
    const result = computeSentiment('I am not anxious anymore and I have no problems sleeping.');

    expect(result.label).toBe('Positive');
    expect(result.score).toBeGreaterThan(0);
    expect(result.protectiveSignals.join(' ')).toMatch(/not anxious|no problems|negated distress/);
  });

  test('uses contrast context instead of isolated word counts', () => {
    const result = computeSentiment('Work was stressful, but I am feeling better and coping well now.');

    expect(result.score).toBeGreaterThan(0);
    expect(result.label).toBe('Positive');
  });

  test('keeps mixed language mixed when both signals are meaningful', () => {
    const result = computeSentiment('I feel supported, but I am still sad and tired.');

    expect(['Mixed', 'Negative']).toContain(result.label);
    expect(result.distressSignals.length).toBeGreaterThan(0);
    expect(result.protectiveSignals.length).toBeGreaterThan(0);
  });
});

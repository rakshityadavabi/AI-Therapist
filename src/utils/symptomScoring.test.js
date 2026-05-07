import { computeIntegratedRisk, inferDSMScore } from './symptomScoring';

describe('inferDSMScore', () => {
  test('does not boost positive mood because everything contains very', () => {
    const result = inferDSMScore(
      'mood',
      'I do not feel anxious or problem in a bad mood I just feel normal happy good about everything'
    );

    expect(result.score).toBe(0);
    expect(result.label).toBe('None');
  });

  test('still boosts real symptom statements with standalone severity adverbs', () => {
    const result = inferDSMScore('mood', 'I feel very sad and hopeless most days');

    expect(result.score).toBeGreaterThanOrEqual(3);
  });
});

describe('computeIntegratedRisk', () => {
  test('does not treat adequate support as a risk-increasing Yes answer', () => {
    const baseAnswers = [
      { questionId: 1, answer: 'No' },
      { questionId: 2, answer: 'No' },
      { questionId: 16, answer: 'Yes' },
    ];

    const unsupportedAnswers = [
      { questionId: 1, answer: 'No' },
      { questionId: 2, answer: 'No' },
      { questionId: 16, answer: 'No' },
    ];

    const supported = computeIntegratedRisk({ answers: baseAnswers });
    const unsupported = computeIntegratedRisk({ answers: unsupportedAnswers });

    expect(supported.score).toBeLessThan(unsupported.score);
  });

  test('uses facial aggregate when available', () => {
    const risk = computeIntegratedRisk({
      answers: [
        {
          questionId: 1,
          answer: 'No',
          emotionAggregate: {
            sampleCount: 6,
            confidence: 0.7,
            negativeAffectRatio: 0.8,
            positiveAffectRatio: 0,
            neutralRatio: 0.2,
            volatility: 0.1,
            emotionDistribution: { sad: 0.8, neutral: 0.2 },
            quality: 'good',
          },
        },
      ],
    });

    expect(risk.rationale.join(' ')).toMatch(/Facial affect/);
    expect(risk.score).toBeGreaterThan(0);
  });
});

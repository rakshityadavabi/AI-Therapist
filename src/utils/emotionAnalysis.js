const NEGATIVE_EMOTIONS = new Set(['sad', 'angry', 'fearful', 'disgusted']);
const POSITIVE_EMOTIONS = new Set(['happy']);
const KNOWN_EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

export function normalizeEmotionLabel(emotion) {
  if (!emotion || typeof emotion !== 'string') return 'neutral';
  const normalized = emotion.trim().toLowerCase();

  const aliases = {
    fear: 'fearful',
    scared: 'fearful',
    surprise: 'surprised',
    disgust: 'disgusted',
    sadness: 'sad',
    anger: 'angry',
  };

  return aliases[normalized] || (KNOWN_EMOTIONS.includes(normalized) ? normalized : normalized);
}

export function toDisplayEmotion(emotion) {
  const normalized = normalizeEmotionLabel(emotion);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function normalizeExpressionMap(expressions = {}) {
  return Object.entries(expressions || {}).reduce((acc, [emotion, value]) => {
    const key = normalizeEmotionLabel(emotion);
    const score = Number.isFinite(value) ? value : 0;
    acc[key] = (acc[key] || 0) + score;
    return acc;
  }, {});
}

export function summarizeEmotionSamples(samples = []) {
  const validSamples = (samples || []).filter(Boolean);
  const sampleCount = validSamples.length;

  if (sampleCount === 0) {
    return {
      sampleCount: 0,
      dominantEmotion: 'neutral',
      confidence: 0,
      emotionDistribution: {},
      negativeAffectRatio: 0,
      positiveAffectRatio: 0,
      neutralRatio: 0,
      volatility: 0,
      lowConfidenceRatio: 0,
      quality: 'insufficient',
    };
  }

  const distribution = {};
  let lowConfidenceCount = 0;
  let dominantChanges = 0;
  let previousDominant = null;

  validSamples.forEach(sample => {
    const expressions = normalizeExpressionMap(sample.allExpressions);

    if (Object.keys(expressions).length > 0) {
      Object.entries(expressions).forEach(([emotion, value]) => {
        distribution[emotion] = (distribution[emotion] || 0) + value;
      });
    } else {
      const emotion = normalizeEmotionLabel(sample.emotion || sample.predominantEmotion);
      distribution[emotion] = (distribution[emotion] || 0) + (sample.confidence ?? 1);
    }

    const currentDominant = normalizeEmotionLabel(sample.emotion || sample.predominantEmotion);
    if (previousDominant && currentDominant !== previousDominant) {
      dominantChanges += 1;
    }
    previousDominant = currentDominant;

    if ((sample.confidence ?? 0) < 0.35) {
      lowConfidenceCount += 1;
    }
  });

  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0) || 1;
  const averagedDistribution = Object.entries(distribution).reduce((acc, [emotion, value]) => {
    acc[emotion] = Number((value / total).toFixed(3));
    return acc;
  }, {});

  const dominantEmotion = Object.entries(averagedDistribution).reduce(
    (best, entry) => (entry[1] > best[1] ? entry : best),
    ['neutral', 0]
  )[0];

  const negativeAffectRatio = Object.entries(averagedDistribution)
    .filter(([emotion]) => NEGATIVE_EMOTIONS.has(emotion))
    .reduce((sum, [, value]) => sum + value, 0);

  const positiveAffectRatio = Object.entries(averagedDistribution)
    .filter(([emotion]) => POSITIVE_EMOTIONS.has(emotion))
    .reduce((sum, [, value]) => sum + value, 0);

  const confidence = averagedDistribution[dominantEmotion] || 0;
  const volatility = sampleCount > 1 ? dominantChanges / (sampleCount - 1) : 0;
  const lowConfidenceRatio = lowConfidenceCount / sampleCount;

  let quality = 'good';
  if (sampleCount < 3) quality = 'limited';
  if (lowConfidenceRatio > 0.5) quality = 'low_confidence';

  return {
    sampleCount,
    dominantEmotion,
    confidence: Number(confidence.toFixed(3)),
    emotionDistribution: averagedDistribution,
    negativeAffectRatio: Number(negativeAffectRatio.toFixed(3)),
    positiveAffectRatio: Number(positiveAffectRatio.toFixed(3)),
    neutralRatio: Number((averagedDistribution.neutral || 0).toFixed(3)),
    volatility: Number(volatility.toFixed(3)),
    lowConfidenceRatio: Number(lowConfidenceRatio.toFixed(3)),
    quality,
  };
}

export function summarizeFacialSignals(answers = [], photoAnalysisResults = []) {
  const answerAggregates = (answers || [])
    .map(answer => answer.emotionAggregate)
    .filter(aggregate => aggregate && aggregate.sampleCount > 0);

  const photoAggregates = (photoAnalysisResults || [])
    .map(photo => photo.emotionAggregate)
    .filter(aggregate => aggregate && aggregate.sampleCount > 0);

  const allAggregates = answerAggregates.length > 0 ? answerAggregates : photoAggregates;

  if (allAggregates.length === 0) {
    return {
      available: false,
      questionCount: 0,
      sampleCount: 0,
      dominantEmotion: 'neutral',
      negativeAffectRatio: 0,
      positiveAffectRatio: 0,
      neutralRatio: 0,
      volatility: 0,
      averageConfidence: 0,
      quality: 'insufficient',
    };
  }

  const totals = allAggregates.reduce((acc, aggregate) => {
    acc.sampleCount += aggregate.sampleCount || 0;
    acc.negativeAffectRatio += aggregate.negativeAffectRatio || 0;
    acc.positiveAffectRatio += aggregate.positiveAffectRatio || 0;
    acc.neutralRatio += aggregate.neutralRatio || 0;
    acc.volatility += aggregate.volatility || 0;
    acc.averageConfidence += aggregate.confidence || 0;

    Object.entries(aggregate.emotionDistribution || {}).forEach(([emotion, value]) => {
      acc.distribution[emotion] = (acc.distribution[emotion] || 0) + value;
    });

    return acc;
  }, {
    sampleCount: 0,
    negativeAffectRatio: 0,
    positiveAffectRatio: 0,
    neutralRatio: 0,
    volatility: 0,
    averageConfidence: 0,
    distribution: {},
  });

  const count = allAggregates.length || 1;
  const dominantEmotion = Object.entries(totals.distribution).reduce(
    (best, entry) => (entry[1] > best[1] ? entry : best),
    ['neutral', 0]
  )[0];

  const lowQualityCount = allAggregates.filter(a => ['limited', 'low_confidence', 'insufficient'].includes(a.quality)).length;
  const quality = lowQualityCount / count > 0.5 ? 'limited' : 'good';

  return {
    available: true,
    questionCount: allAggregates.length,
    sampleCount: totals.sampleCount,
    dominantEmotion,
    negativeAffectRatio: Number((totals.negativeAffectRatio / count).toFixed(3)),
    positiveAffectRatio: Number((totals.positiveAffectRatio / count).toFixed(3)),
    neutralRatio: Number((totals.neutralRatio / count).toFixed(3)),
    volatility: Number((totals.volatility / count).toFixed(3)),
    averageConfidence: Number((totals.averageConfidence / count).toFixed(3)),
    quality,
  };
}

export function isNegativeEmotion(emotion) {
  return NEGATIVE_EMOTIONS.has(normalizeEmotionLabel(emotion));
}

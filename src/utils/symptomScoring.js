import { isNegativeEmotion, summarizeFacialSignals } from './emotionAnalysis';

/**
 * symptomScoring.js
 *
 * Client-side NLP-based severity scoring for structured voice symptom responses.
 * Maps user speech to the DSM-5 0-4 severity scale:
 *   0 = None   1 = Slight   2 = Mild   3 = Moderate   4 = Severe
 *
 * All processing is fully local — no network calls.
 */

// ─── Domain definitions ──────────────────────────────────────────────────────

export const SYMPTOM_QUESTIONS = [
  {
    id: 'sleep',
    domain: 'sleep',
    label: 'Sleep',
    icon: '🌙',
    prompt: 'How has your sleep been lately? Please describe any difficulties falling asleep, staying asleep, or sleeping too much.',
    hint: `For example: "I've been waking up at 3 am every night" or "I sleep fine."`,
  },
  {
    id: 'interest',
    domain: 'interest',
    label: 'Interest & Motivation',
    icon: '🎯',
    prompt: 'How interested or motivated have you been in doing things you normally enjoy? Have you noticed a loss of pleasure or enthusiasm?',
    hint: `For example: "I can't bring myself to do anything" or "I still enjoy my hobbies."`,
  },
  {
    id: 'mood',
    domain: 'mood',
    label: 'Mood',
    icon: '🧠',
    prompt: 'How would you describe your overall mood? Have you been feeling down, depressed, or hopeless?',
    hint: 'For example: "I feel hopeless most days" or "My mood has been okay."',
  },
  {
    id: 'anxiety',
    domain: 'anxiety',
    label: 'Anxiety',
    icon: '💭',
    prompt: 'Have you been feeling anxious, worried, or on edge? Is it hard to control your worrying?',
    hint: 'For example: "I worry about everything all the time" or "I feel pretty calm."',
  },
  {
    id: 'safety',
    domain: 'safety',
    label: 'Safety & Self-Harm',
    icon: '🛡️',
    prompt: 'Have you had any thoughts of hurting yourself, harming others, or feeling like you would be better off not being here?',
    hint: 'You can speak freely — this is a safe space and all data stays on your device.',
  },
];

// ─── Keyword banks ────────────────────────────────────────────────────────────

const NEGATORS = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'barely', 'hardly', 'scarcely',
  'rarely', 'seldom', 'nothing', 'nobody', 'none', 'nowhere', 'without',
  "don't", "didn't", "doesn't", "isn't", "aren't", "wasn't", "weren't",
  "won't", "wouldn't", "can't", "couldn't", "shouldn't", "haven't",
  "hasn't", "hadn't", "mustn't",
]);

const SEVERITY_ADVERBS = {
  none: ['totally', 'completely', 'absolutely', 'perfectly'],
  slight: ['little', 'slightly', 'sometimes', 'occasionally', 'mildly', 'a bit', 'a little', 'minor'],
  mild: ['somewhat', 'fairly', 'moderately', 'a few', 'some', 'often sometimes', 'regularly sometimes'],
  moderate: ['quite', 'quite a bit', 'often', 'frequently', 'significant', 'more than usual', 'mostly'],
  severe: ['very', 'extremely', 'severely', 'intensely', 'all the time', 'constantly', 'every day', 'always', 'unbearably', 'completely'],
};

// Per-domain keyword banks organised by severity level
const DOMAIN_KEYWORDS = {
  sleep: {
    0: ['sleep fine', 'sleep well', 'sleeping well', 'no problem sleeping', 'sleep great', 'good sleep', 'rested', 'no trouble sleeping', 'sleep normally'],
    1: ['little trouble', 'slightly tired', 'occasionally wake', 'sometimes hard to sleep', 'wake up sometimes', 'minor sleep issue'],
    2: ['trouble sleeping', 'hard to sleep', 'wake up', 'waking up', 'difficulty sleeping', 'tired', 'fatigued', 'poor sleep', 'restless', 'not sleeping well', 'insomnia', 'can\'t sleep sometimes'],
    3: ['can\'t sleep', 'barely sleep', 'sleeping too much', 'hypersomnia', 'exhausted', 'severe insomnia', 'wake up multiple times', 'hardly sleep', 'sleep deprived'],
    4: ['no sleep', 'not sleeping at all', 'awake all night', 'completely exhausted', 'sleep for hours and hours', 'sleeping all day', 'never sleep'],
  },
  interest: {
    0: ['interested', 'enjoying', 'motivated', 'engaged', 'enthusiastic', 'love doing', 'still enjoy', 'having fun', 'look forward'],
    1: ['little less interested', 'slightly less motivated', 'not as excited', 'mildly bored', 'sometimes less interested'],
    2: ['lost some interest', 'not as motivated', 'less enjoyment', 'don\'t enjoy as much', 'boring', 'not motivated', 'less engaged'],
    3: ['lost interest', 'no motivation', 'don\'t enjoy', 'nothing feels good', 'can\'t be bothered', 'stopped doing', 'given up', 'pointless'],
    4: ['completely lost interest', 'nothing matters', 'can\'t do anything', 'no enjoyment whatsoever', 'everything is pointless', 'don\'t care about anything'],
  },
  mood: {
    0: ['good mood', 'happy', 'fine', 'okay', 'feeling well', 'content', 'positive', 'upbeat', 'cheerful', 'great'],
    1: ['little down', 'slightly sad', 'not perfect', 'bit low', 'off day', 'occasional sadness'],
    2: ['sad', 'down', 'depressed', 'low mood', 'not great', 'unhappy', 'feeling bad', 'blue', 'melancholy', 'gloomy'],
    3: ['very sad', 'very depressed', 'hopeless', 'miserable', 'really down', 'dark', 'can\'t see any good', 'nothing to look forward to'],
    4: ['extremely depressed', 'completely hopeless', 'suicidal thoughts', 'want to die', 'life is worthless', 'no point in living', 'deeply depressed'],
  },
  anxiety: {
    0: ['calm', 'relaxed', 'not anxious', 'no anxiety', 'fine', 'at ease', 'peaceful', 'no worries', 'not worried'],
    1: ['little anxious', 'slightly worried', 'occasional worry', 'minor stress', 'sometimes nervous'],
    2: ['anxious', 'worried', 'nervous', 'stressed', 'on edge', 'panic sometimes', 'worry a lot', 'tense', 'uneasy'],
    3: ['very anxious', 'very worried', 'constant worry', 'panic attacks', 'can\'t stop worrying', 'always stressed', 'overwhelming anxiety'],
    4: ['severe anxiety', 'extreme panic', 'can\'t function', 'paralyzing anxiety', 'panic every day', 'debilitating anxiety', 'constant panic attacks'],
  },
  safety: {
    // Safety scoring follows different logic — handled separately
    0: ['fine', 'safe', 'no thoughts', 'not thinking about', 'would never', 'okay'],
    1: ['passing thought', 'fleeting thought', 'briefly wondered', 'crossed my mind', 'not serious'],
    2: ['sometimes think about it', 'thought about hurting', 'thought about harm', 'had thoughts'],
    3: ['often think about it', 'seriously thought', 'plan to hurt', 'considered it', 'contemplating'],
    4: ['definitely want to hurt myself', 'plan to kill', 'decided to', 'will hurt myself'],
  },
};

// Self-harm / self-ideation keywords that trigger safety override
const SELF_HARM_KEYWORDS = [
  'kill myself', 'end my life', 'want to die', 'suicide', 'suicidal',
  'self harm', 'self-harm', 'hurt myself', 'harm myself', 'cut myself',
  'not want to be here', 'don\'t want to be here', 'better off dead',
  'better off without me', 'end it all', 'take my own life', 'overdose',
  'jump off', 'no reason to live', 'rather be dead', 'wish i was dead',
  'life isn\'t worth', 'life is not worth', 'don\'t want to live',
  'don\'t see the point', 'no point living', 'thinking about ending',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(text) {
  return (text || '').toLowerCase().replace(/['']/g, "'");
}

function tokenize(text) {
  return normalize(text).match(/[a-z']+/g) || [];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text, phrase) {
  const normalizedPhrase = normalize(phrase).trim();
  if (!normalizedPhrase) return false;
  const pattern = new RegExp(`(^|[^a-z'])${escapeRegExp(normalizedPhrase)}([^a-z']|$)`, 'i');
  return pattern.test(text);
}

/**
 * Check whether the word at `index` in `tokens` is preceded by a negator
 * within a 3-token window.
 */
function isNegated(tokens, index) {
  for (let i = Math.max(0, index - 3); i < index; i++) {
    if (NEGATORS.has(tokens[i])) return true;
  }
  return false;
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

/**
 * Detect self-harm / suicidal ideation in a transcript.
 * Returns { detected: boolean, matchedKeywords: string[] }
 */
export function detectSelfHarmIdeation(transcript) {
  const text = normalize(transcript);
  const matched = SELF_HARM_KEYWORDS.filter(kw => text.includes(kw));
  return {
    detected: matched.length > 0,
    matchedKeywords: matched,
  };
}

/**
 * Infer a DSM-5 severity score (0–4) from a spoken transcript for a given domain.
 *
 * Strategy:
 *  1. Check each severity level's keyword bank against the normalised text.
 *  2. Handle negation — a negated positive shifts down; a negated negative shifts up.
 *  3. Detect severity adverbs to amplify the inferred score.
 *  4. Resolve ties and clamp to [0, 4].
 *
 * Returns { score, label, confidence, reasoning, matchDetails }
 */
export function inferDSMScore(domain, transcript) {
  const text = normalize(transcript);
  const tokens = tokenize(transcript);

  if (!text.trim() || text.length < 5) {
    return {
      score: 0,
      label: 'None',
      confidence: 0,
      reasoning: 'No speech detected — defaulting to None.',
      matchDetails: [],
    };
  }

  const kwBank = DOMAIN_KEYWORDS[domain] || DOMAIN_KEYWORDS.mood;
  const levelScores = [0, 0, 0, 0, 0]; // accumulator for levels 0-4
  const matchDetails = [];

  // Score each level
  [0, 1, 2, 3, 4].forEach(level => {
    const phrases = kwBank[level] || [];
    phrases.forEach(phrase => {
      if (containsPhrase(text, phrase)) {
        // Check negation by looking at tokens around the phrase start
        const phraseStart = text.indexOf(phrase);
        const approxTokenIndex = tokens.findIndex((_, idx) => {
          return tokens.slice(0, idx + 1).join(' ').length >= phraseStart;
        });
        const negated = isNegated(tokens, approxTokenIndex);

        if (negated) {
          // Negated phrase: flip polarity
          const flippedLevel = level <= 2 ? Math.min(level + 2, 4) : Math.max(level - 2, 0);
          levelScores[flippedLevel] += 1;
          matchDetails.push({ phrase, level, negated: true, effective: flippedLevel });
        } else {
          levelScores[level] += 2; // stronger weight for direct match
          matchDetails.push({ phrase, level, negated: false, effective: level });
        }
      }
    });
  });

  // Severity adverb amplification
  let adverbBoost = 0;
  Object.entries(SEVERITY_ADVERBS).forEach(([severity, adverbs]) => {
    adverbs.forEach(adv => {
      if (containsPhrase(text, adv)) {
        const boostMap = { none: -1, slight: 0, mild: 0, moderate: 1, severe: 2 };
        adverbBoost = Math.max(adverbBoost, boostMap[severity] || 0);
      }
    });
  });

  // Find the level with the most weight
  const maxScore = Math.max(...levelScores);

  let inferredLevel;
  if (maxScore === 0) {
    // No keywords matched — use neutral default
    inferredLevel = 0;
  } else {
    // Pick the highest-matched severity level
    inferredLevel = levelScores.lastIndexOf(maxScore);
  }

  // Apply adverb boost only to actual symptom levels. Positive/no-symptom
  // matches such as "happy" or "sleep fine" must never become symptoms
  // because of an unrelated word like "everything" containing "very".
  if (inferredLevel > 0) {
    inferredLevel = Math.min(4, Math.max(0, inferredLevel + adverbBoost));
  }

  const LABELS = ['None', 'Slight', 'Mild', 'Moderate', 'Severe'];
  const confidence = maxScore > 0 ? Math.min(1, maxScore / 6) : 0.1;

  const reasoning = buildReasoning(domain, inferredLevel, matchDetails, adverbBoost);

  return {
    score: inferredLevel,
    label: LABELS[inferredLevel],
    confidence,
    reasoning,
    matchDetails,
  };
}

function buildReasoning(domain, score, matchDetails, adverbBoost) {
  if (matchDetails.length === 0) {
    return `No strong symptom indicators detected for ${domain}. Score defaulted to minimal.`;
  }

  const directMatches = matchDetails.filter(m => !m.negated).map(m => `"${m.phrase}"`);
  const negMatches = matchDetails.filter(m => m.negated).map(m => `"${m.phrase}" (negated)`);
  const allMatches = [...directMatches, ...negMatches].slice(0, 5);

  let text = `Detected indicators: ${allMatches.join(', ')}.`;
  if (adverbBoost > 0) text += ` Severity adverb amplification applied (+${adverbBoost}).`;
  return text;
}

function scoreQuestionAnswer(answer) {
  const value = answer?.answer;

  if (answer?.questionId === 16) {
    if (value === 'Yes') return 0;
    if (value === 'No') return 1;
    if (value === 'Unsure') return 0.5;
    return 0;
  }

  if (value === 'Yes') return 1;
  if (value === 'Unsure') return 0.4;
  return 0;
}

// ─── Integrated risk assessment ───────────────────────────────────────────────

/**
 * Compute an integrated risk level from all data sources.
 *
 * Returns { level: 'Low'|'Moderate'|'Elevated'|'High', score: number, rationale: string[], safetyOverride: boolean }
 */
export function computeIntegratedRisk({ voiceSymptomResults, freeSpeechResults, answers, photoAnalysisResults }) {
  const rationale = [];
  let safetyOverride = false;
  let totalScore = 0;
  let maxPossible = 0;

  // ── 1. Voice symptom scores (0-4 per domain, weight 40%) ─────────────────
  if (voiceSymptomResults && voiceSymptomResults.length > 0) {
    const symScores = voiceSymptomResults.map(r => r.score ?? 0);
    const avgSymScore = symScores.reduce((a, b) => a + b, 0) / symScores.length;
    totalScore += avgSymScore * 10; // 0-40 points
    maxPossible += 40;
    rationale.push(`Structured symptom avg: ${avgSymScore.toFixed(1)}/4 (${symScores.join(', ')})`);

    // Safety override check
    const safetyEntry = voiceSymptomResults.find(r => r.domain === 'safety');
    if (safetyEntry?.safetyFlag || (safetyEntry?.score ?? 0) >= 2) {
      safetyOverride = true;
      rationale.push('⚠ Safety domain flagged — self-harm ideation indicators detected.');
    }
  }

  // ── 2. Free speech sentiment (weight 20%) ─────────────────────────────────
  if (freeSpeechResults) {
    const sentScore = freeSpeechResults.sentiment?.score ?? 0; // -1 to +1
    // Map: -1 → 20 pts, 0 → 10, +1 → 0
    const sentPoints = ((1 - sentScore) / 2) * 20;
    totalScore += sentPoints;
    maxPossible += 20;
    rationale.push(`Free speech sentiment: ${freeSpeechResults.sentiment?.label ?? 'N/A'} (score ${freeSpeechResults.sentiment?.score?.toFixed(2) ?? '—'})`);
  }

  // ── 3. MINI questionnaire Yes-answer ratio (weight 30%) ───────────────────
  if (answers && answers.length > 0) {
    const questionRisk = answers.reduce((sum, answer) => sum + scoreQuestionAnswer(answer), 0) / answers.length;
    totalScore += questionRisk * 30;
    maxPossible += 30;
    const supportAnswer = answers.find(a => a.questionId === 16)?.answer;
    const supportNote = supportAnswer ? `; support item=${supportAnswer}` : '';
    rationale.push(`Clinical questionnaire weighted risk: ${Math.round(questionRisk * 100)}%${supportNote}`);
  }

  // ── 4. Facial emotion data (weight 10%) ───────────────────────────────────
  if (answers && answers.length > 0) {
    const facialSummary = summarizeFacialSignals(answers, photoAnalysisResults);
    let emotionRatio = facialSummary.available ? facialSummary.negativeAffectRatio : 0;

    if (!facialSummary.available) {
      const snapshotCount = answers.filter(a => a.emotionSnapshot).length;
      const negativeCount = answers.filter(a =>
        isNegativeEmotion(a.emotionSnapshot?.predominantEmotion)
      ).length;
      emotionRatio = snapshotCount > 0 ? negativeCount / snapshotCount : 0;
    }

    totalScore += emotionRatio * 10;
    maxPossible += 10;
    rationale.push(
      facialSummary.available
        ? `Facial affect: ${Math.round(emotionRatio * 100)}% negative-affect signal across ${facialSummary.sampleCount} samples`
        : 'Facial affect: limited or unavailable; snapshot fallback used when possible'
    );
  }

  // ── Normalise to 0-100 ────────────────────────────────────────────────────
  const normalisedScore = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

  let level;
  if (safetyOverride) {
    level = 'Elevated';
  } else if (normalisedScore < 25) {
    level = 'Low';
  } else if (normalisedScore < 50) {
    level = 'Moderate';
  } else if (normalisedScore < 75) {
    level = 'Elevated';
  } else {
    level = 'High';
  }

  return {
    level,
    score: Math.round(normalisedScore),
    rationale,
    safetyOverride,
  };
}

export const DSM_LABELS = ['None', 'Slight', 'Mild', 'Moderate', 'Severe'];
export const DSM_COLORS = ['#27ae60', '#f1c40f', '#e67e22', '#e74c3c', '#8e1d1d'];

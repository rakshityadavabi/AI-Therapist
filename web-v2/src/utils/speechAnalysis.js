/**
 * Lightweight client-side text analysis utilities for the free-speech section.
 */

export function splitSentences(text) {
  if (!text || !text.trim()) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function computeSentiment(text) {
  if (!text || !text.trim()) return { score: 0, label: 'Neutral' };

  const positiveSet = new Set([
    'good', 'great', 'happy', 'love', 'enjoy', 'wonderful', 'fantastic',
    'amazing', 'excellent', 'nice', 'fine', 'well', 'better', 'best',
    'fun', 'glad', 'thankful', 'grateful', 'hopeful', 'excited',
    'peaceful', 'calm', 'relaxed', 'confident', 'proud', 'comfortable',
    'positive', 'beautiful', 'awesome', 'perfect', 'okay', 'ok',
    'liked', 'like', 'helps', 'helped', 'helpful', 'joy', 'safe',
    'satisfied', 'satisfying', 'pleasant', 'pleased',
  ]);

  const negativeSet = new Set([
    'bad', 'sad', 'angry', 'hate', 'terrible', 'awful', 'horrible',
    'stress', 'stressed', 'anxious', 'anxiety', 'depressed', 'depression',
    'worried', 'fear', 'scared', 'lonely', 'tired', 'exhausted',
    'pain', 'hurt', 'suffer', 'problem', 'difficult', 'hard',
    'nervous', 'upset', 'frustrated', 'hopeless', 'overwhelmed',
    'unhappy', 'miserable', 'worse', 'worst', 'boring', 'bored',
    'annoyed', 'annoying', 'crying', 'cried', 'cry', 'sick',
    'rough', 'struggle', 'struggling', 'lost', 'alone', 'numb',
    'empty', 'helpless', 'worthless', 'guilty', 'ashamed',
    'irritated', 'irritable', 'restless', 'tense', 'drained',
    'disconnected', 'unmotivated', 'unwell',
  ]);

  const negators = new Set([
    'not', 'no', 'never', 'neither', 'nor', 'barely', 'hardly',
    'scarcely', 'rarely', 'seldom', 'nothing', 'nobody', 'none',
    'nowhere', 'without',
  ]);

  const negationContractions = /\b(don'?t|didn'?t|doesn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|won'?t|wouldn'?t|can'?t|couldn'?t|shouldn'?t|haven'?t|hasn'?t|hadn'?t|mustn'?t)\b/i;

  const raw = text.toLowerCase();
  const tokens = raw.match(/[a-z']+/g) || [];

  let posCount = 0;
  let negCount = 0;
  let negWindow = 0;

  tokens.forEach((token) => {
    const clean = token.replace(/[^a-z]/g, '');

    if (negationContractions.test(token)) {
      negWindow = 3;
      return;
    }
    if (negators.has(clean)) {
      negWindow = 3;
      return;
    }

    const isPos = positiveSet.has(clean);
    const isNeg = negativeSet.has(clean);

    if (isPos || isNeg) {
      const flipped = negWindow > 0;
      if (isPos) {
        if (flipped) negCount++;
        else posCount++;
      }
      if (isNeg) {
        if (flipped) posCount++;
        else negCount++;
      }
      negWindow = 0;
    } else if (negWindow > 0) {
      negWindow--;
    }
  });

  const total = posCount + negCount;
  if (total === 0) return { score: 0, label: 'Neutral' };

  const score = parseFloat(((posCount - negCount) / total).toFixed(2));
  let label = 'Neutral';
  if (score > 0.25) label = 'Positive';
  else if (score < -0.25) label = 'Negative';
  else if (score !== 0) label = 'Mixed';

  return { score, label };
}

export function analyzeTranscript(text, durationSec) {
  const wordCount = countWords(text);
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length;
  const durationMin = durationSec / 60;
  const wordsPerMinute = durationMin > 0 ? Math.round(wordCount / durationMin) : 0;
  const sentiment = computeSentiment(text);

  return {
    wordCount,
    sentenceCount,
    speakingDurationSec: Math.round(durationSec),
    wordsPerMinute,
    sentiment,
    transcribedText: text,
  };
}

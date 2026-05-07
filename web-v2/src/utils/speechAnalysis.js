/**
 * speechAnalysis.js
 *
 * Lightweight, client-side text analysis utilities for the
 * free-speech recording section. No external API calls.
 */

/**
 * Split text into sentences using common delimiters.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  if (!text || !text.trim()) return [];
  // Split on . ! ? followed by whitespace or end-of-string
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Count words in a string.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Compute a naive sentiment score between -1 (negative) and +1 (positive).
 * Handles negation (not, don't, didn't, etc.) so that phrases like
 * "did not feel great" are correctly scored as negative.
 * @param {string} text
 * @returns {{ score: number, label: string }}
 */
export function computeSentiment(text) {
  if (!text || !text.trim()) return { score: 0, label: 'Neutral' };

  const positivePhrases = [
    'no problem', 'no problems', 'not a problem', 'not worried', 'not anxious',
    'not depressed', 'not stressed', 'doing okay', 'doing well', 'feeling okay',
    'feeling better', 'feel supported', 'have support', 'sleeping well',
    'managing well', 'coping well', 'in control', 'things are better',
  ];

  const negativePhrases = [
    'not good', 'not okay', 'not fine', 'not doing well', 'do not feel good',
    "don't feel good", 'feeling down', 'feel down', 'feeling hopeless',
    'feel hopeless', 'lost interest', 'no interest', 'cannot sleep',
    "can't sleep", 'hard to sleep', 'panic attack', 'panic attacks',
    'want to die', 'better off dead', 'hurt myself', 'harm myself',
    'no reason to live', 'not want to be here', "don't want to be here",
  ];

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

  // Negation words — these flip the polarity of the NEXT sentiment word
  const negators = new Set([
    'not', 'no', 'never', 'neither', 'nor', 'barely', 'hardly',
    'scarcely', 'rarely', 'seldom', 'nothing', 'nobody', 'none',
    'nowhere', 'without',
  ]);

  // Contractions that carry negation (after stripping non-alpha they
  // collapse into the base verb, so we also check the raw token)
  const negationContractions = /\b(don'?t|didn'?t|doesn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|won'?t|wouldn'?t|can'?t|couldn'?t|shouldn'?t|haven'?t|hasn'?t|hadn'?t|mustn'?t)\b/i;

  const raw = text.toLowerCase();
  // Split contrast clauses so the phrase after "but/however" carries more weight.
  const clauses = raw
    .split(/\b(?:but|however|though|although)\b/i)
    .map(clause => clause.trim())
    .filter(Boolean);

  let positiveWeight = 0;
  let negativeWeight = 0;
  const protectiveSignals = [];
  const distressSignals = [];

  // Phrase-level evidence prevents isolated words from dominating the result.
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRegex = phrase => new RegExp(`(^|\\b)${escapeRegExp(phrase)}(\\b|$)`, 'i');

  clauses.forEach((clause, clauseIndex) => {
    const clauseWeight = clauses.length > 1 && clauseIndex === clauses.length - 1 ? 1.35 : 1;

    positivePhrases.forEach(phrase => {
      if (phraseRegex(phrase).test(clause)) {
        positiveWeight += 1.5 * clauseWeight;
        protectiveSignals.push(phrase);
      }
    });

    negativePhrases.forEach(phrase => {
      if (phraseRegex(phrase).test(clause)) {
        negativeWeight += 1.7 * clauseWeight;
        distressSignals.push(phrase);
      }
    });

    const tokens = clause.match(/[a-z']+/g) || [];
    let negWindow = 0;

    tokens.forEach((token, tokenIndex) => {
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
        const previous = tokens[Math.max(0, tokenIndex - 1)] || '';
        const intensity = ['very', 'extremely', 'really', 'constantly', 'always'].includes(previous) ? 1.35 : 1;
        const weight = clauseWeight * intensity;

        if (isPos) {
          if (flipped) {
            negativeWeight += weight;
            distressSignals.push(`${token} (negated positive)`);
          } else {
            positiveWeight += weight;
            protectiveSignals.push(token);
          }
        }

        if (isNeg) {
          if (flipped) {
            positiveWeight += weight;
            protectiveSignals.push(`${token} (negated distress)`);
          } else {
            negativeWeight += weight;
            distressSignals.push(token);
          }
        }

        negWindow = 0;
      } else if (negWindow > 0) {
        negWindow--;
      }
    });
  });

  const total = positiveWeight + negativeWeight;
  if (total === 0) {
    return {
      score: 0,
      label: 'Neutral',
      confidence: 0.15,
      protectiveSignals: [],
      distressSignals: [],
      evidencePhrases: [],
      summary: 'No clear emotional language detected in the transcript.',
    };
  }

  const score = parseFloat(((positiveWeight - negativeWeight) / total).toFixed(2));
  const hasBothPolarities = positiveWeight > 0 && negativeWeight > 0;
  let label = 'Neutral';
  if (hasBothPolarities && Math.abs(score) < 0.45) label = 'Mixed';
  else if (score > 0.25) label = 'Positive';
  else if (score < -0.25) label = 'Negative';
  else if (score !== 0) label = 'Mixed';

  const uniqueProtective = [...new Set(protectiveSignals)].slice(0, 6);
  const uniqueDistress = [...new Set(distressSignals)].slice(0, 6);

  return {
    score,
    label,
    confidence: Number(Math.min(0.9, 0.3 + total / 10).toFixed(2)),
    protectiveSignals: uniqueProtective,
    distressSignals: uniqueDistress,
    evidencePhrases: [...uniqueProtective, ...uniqueDistress].slice(0, 8),
    summary: `Contextual local sentiment based on ${uniqueProtective.length} protective and ${uniqueDistress.length} distress signal(s).`,
  };
}

/**
 * Run a full analysis on the recorded transcript.
 * @param {string} text           – the transcribed speech
 * @param {number} durationSec    – how many seconds the user actually spoke
 * @returns {object}
 */
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

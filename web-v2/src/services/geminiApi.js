/**
 * Gemini AI integration for mental-health screening analysis.
 * Reads VITE_GEMINI_API_KEY from import.meta.env.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getApiKey() {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_REACT_APP_GEMINI_API_KEY ||
    null
  );
}

export async function generateEmotionAnalysis(
  answers,
  photoAnalysisResults,
  freeSpeechResults,
  apiKey,
  extras = {}
) {
  if (!apiKey) throw new Error('Gemini API key is required');

  const { behavioralSession = null } = extras;
  const context = extras;

  try {
    const emotionSummary = analyzeEmotions(answers);
    const photoSummary = analyzePhotos(photoAnalysisResults);
    const behavioralSummary = summariseBehavioral(behavioralSession);

    const payload = {
      answers: answers || [],
      photoSummary,
      photos: Array.isArray(photoAnalysisResults)
        ? photoAnalysisResults.map((p) => ({
            id: p.id,
            timestamp: p.timestamp,
            questionData: p.questionData || null,
            dimensions: p.dimensions || null,
            emotionAggregate: p.emotionAggregate || null,
            processedEmotion: p.processedEmotion || null,
            behavioral: p.behavioral || null,
          }))
        : [],
      freeSpeech: freeSpeechResults || null,
      structuredVoiceSymptoms: context.voiceSymptomResults || null,
      patient: context.patientMeta
        ? {
            uhidProvided: Boolean(context.patientMeta.uhid),
            uhidSkipped: Boolean(context.patientMeta.skipped),
            storage: 'not persisted by this app',
          }
        : null,
      emotionSummary,
      behavioralSession: behavioralSession
        ? {
            generatedAt: behavioralSession.generatedAt,
            durationMs: behavioralSession.durationMs,
            samples: behavioralSession.samples,
            composite: behavioralSession.composite,
            qualitative: behavioralSession.qualitative,
            metrics: {
              blinkRate: behavioralSession.blinkRate,
              smileFrequency: behavioralSession.smileFrequency,
              movementScore: behavioralSession.movementScore,
              expressionVariability: behavioralSession.expressionVariability,
              gazeStability: behavioralSession.gazeStability,
              sadnessTrend: behavioralSession.sadnessTrend,
            },
            perQuestion: (behavioralSession.perQuestion || []).map((q) => ({
              meta: q.meta,
              compositeState: q.compositeState,
              qualitative: q.qualitative,
              shifts: q.shifts,
              summary: q.summary,
              answer: q.answer ?? null,
            })),
          }
        : null,
    };

    const prompt =
      `${createAnalysisPrompt(emotionSummary, photoSummary, behavioralSummary, answers.length, answers)}\n\n` +
      `SESSION DATA (JSON):\n${JSON.stringify(payload, null, 2)}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1200 },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid response format from Gemini API');
  } catch (error) {
    console.error('Error generating analysis:', error);
    return generateFallbackAnalysis(answers, photoAnalysisResults);
  }
}

function analyzeEmotions(answers) {
  const emotions = {};
  let totalConfidence = 0;
  let emotionCount = 0;

  answers.forEach((answer) => {
    const emotion =
      answer.emotionAggregate?.dominantEmotion ||
      answer.emotionSnapshot?.predominantEmotion;
    const confidence =
      answer.emotionAggregate?.confidence ??
      answer.emotionSnapshot?.confidence;

    if (emotion) {
      emotions[emotion] = (emotions[emotion] || 0) + 1;
      if (confidence) {
        totalConfidence += confidence;
        emotionCount++;
      }
    }
  });

  const averageConfidence = emotionCount > 0 ? totalConfidence / emotionCount : 0;
  const dominantEmotion = Object.keys(emotions).reduce(
    (a, b) => (emotions[a] > emotions[b] ? a : b),
    'Neutral'
  );

  return { emotions, dominantEmotion, averageConfidence, totalQuestions: answers.length };
}

function analyzePhotos(photoAnalysisResults) {
  if (!photoAnalysisResults || photoAnalysisResults.length === 0) {
    return { totalPhotos: 0, successfulAnalysis: 0, averageConfidence: 0 };
  }
  const successfulPhotos = photoAnalysisResults.filter(
    (photo) => photo.processedEmotion && photo.processedEmotion.faceDetected
  );
  const averageConfidence =
    successfulPhotos.length > 0
      ? successfulPhotos.reduce((sum, photo) => sum + photo.processedEmotion.confidence, 0) /
        successfulPhotos.length
      : 0;

  return {
    totalPhotos: photoAnalysisResults.length,
    successfulAnalysis: successfulPhotos.length,
    averageConfidence,
  };
}

function summariseBehavioral(session) {
  if (!session) return null;
  return {
    composite: session.composite,
    qualitative: session.qualitative,
    durationMs: session.durationMs,
    samples: session.samples,
    metrics: {
      blinkRate: session.blinkRate,
      smileFrequency: session.smileFrequency,
      movementScore: session.movementScore,
      expressionVariability: session.expressionVariability,
      gazeStability: session.gazeStability,
      sadnessTrend: session.sadnessTrend,
    },
    perQuestion: session.perQuestion || [],
  };
}

function createAnalysisPrompt(emotionSummary, photoSummary, behavioralSummary, totalQuestions, answers = []) {
  const yesCount = answers.filter((a) => a.answer === 'Yes').length;
  const noCount = answers.filter((a) => a.answer === 'No').length;
  const unsureCount = answers.filter((a) => a.answer === 'Unsure').length;

  const behavioralBlock = behavioralSummary
    ? `
**BEHAVIORAL OBSERVATION (derived from facial landmarks over time):**
• Composite state: ${behavioralSummary.composite?.label || 'unavailable'} (confidence ${Math.round((behavioralSummary.composite?.confidence ?? 0) * 100)}%)
• Blink rate: ${Math.round(behavioralSummary.metrics.blinkRate)} blinks/min (${behavioralSummary.qualitative?.blink})
• Smile activity: ${Math.round(behavioralSummary.metrics.smileFrequency * 100)}% of frames (${behavioralSummary.qualitative?.smile})
• Head movement: ${Math.round(behavioralSummary.metrics.movementScore * 100)}% (${behavioralSummary.qualitative?.movement})
• Expression variability: ${Math.round(behavioralSummary.metrics.expressionVariability * 100)}% (${behavioralSummary.qualitative?.variability})
• Gaze stability: ${Math.round(behavioralSummary.metrics.gazeStability * 100)}% (${behavioralSummary.qualitative?.gaze})
• Sustained sadness signal: ${Math.round(behavioralSummary.metrics.sadnessTrend * 100)}%
• Per-question shifts captured: ${behavioralSummary.perQuestion?.length ?? 0}
`
    : '';

  return `You are an experienced clinical psychologist providing a comprehensive mental health screening analysis. Your role is to offer empathetic, professional insights while maintaining appropriate boundaries. Please analyze this data with clinical expertise but communicate in an accessible, supportive manner.

**SCREENING SESSION DATA:**
• Total questions completed: ${totalQuestions}
• Response distribution: ${yesCount} Yes, ${noCount} No, ${unsureCount} Unsure
• Primary emotion detected: ${emotionSummary.dominantEmotion}
• Emotional consistency: ${Math.round(emotionSummary.averageConfidence * 100)}% average confidence
• Emotion patterns observed: ${Object.entries(emotionSummary.emotions)
    .map(([emotion, count]) => `${emotion} (${count} instances)`)
    .join(', ')}

**FACIAL EXPRESSION ANALYSIS:**
• Photos captured during session: ${photoSummary.totalPhotos}
• Successfully analyzed expressions: ${photoSummary.successfulAnalysis}/${photoSummary.totalPhotos}
• Facial expression confidence: ${Math.round(photoSummary.averageConfidence * 100)}%
${behavioralBlock}
Please provide a comprehensive clinical assessment with these sections:
1. OVERALL EMOTIONAL STATE SUMMARY
2. KEY CLINICAL OBSERVATIONS (incorporate behavioral signals — blink rate, gaze, movement, smile activity — alongside raw expressions; favour the temporal/composite read over single-frame labels)
3. EMOTIONAL-BEHAVIORAL ALIGNMENT (note where verbal answers and behavioral signals agree or diverge per question)
4. AREAS FOR ATTENTION
5. STRENGTHS AND RESILIENCE FACTORS
6. CLINICAL RECOMMENDATIONS
7. SUPPORTIVE VALIDATION

Treat behavioral metrics as soft, supportive signals — never as diagnosis. Use professional clinical language that remains warm and accessible. Emphasize that this is a screening tool and recommend professional consultation for comprehensive mental health care.`;
}

export async function analyzeSentimentWithAI(text) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[Sentiment] No VITE_GEMINI_API_KEY found — skipping AI analysis');
    return null;
  }
  if (!text || !text.trim()) return null;

  try {
    const prompt = `You are a clinical sentiment analysis system. Analyze the sentiment of the following transcribed speech that was recorded during a mental health screening. The person was asked: "Tell me about yourself — how have you been feeling lately?"

Transcribed speech:
"""${text}"""

Instructions:
1. Consider negation (e.g. "not good" is negative, "don't feel great" is negative).
2. Consider the overall emotional tone and mental health context.
3. Look at what the person is actually communicating, not just individual word polarity.

Respond with ONLY a JSON object — no explanation, no markdown fences:
{"score": <float from -1.0 to 1.0>, "label": "<Positive|Negative|Neutral|Mixed>"}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.0, topK: 1, topP: 1.0, maxOutputTokens: 60 },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Gemini API ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');

    const cleaned = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error(`Could not find JSON in response: ${cleaned.slice(0, 100)}`);

    const parsed = JSON.parse(jsonMatch[0]);
    const validLabels = ['Positive', 'Negative', 'Neutral', 'Mixed'];
    return {
      score:
        typeof parsed.score === 'number'
          ? Math.max(-1, Math.min(1, parseFloat(parsed.score.toFixed(2))))
          : 0,
      label: validLabels.includes(parsed.label) ? parsed.label : 'Neutral',
      source: 'ai',
    };
  } catch (err) {
    console.error('[Sentiment] AI analysis failed:', err.message || err);
    return null;
  }
}

function generateFallbackAnalysis(answers, photoAnalysisResults) {
  const emotionSummary = analyzeEmotions(answers);
  const photoSummary = analyzePhotos(photoAnalysisResults);

  const dominantEmotion = emotionSummary.dominantEmotion.toLowerCase();
  const photoCount = photoSummary.totalPhotos;
  const totalQuestions = answers.length;

  let analysis = `Thank you for completing this ${totalQuestions}-question emotional wellness screening. `;

  if (dominantEmotion === 'happy' || dominantEmotion === 'neutral') {
    analysis += `Your responses suggest a generally stable emotional state, with ${dominantEmotion} as your predominant expression throughout the session. `;
  } else if (dominantEmotion === 'sad' || dominantEmotion === 'fearful') {
    analysis += `Your responses suggest you may be navigating challenging emotions right now, with ${dominantEmotion} being most prominent. This is common and reflects self-awareness. `;
  } else {
    analysis += `Your emotional patterns show variety, with ${dominantEmotion} being most prominent — a complex and natural mix. `;
  }

  if (photoCount > 0) {
    analysis += `Facial expression analysis captured ${photoCount} frames; ${photoSummary.successfulAnalysis} were successfully analyzed for emotional alignment with your verbal responses. `;
  }

  analysis += `Consider supportive habits such as mindfulness, regular movement, sleep, and connection with people you trust. If feelings persist or interfere with daily life, a mental-health professional can offer tailored guidance.`;

  return analysis;
}

export { getApiKey };

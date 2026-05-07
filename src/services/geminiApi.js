/**
 * Gemini AI API Integration for Mental Health Analysis
 * 
 * This service generates human-readable analysis of mental health screening results
 * using Google's Gemini AI model.
 */
import { summarizeFacialSignals } from '../utils/emotionAnalysis';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generate analysis using Gemini AI
 * @param {Array} answers - Array of answer objects with emotion data
 * @param {Array} photoAnalysisResults - Array of photo analysis results
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} - Generated analysis text
 */
export async function generateEmotionAnalysis(
  answers,
  photoAnalysisResults,
  freeSpeechResults,
  apiKey,
  voiceSymptomResults = null,
  patientMeta = null,
  facialSummaryInput = null
) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  try {
    // Prepare data for analysis
    const emotionSummary = analyzeEmotions(answers);
    const photoSummary = analyzePhotos(photoAnalysisResults);
    const facialSummary = facialSummaryInput || summarizeFacialSignals(answers, photoAnalysisResults);

    // Build a combined payload object (JSON-friendly)
    const payload = {
      answers: answers || [],
      voiceSymptomResults: voiceSymptomResults || null,
      photoSummary,
      facialSummary,
      photos: Array.isArray(photoAnalysisResults) ? photoAnalysisResults.map(p => ({
        id: p.id,
        timestamp: p.timestamp,
        questionData: p.questionData || null,
        dimensions: p.dimensions || null,
        processedEmotion: p.processedEmotion || null,
        currentEmotion: p.currentEmotion || null,
        emotionAggregate: p.emotionAggregate || null
      })) : [],
      freeSpeech: freeSpeechResults || null,
      emotionSummary,
      patient: patientMeta ? {
        uhidProvided: Boolean(patientMeta.uhid),
        uhidSkipped: Boolean(patientMeta.uhidSkipped),
        storage: patientMeta.storage || 'local-session-only'
      } : null
    };

    // Create prompt for Gemini including the combined JSON payload
    const prompt = `${createAnalysisPrompt(emotionSummary, photoSummary, answers.length, answers, facialSummary)}\n\n` +
      `SESSION DATA (JSON):\n${JSON.stringify(payload, null, 2)}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1200
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }

  } catch (error) {
    console.error('Error generating analysis:', error);
    return generateFallbackAnalysis(answers, photoAnalysisResults);
  }
}

/**
 * Analyze emotions from answers
 * @param {Array} answers - Array of answer objects
 * @returns {Object} - Emotion analysis summary
 */
function analyzeEmotions(answers) {
  const emotions = {};
  let totalConfidence = 0;
  let emotionCount = 0;

  answers.forEach(answer => {
    if (answer.emotionSnapshot && answer.emotionSnapshot.predominantEmotion) {
      const emotion = answer.emotionSnapshot.predominantEmotion;
      emotions[emotion] = (emotions[emotion] || 0) + 1;
      
      if (answer.emotionSnapshot.confidence) {
        totalConfidence += answer.emotionSnapshot.confidence;
        emotionCount++;
      }
    }
  });

  const averageConfidence = emotionCount > 0 ? totalConfidence / emotionCount : 0;
  const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
    emotions[a] > emotions[b] ? a : b, 'Neutral'
  );

  return {
    emotions,
    dominantEmotion,
    averageConfidence,
    totalQuestions: answers.length
  };
}

/**
 * Analyze photo results
 * @param {Array} photoAnalysisResults - Array of photo analysis objects
 * @returns {Object} - Photo analysis summary
 */
function analyzePhotos(photoAnalysisResults) {
  if (!photoAnalysisResults || photoAnalysisResults.length === 0) {
    return {
      totalPhotos: 0,
      successfulAnalysis: 0,
      averageConfidence: 0
    };
  }

  const successfulPhotos = photoAnalysisResults.filter(photo => 
    photo.processedEmotion && photo.processedEmotion.faceDetected
  );

  const averageConfidence = successfulPhotos.length > 0 
    ? successfulPhotos.reduce((sum, photo) => sum + photo.processedEmotion.confidence, 0) / successfulPhotos.length
    : 0;

  return {
    totalPhotos: photoAnalysisResults.length,
    successfulAnalysis: successfulPhotos.length,
    averageConfidence
  };
}

/**
 * Create analysis prompt for Gemini
 * @param {Object} emotionSummary - Emotion analysis summary
 * @param {Object} photoSummary - Photo analysis summary
 * @param {number} totalQuestions - Total number of questions
 * @param {Array} answers - Complete answers array with question details
 * @returns {string} - Formatted prompt
 */
function createAnalysisPrompt(emotionSummary, photoSummary, totalQuestions, answers = [], facialSummary = null) {
  // Extract answer patterns for deeper analysis
  const yesCount = answers.filter(a => a.answer === 'Yes').length;
  const noCount = answers.filter(a => a.answer === 'No').length;
  const unsureCount = answers.filter(a => a.answer === 'Unsure').length;
  const facialSignalLine = facialSummary?.available
    ? `Facial aggregate: ${Math.round(facialSummary.negativeAffectRatio * 100)}% negative affect, ${Math.round(facialSummary.neutralRatio * 100)}% neutral, quality ${facialSummary.quality}`
    : 'Facial aggregate: insufficient facial samples';

  return `You are an experienced clinical psychologist providing a comprehensive mental health screening analysis. Your role is to offer empathetic, professional insights while maintaining appropriate boundaries. Please analyze this data with clinical expertise but communicate in an accessible, supportive manner.

**SCREENING SESSION DATA:**
• Total questions completed: ${totalQuestions}
• Response distribution: ${yesCount} Yes, ${noCount} No, ${unsureCount} Unsure
• Primary emotion detected: ${emotionSummary.dominantEmotion}
• Emotional consistency: ${Math.round(emotionSummary.averageConfidence * 100)}% average confidence
• Emotion patterns observed: ${Object.entries(emotionSummary.emotions).map(([emotion, count]) => `${emotion} (${count} instances)`).join(', ')}
• ${facialSignalLine}

**FACIAL EXPRESSION ANALYSIS:**
• Photos captured during session: ${photoSummary.totalPhotos}
• Successfully analyzed expressions: ${photoSummary.successfulAnalysis}/${photoSummary.totalPhotos}
• Facial expression confidence: ${Math.round(photoSummary.averageConfidence * 100)}%

**RESPONSE PATTERN INSIGHTS:**
• Certainty level: ${Math.round(((yesCount + noCount) / totalQuestions) * 100)}% definitive responses
• Uncertainty indicators: ${Math.round((unsureCount / totalQuestions) * 100)}% uncertain responses

Please provide a comprehensive clinical assessment structured as follows:

**1. OVERALL EMOTIONAL STATE SUMMARY:**
Provide a 2-3 sentence professional assessment of their current emotional presentation based on both verbal responses and facial expressions.

**2. KEY CLINICAL OBSERVATIONS:**
Identify 2-3 significant patterns or areas that stand out from a clinical perspective. Consider response patterns, emotional coherence, and any noteworthy inconsistencies.

**3. EMOTIONAL-BEHAVIORAL ALIGNMENT:**
Analyze how well their facial expressions aligned with their verbal responses. What does this tell us about their emotional awareness and expression?

**4. AREAS FOR ATTENTION:**
Highlight any patterns that may warrant follow-up or professional attention (without diagnosing).

**5. STRENGTHS AND RESILIENCE FACTORS:**
Identify positive indicators of emotional health, coping capacity, or self-awareness.

**6. CLINICAL RECOMMENDATIONS:**
Provide 3-4 specific, evidence-based suggestions for emotional wellness, self-care, or when to seek professional support.

**7. SUPPORTIVE VALIDATION:**
Acknowledge their courage in seeking assessment and normalize their experience with empathy.

Use professional clinical language that remains warm and accessible. Emphasize that this is a screening tool and recommend professional consultation for comprehensive mental health care. Focus on empowerment and hope while being honest about any areas of concern.`;
}

/**
 * Analyze sentiment of transcribed speech using Gemini AI
 * @param {string} text - The transcribed speech text
 * @returns {Promise<{ score: number, label: string, source: string } | null>} - Sentiment result or null
 */
export async function analyzeSentimentWithAI(text) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[Sentiment] No REACT_APP_GEMINI_API_KEY found — skipping AI analysis');
    return null;
  }
  if (!text || !text.trim()) {
    return null;
  }

  try {
    const prompt = `You are a clinical sentiment analysis system. Analyze the sentiment of the following transcribed speech that was recorded during a mental health screening. The person was asked: "Tell me about yourself — how have you been feeling lately?"

Transcribed speech:
"""${text}"""

Instructions:
1. Consider negation (e.g. "not good" is negative, "don't feel great" is negative).
2. Consider the overall emotional tone and mental health context.
3. Look at what the person is actually communicating, not just individual word polarity.
4. Do not label a word as concerning when the surrounding phrase negates or softens it.

Respond with ONLY a JSON object — no explanation, no markdown fences:
{"score": <float from -1.0 to 1.0>, "label": "<Positive|Negative|Neutral|Mixed>", "confidence": <float from 0 to 1>, "emotionalTone": "<short phrase>", "distressSignals": ["short evidence phrases"], "protectiveSignals": ["short evidence phrases"], "evidencePhrases": ["short evidence phrases"], "summary": "<one sentence rationale>"}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.0,
        topK: 1,
        topP: 1.0,
        maxOutputTokens: 260,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            label: { type: 'string', enum: ['Positive', 'Negative', 'Neutral', 'Mixed'] },
            confidence: { type: 'number' },
            emotionalTone: { type: 'string' },
            distressSignals: { type: 'array', items: { type: 'string' } },
            protectiveSignals: { type: 'array', items: { type: 'string' } },
            evidencePhrases: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' }
          },
          required: ['score', 'label', 'confidence', 'summary'],
          propertyOrdering: [
            'score',
            'label',
            'confidence',
            'emotionalTone',
            'distressSignals',
            'protectiveSignals',
            'evidencePhrases',
            'summary'
          ]
        },
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 s timeout

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

    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    // Strip any markdown code fences or extra whitespace
    const cleaned = rawText
      .replace(/```(?:json)?\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    // Try to extract JSON even if surrounded by text
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      throw new Error(`Could not find JSON in response: ${cleaned.slice(0, 100)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validLabels = ['Positive', 'Negative', 'Neutral', 'Mixed'];

    const result = {
      score: typeof parsed.score === 'number'
        ? Math.max(-1, Math.min(1, parseFloat(parsed.score.toFixed(2))))
        : 0,
      label: validLabels.includes(parsed.label) ? parsed.label : 'Neutral',
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parseFloat(parsed.confidence.toFixed(2))))
        : 0.5,
      emotionalTone: typeof parsed.emotionalTone === 'string' ? parsed.emotionalTone : '',
      distressSignals: Array.isArray(parsed.distressSignals) ? parsed.distressSignals.slice(0, 6) : [],
      protectiveSignals: Array.isArray(parsed.protectiveSignals) ? parsed.protectiveSignals.slice(0, 6) : [],
      evidencePhrases: Array.isArray(parsed.evidencePhrases) ? parsed.evidencePhrases.slice(0, 8) : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      source: 'ai',
    };

    console.log('[Sentiment] AI result:', result);
    return result;
  } catch (err) {
    console.error('[Sentiment] AI analysis failed:', err.message || err);
    return null;
  }
}

/**
 * Generate fallback analysis when API is unavailable
 * @param {Array} answers - Array of answer objects
 * @param {Array} photoAnalysisResults - Array of photo analysis results
 * @returns {string} - Fallback analysis text
 */
function generateFallbackAnalysis(answers, photoAnalysisResults) {
  const emotionSummary = analyzeEmotions(answers);
  const photoSummary = analyzePhotos(photoAnalysisResults);
  
  const dominantEmotion = emotionSummary.dominantEmotion.toLowerCase();
  const photoCount = photoSummary.totalPhotos;
  const totalQuestions = answers.length;
  
  let analysis = `Thank you for completing this ${totalQuestions}-question emotional wellness screening. `;
  
  // Emotional state analysis
  if (dominantEmotion === 'happy' || dominantEmotion === 'neutral') {
    analysis += `Your responses suggest you're currently experiencing a generally positive emotional state, with ${dominantEmotion} being your predominant emotion throughout the session. This indicates good emotional stability and suggests you're managing daily stressors effectively. `;
  } else if (dominantEmotion === 'sad' || dominantEmotion === 'fearful') {
    analysis += `Your responses reveal that you may be navigating some challenging emotional terrain right now, with ${dominantEmotion} being the most prominent emotion detected. This is completely normal and shows self-awareness about your current state. `;
  } else {
    analysis += `Your emotional responses show interesting variety, with ${dominantEmotion} being most prominent. This emotional diversity suggests you're experiencing a complex range of feelings, which is completely natural. `;
  }
  
  // Photo analysis
  if (photoCount > 0) {
    analysis += `Our advanced facial expression analysis captured ${photoCount} photos during your session, providing additional insights into your emotional expressions. ${photoSummary.successfulAnalysis} of these photos were successfully analyzed, offering a deeper understanding of how your facial expressions aligned with your verbal responses. `;
  }
  
  // Pattern insights
  const emotionEntries = Object.entries(emotionSummary.emotions);
  if (emotionEntries.length > 1) {
    analysis += `Your emotional patterns show ${emotionEntries.map(([emotion, count]) => `${count} instances of ${emotion.toLowerCase()}`).join(', ')}, suggesting a nuanced emotional experience rather than a single dominant state. `;
  }
  
  // Supportive guidance
  analysis += `Remember that emotions are temporary visitors - they provide valuable information about our inner state but don't define who we are. The self-awareness you've demonstrated by completing this screening is already a positive step toward emotional wellness. `;
  
  // Closing encouragement
  analysis += `Consider incorporating mindfulness practices, regular exercise, or connecting with supportive friends and family into your routine. If you find these feelings persisting or impacting your daily life significantly, reaching out to a mental health professional can provide additional support and strategies tailored specifically to your needs.`;
  
  return analysis;
}

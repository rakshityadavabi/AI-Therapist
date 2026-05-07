# Research Paper Notes — Mental Health Screening System

## Results

The proposed multimodal mental health screening system was implemented as a fully client-side web application using React 19 and TensorFlow.js-backed face-api.js for real-time facial emotion recognition. The system successfully integrated three parallel data streams—structured clinical questioning, voice-based symptom elicitation, and continuous facial affect monitoring—into a single, privacy-preserving pipeline that requires no server-side data transmission. Across the 18-question MINI-protocol interview (covering anxiety, depression, mood, stress, sleep, and general well-being domains), the system captured a facial emotion snapshot per answer, yielding 18 labelled emotion–response pairs per session. Voice symptom responses for five DSM-5 domains (sleep, interest, mood, anxiety, and safety) were scored on a 0–4 severity scale using keyword-based NLP, while a two-minute open-ended free-speech segment produced speech-rate, sentence-density, and sentiment metrics (score range −1.0 to +1.0). All multimodal signals were fused by a weighted risk-scoring function and, when an API key is present, synthesised into a narrative clinical summary by the Gemini 2.0 Flash large language model. The complete session record was made available for export as a structured JSON file, enabling downstream analysis without retaining any raw video or audio data.

---

## Input Variables

| # | Variable | Source | Type | Description |
|---|---|---|---|---|
| 1 | `speechTranscript` | Browser Web Speech API (free-speech) | `string` | Open-ended spoken response (≤ 120 s) |
| 2 | `voiceResponse[domain]` | Browser Web Speech API (symptom section) | `string` | Spoken response for each of five domains: *sleep, interest, mood, anxiety, safety* |
| 3 | `answer[i]` | User button click / key press | `"Yes"` \| `"No"` \| `"Unsure"` | Response to each of the 18 MINI-protocol questions |
| 4 | `videoFrame[i]` | Webcam canvas capture | Image (base-64) | One frame captured at the moment question *i* is answered |
| 5 | `liveVideoStream` | `MediaDevices.getUserMedia` | Video stream | Continuous webcam feed for real-time emotion detection |
| 6 | `consentGiven` | Consent-screen checkbox | Boolean | Gate before camera/microphone access begins |
| 7 | `GEMINI_API_KEY` | `.env` / environment | `string` | Optional key to enable Gemini AI narrative report |

---

## Output Variables

| # | Variable | Type | Description |
|---|---|---|---|
| 1 | `answers[]` | Array of objects | `{ questionId, questionText, answer, emotionSnapshot, timestamp }` — one record per question |
| 2 | `photoAnalysisResults[]` | Array of objects | `{ questionData, processedEmotion, dimensions, dataUrl, timestamp }` — 18 entries |
| 3 | `freeSpeechResults` | Object \| `null` | `{ wordCount, sentenceCount, wordsPerMinute, sentiment: { score, label }, transcribedText }` |
| 4 | `voiceSymptomResults` | Object \| `null` | Per-domain `{ score (0–4), keywords, detection }` for each of the five DSM-5 domains |
| 5 | `currentEmotion` | Object | `{ emotion, confidence (0–1), allExpressions, timestamp }` — updated continuously during the interview |
| 6 | `aiReport` | `string` | Gemini 2.0 Flash narrative summary integrating all modalities (empty string if no API key) |
| 7 | `finalCombinedJson` | JSON file | Full session export: all of the above merged under a single ISO-8601 timestamp |

---

## Workflow (Pseudocode)

```
PROCEDURE MentalHealthScreening():

  // ── Phase 1: Open-ended speech ─────────────────────────────────────
  START microphone via Web Speech API
  RECORD speechTranscript for up to 120 seconds  // user may skip
  IF speechTranscript NOT empty THEN
    wordCount        ← countWords(speechTranscript)
    wordsPerMinute   ← wordCount / elapsedMinutes
    sentiment        ← computeSentiment(speechTranscript)  // score ∈ [−1, +1]
    freeSpeechResults ← { wordCount, wordsPerMinute, sentiment, transcribedText }
  ELSE
    freeSpeechResults ← null
  END IF

  // ── Phase 2: Structured voice symptoms ─────────────────────────────
  FOR EACH domain IN [sleep, interest, mood, anxiety, safety]:
    PROMPT user with domain question
    RECORD voiceResponse[domain] via Web Speech API  // user may skip
    IF voiceResponse[domain] NOT empty THEN
      score    ← inferDSMScore(domain, voiceResponse[domain])  // 0–4
      keywords ← extractKeywords(voiceResponse[domain])
      voiceSymptomResults[domain] ← { score, keywords }
    END IF
  END FOR

  // ── Phase 3: Informed consent & camera init ─────────────────────────
  DISPLAY consent notice
  WAIT FOR consentGiven = true
  LOAD face-api.js models (TinyFaceDetector, FaceExpressionNet)
  START webcam stream via MediaDevices.getUserMedia

  // ── Phase 4: MINI question interview ───────────────────────────────
  FOR i ← 1 TO 18:
    DISPLAY question[i].text
    DETECT emotions continuously on live video frame:
      currentEmotion ← faceApiDetect(videoCanvas)
        // returns { emotion, confidence, allExpressions }

    WAIT FOR user to select answer ∈ { "Yes", "No", "Unsure" }

    videoFrame[i] ← captureCanvasFrame()
    answers[i]   ← { questionId: i, questionText: question[i].text,
                      answer, emotionSnapshot: currentEmotion, timestamp }
    photoAnalysisResults[i] ← analyzeFrame(videoFrame[i], answers[i])
  END FOR

  // ── Phase 5: AI synthesis (optional) ───────────────────────────────
  IF GEMINI_API_KEY is set THEN
    prompt    ← buildPrompt(answers, photoAnalysisResults,
                            freeSpeechResults, voiceSymptomResults)
    aiReport  ← callGeminiAPI(prompt)  // Gemini 2.0 Flash REST call
  ELSE
    aiReport  ← ""
  END IF

  // ── Phase 6: Risk scoring & summary ────────────────────────────────
  riskResult ← computeIntegratedRisk(voiceSymptomResults,
                                     freeSpeechResults, answers)
    // Weighted: voice symptoms 40%, speech sentiment 20%, answer pattern 40%
    // Returns { level: Low|Moderate|Elevated|High, score, rationale }

  finalCombinedJson ← {
    timestamp, answers, photoAnalysisResults,
    freeSpeechResults, voiceSymptomResults, aiReport
  }

  DISPLAY summary:
    emotion frequency chart  // bar chart over 7 classes
    emotion timeline chart   // per-question sequence
    question transcript      // answer + emotion per question
    DSM-5 domain risk levels // colour-coded 0–4 severity
    aiReport text

  OFFER Export as JSON → download(finalCombinedJson)

END PROCEDURE
```

# Mental Health Screening — Input/Output Variables & Workflow

## Directory Structure

```
mental-health-screening/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── robots.txt
│   └── models/                      # face-api.js TensorFlow ML models
│       ├── tiny_face_detector_model-*
│       ├── face_expression_model-*
│       └── face_landmark_68_model-*
├── src/
│   ├── components/
│   │   ├── IntroScreen.js           # Landing page
│   │   ├── ConsentScreen.js         # Privacy/consent gate
│   │   ├── FreeSpeechSection.js     # Open-ended speech capture
│   │   ├── VoiceSymptomSection.js   # Structured voice symptom capture
│   │   ├── QuestionForm.js          # MINI question display & answer capture
│   │   ├── CameraEmotion.js         # Real-time facial emotion detection
│   │   ├── Summary.js               # Results visualisation & export
│   │   └── ErrorBoundary.js         # React error boundary
│   ├── data/
│   │   └── questions.json           # 18 MINI-protocol screening questions
│   ├── hooks/
│   │   ├── useCamera.js             # Webcam lifecycle management
│   │   ├── useSpeechToText.js       # Web Speech API wrapper
│   │   └── useCountdownTimer.js     # Countdown timer (2 min free speech)
│   ├── services/
│   │   └── geminiApi.js             # Gemini 2.0 Flash AI integration
│   ├── utils/
│   │   ├── speechAnalysis.js        # Transcript NLP utilities
│   │   ├── symptomScoring.js        # DSM-5 severity scoring
│   │   └── tensorflowConfig.js      # TensorFlow.js backend setup
│   ├── App.js                       # Main state-machine orchestrator
│   └── index.js
├── .env                             # REACT_APP_GEMINI_API_KEY (optional)
├── package.json
└── vercel.json
```

---

## Input Variables

### 1. Environment / Configuration

| Variable | Source | Description |
|---|---|---|
| `REACT_APP_GEMINI_API_KEY` | `.env` file | Optional Gemini AI API key; enables AI report generation |

### 2. User Interaction (Form / Button)

| Variable | Component | Type | Description |
|---|---|---|---|
| Consent checkbox | `ConsentScreen` | Boolean | User must tick to proceed |
| Question answer | `QuestionForm` | `"Yes"` / `"No"` / `"Unsure"` | Answer to each of the 18 MINI questions; also accepts keyboard keys `1`, `2`, `3` |

### 3. Speech / Audio Inputs

| Variable | Component | Description |
|---|---|---|
| Free-speech transcript | `FreeSpeechSection` | Browser Web Speech API; up to 120 seconds; responds to prompt *"Tell me about yourself — how have you been feeling lately?"* |
| Symptom voice responses | `VoiceSymptomSection` | One spoken response per domain: `sleep`, `interest`, `mood`, `anxiety`, `safety` |

### 4. Camera / Visual Inputs

| Variable | Component | Description |
|---|---|---|
| Live webcam video stream | `CameraEmotion` | `MediaDevices.getUserMedia({ video: true })`; processed locally by face-api.js |
| Auto-captured video frame | `QuestionForm` + `CameraEmotion` | One canvas frame captured per answered question (18 total) |

### 5. Static / Reference Data

| Variable | File | Description |
|---|---|---|
| `questions[]` | `src/data/questions.json` | 18 MINI protocol questions with `id`, `text`, `category` (anxiety × 5, depression × 7, mood × 2, general × 2, stress × 1, sleep × 1) |
| `SYMPTOM_QUESTIONS[]` | `symptomScoring.js` | 5 structured DSM-5 domain prompts (sleep, interest, mood, anxiety, safety) with keyword lists at each severity level (0–4) |
| Positive / negative word lists | `speechAnalysis.js` | Word-list NLP dictionaries used for sentiment analysis |

---

## Output Variables

### 1. Free Speech Analysis (`freeSpeechResults`)

| Field | Type | Description |
|---|---|---|
| `transcribedText` | `string` | Full transcript of the user's spoken response |
| `wordCount` | `number` | Total words spoken |
| `sentenceCount` | `number` | Estimated sentence count |
| `speakingDurationSec` | `number` | Elapsed recording time in seconds |
| `wordsPerMinute` | `number` | Speech rate |
| `sentiment.score` | `number` | –1.0 (most negative) to +1.0 (most positive) |
| `sentiment.label` | `string` | `"Positive"` / `"Negative"` / `"Neutral"` / `"Mixed"` |

`freeSpeechResults` is `null` when the section is skipped.

### 2. Voice Symptom Analysis (`voiceSymptomResults`)

One entry per domain (`sleep`, `interest`, `mood`, `anxiety`, `safety`):

| Field | Type | Description |
|---|---|---|
| `score` | `0–4` | DSM-5 severity: 0 = None, 1 = Slight, 2 = Mild, 3 = Moderate, 4 = Severe |
| `keywords` | `string[]` | Keywords detected in the spoken response |
| `detection` | `object` | Additional textual analysis indicators |

`voiceSymptomResults` is `null` when the section is skipped.

### 3. Real-time Emotion Detection (`currentEmotion` / per-frame)

| Field | Type | Description |
|---|---|---|
| `emotion` | `string` | Predominant detected emotion: `happy`, `sad`, `angry`, `fearful`, `surprised`, `disgusted`, `neutral` |
| `confidence` | `number` | 0–1 confidence for the predominant emotion |
| `timestamp` | `string` | ISO 8601 timestamp |
| `allExpressions` | `object` | Probability scores for all 7 emotion classes |

### 4. Per-Question Answer Records (`answers[]`)

Each element in the `answers` array:

| Field | Type | Description |
|---|---|---|
| `questionId` | `number` | 1–18 |
| `questionText` | `string` | Full question text |
| `answer` | `string` | `"Yes"` / `"No"` / `"Unsure"` |
| `emotionSnapshot` | `object` | Emotion detected at the moment the answer was given |
| `timestamp` | `string` | ISO 8601 timestamp of the answer |

### 5. Photo Analysis Results (`photoAnalysisResults[]`)

Each element (18 total, one per question):

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique photo identifier |
| `timestamp` | `string` | Capture time (ISO 8601) |
| `questionData.questionNumber` | `number` | 1–18 |
| `questionData.questionText` | `string` | Question text |
| `questionData.answer` | `string` | `"Yes"` / `"No"` / `"Unsure"` |
| `dimensions` | `object` | `{ width, height }` of captured frame |
| `processedEmotion` | `object` | Emotion extracted from the still frame |
| `dataUrl` | `string` | Base-64 encoded JPEG of the captured frame |

### 6. AI Report (`aiReport`)

| Field | Type | Description |
|---|---|---|
| `aiReport` | `string` | Human-readable analysis generated by Gemini 2.0 Flash; integrates answers, emotions, speech, and voice-symptom data. Empty string when no API key is provided. |

### 7. Final Combined Export (`finalCombinedJson`)

```json
{
  "timestamp": "<ISO 8601>",
  "answers": [ /* answers[] */ ],
  "photoAnalysisResults": [ /* photoAnalysisResults[] */ ],
  "freeSpeechResults": { /* or null */ },
  "voiceSymptomResults": { /* or null */ },
  "aiReport": "<string>"
}
```

Downloaded as a `.json` file when the user clicks **Export as JSON** on the Summary page.

### 8. Summary Visualisations (rendered only)

| Output | Description |
|---|---|
| Emotion frequency bar chart | Count of each emotion across all 18 questions (Chart.js) |
| Emotion timeline line chart | Emotion per question sequence (Chart.js) |
| Question transcript table | Question text, answer, and emotion icon per question |
| DSM-5 risk indicators | Colour-coded severity level per domain |
| Progress bar | 0–100 % fill during the question phase |

---

## Complete Workflow

> **Note on consent ordering:** Steps 2 and 3 collect speech/audio data before the formal consent screen (Step 4). This is the current application design. Both sections offer a **Skip** option so no data is captured without the user actively choosing to participate.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1 — INTRO SCREEN                                                  │
│  • Describes the demo and features                                      │
│  • User clicks "Get Started"                                            │
│  • No data captured                                                     │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│  STEP 2 — FREE SPEECH SECTION                                           │
│  INPUT  : Browser microphone (Web Speech API)                           │
│  PROCESS: analyzeTranscript()                                           │
│           • Word / sentence count                                       │
│           • Words-per-minute                                            │
│           • Sentiment scoring (local NLP word lists)                    │
│  OUTPUT : freeSpeechResults { wordCount, sentenceCount,                 │
│                               wordsPerMinute, sentiment,                │
│                               transcribedText }                         │
│  Skip → freeSpeechResults = null                                        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│  STEP 3 — VOICE SYMPTOM SECTION                                         │
│  INPUT  : 5 spoken responses (sleep / interest / mood / anxiety /       │
│           safety)                                                       │
│  PROCESS: inferDSMScore() — keyword matching → 0–4 DSM-5 severity       │
│           detectSelfHarmIdeation() — safety flag                        │
│  OUTPUT : voiceSymptomResults { sleep, interest, mood, anxiety, safety }│
│           each: { score, keywords, detection }                          │
│  Skip → voiceSymptomResults = null                                      │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│  STEP 4 — CONSENT SCREEN                                                │
│  INPUT  : User ticks consent checkbox and clicks "Start Screening"      │
│  • Camera and microphone permissions requested                          │
│  • face-api.js models loaded from public/models/                        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│  STEP 5 — QUESTION INTERVIEW LOOP  (×18 questions)                      │
│                                                                         │
│  FOR each question:                                                     │
│    INPUT  : User clicks Yes / No / Unsure (or keys 1 / 2 / 3)          │
│    PROCESS: face-api.js continuously analyses video canvas              │
│             → detects emotion + confidence for 7 classes                │
│    CAPTURE: One video frame → photoAnalysisResults[i]                  │
│    RECORD : answers[i] = { questionId, questionText, answer,            │
│                             emotionSnapshot, timestamp }                │
│    DISPLAY: Real-time emotion overlay (label + confidence %)            │
│                                                                         │
│  AFTER last question:                                                   │
│    PROCESS: Process all 18 captured frames                              │
│    AI CALL: generateEmotionAnalysis() → Gemini 2.0 Flash API           │
│             (only if REACT_APP_GEMINI_API_KEY is set)                   │
│    OUTPUT : aiReport (text)                                             │
│    BUILD  : finalCombinedJson                                           │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│  STEP 6 — SUMMARY PAGE                                                  │
│  INPUTS  : answers[], photoAnalysisResults[], freeSpeechResults,        │
│            voiceSymptomResults, aiReport                                │
│  PROCESS : computeIntegratedRisk() → DSM-5 domain risk levels           │
│            Chart.js visualisations                                      │
│  OUTPUTS : Emotion frequency chart, timeline chart, question            │
│            transcript, risk indicators, AI report text                  │
│  ACTIONS : Export JSON (download finalCombinedJson)                     │
│            Restart (clear all state → back to INTRO)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key File Reference

| File | Role |
|---|---|
| `App.js` | Central state machine; owns all shared state; orchestrates screen transitions |
| `questions.json` | 18 MINI-protocol questions (anxiety × 5, depression × 7, mood × 2, general × 2, stress × 1, sleep × 1) |
| `FreeSpeechSection.js` | 2-minute free-speech capture with live transcript |
| `VoiceSymptomSection.js` | 5-domain structured voice capture |
| `ConsentScreen.js` | Informed consent; gates camera/mic permissions |
| `QuestionForm.js` | Renders each question; triggers answer recording and photo capture |
| `CameraEmotion.js` | Webcam → canvas pipeline; face-api.js emotion detection loop |
| `Summary.js` | Chart.js visualisations; JSON export |
| `speechAnalysis.js` | `analyzeTranscript()`, `computeSentiment()`, `countWords()` |
| `symptomScoring.js` | `inferDSMScore()`, `detectSelfHarmIdeation()`, `computeIntegratedRisk()` |
| `geminiApi.js` | `generateEmotionAnalysis()` — builds prompt and calls Gemini REST API |
| `useSpeechToText.js` | Wraps `window.SpeechRecognition`; handles auto-restart and transcript accumulation |
| `useCamera.js` | Initialises and cleans up `MediaDevices` video stream |
| `useCountdownTimer.js` | 120-second countdown hook for free-speech section |

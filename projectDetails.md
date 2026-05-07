# Mental Health Screening Demo

This project is a React-based demo that simulates a structured mental health screening flow. It combines three signal sources — free-form speech analysis, real-time facial emotion inference, and a standardized questionnaire — to create a multi-modal, context-aware screening experience. All processing happens locally in the browser.

The application is intended for educational and research prototyping only. It is not a diagnostic tool.

## What This App Does

1. **Introductory Page** — Explains the demo, the signals it collects, and the non-diagnostic disclaimer.
2. **Free Speech Voice Analysis** — Presents an open-ended prompt, records the user's speech via the Web Speech API, transcribes it live, and runs lightweight client-side analysis (word count, pace, sentiment).
3. **Collects informed consent** before any camera access or interview flow begins.
4. **Presents a clinical-style interview** with an 18-question set modeled after the MINI (Mini International Neuropsychiatric Interview).
5. **Runs live facial emotion detection** during each question using face-api.js in the browser.
6. **Summarizes the session** with a unified report covering free-speech metrics, answers, detected emotions, and aggregated stats.

## Navigation Flow

```
Intro Screen → Free Speech (or Skip) → Consent → MCQ + Emotion Detection → Summary
```

## How It Works (Data Flow)

1. **Intro**
   - No permissions requested. User clicks "Get Started" to proceed.
2. **Free Speech**
   - Microphone permission requested via the Web Speech API.
   - A 2-minute countdown timer runs while the user speaks.
   - Speech is transcribed live (read-only text area).
   - On stop / timer end, the transcript is analysed client-side for word count, sentences, WPM, and naive sentiment.
   - Users may skip this section entirely.
3. **Consent**
   - Standard informed-consent screen (unchanged from original).
4. **Model loading**
   - face-api.js models are loaded from `public/models/`.
   - If local models are missing, the app can fall back to a CDN.
5. **Camera initialization**
   - The browser requests camera permission using the MediaDevices API.
   - The video stream is processed locally on a canvas.
6. **Question loop**
   - Each question is displayed with Yes/No/Unsure choices.
   - Emotion probabilities are captured at regular intervals during the question.
7. **Session aggregation**
   - Emotions are aligned to timestamps and question IDs.
   - Free-speech metrics are carried forward.
   - The summary view charts emotion trends, pairs them with answers, and shows free-speech analysis.
8. **No server upload**
   - All data stays in the browser and is cleared after the session.

## Key Features

- **Multi-modal signal collection** (voice, face, self-report)
- **Free speech transcription & analysis** with word count, WPM, and sentiment
- **Clinical interview structure** based on MINI-style questions
- **Real-time emotion inference** with confidence scores
- **Accessible UI** with keyboard navigation and ARIA labels
- **Local-only processing** for privacy and security
- **Actionable summary** with charts and exportable results
- **Skip support** — the app works fully even if free-speech is skipped

## Tech Stack

- React (Hooks)
- Web Speech API (speech-to-text)
- face-api.js (TensorFlow.js under the hood)
- Chart.js (summary charts)
- styled-components
- MediaDevices API for webcam access

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Download face-api.js models**
   Place the following files in `public/models/`:
   - tiny_face_detector_model-weights_manifest.json
   - tiny_face_detector_model-shard1
   - face_expression_model-weights_manifest.json
   - face_expression_model-shard1
   - face_landmark_68_model-weights_manifest.json
   - face_landmark_68_model-shard1

   Source: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

3. **Run the app**
   ```bash
   npm start
   ```

4. **Open the browser**
   Visit `http://localhost:3000`.

## Usage Walkthrough

### 1. Intro Screen
- Read what the demo includes
- Click "Get Started"

### 2. Free Speech Analysis
- Speak in response to the prompt (2-minute timer)
- View live transcription
- Stop recording early or let the timer expire
- Or skip straight to the questionnaire

### 3. Consent Screen
- Review the privacy notes
- Check the consent box to enable camera access
- Start the interview

### 4. Interview Flow
- Answer each question (Yes/No/Unsure)
- Use Next/Previous navigation
- Keyboard shortcuts: 1-3 for answers, Enter to proceed, Escape to go back

### 5. Summary
- Review free-speech metrics (word count, WPM, sentiment)
- Review a question-by-question transcript with detected emotions
- Inspect emotion trends over time
- Export results as JSON

## Project Structure

```
src/
  components/
    IntroScreen.js       # Landing / getting-started page
    FreeSpeechSection.js # Voice recording, timer, transcription
    CameraEmotion.js     # Face detection and emotion inference
    ConsentScreen.js     # Consent UI and permission gating
    QuestionForm.js      # Question flow and response capture
    Summary.js           # Unified visualization and export
    ErrorBoundary.js     # Error handling wrapper
  data/
    questions.json       # MINI-based question set
  hooks/
    useCamera.js         # Camera lifecycle and cleanup
    useCountdownTimer.js # 2-minute countdown timer
    useSpeechToText.js   # Web Speech API wrapper
  services/
    geminiApi.js         # Optional AI integration
  utils/
    speechAnalysis.js    # Client-side text analysis (word count, sentiment)
    tensorflowConfig.js  # TF.js and face-api setup
  App.js                 # Orchestrates full app flow
  index.js               # App entry
```

## Privacy and Security Notes

- **Local inference only**: No facial images, audio, or responses are sent to a server.
- **Voice processed locally**: Speech-to-text runs via the browser's built-in Web Speech API.
- **Temporary session**: Results live in memory and are cleared on reload/close.
- **Standard permission controls**: Users can revoke camera/mic permissions at any time.

## Accessibility

- Full keyboard navigation
- Screen reader friendly structure (ARIA labels)
- Reduced motion support
- Responsive layout for mobile

## Known Limitations

- Web Speech API support varies by browser (best on Chrome / Edge).
- Emotion inference is probabilistic and can be affected by lighting, camera quality, and face angle.
- Sentiment analysis is a simple word-list heuristic, not a trained model.
- Not clinically validated or approved for medical use.

## Build

```bash
npm run build
```

## Medical Disclaimer

This demo is for educational and prototyping purposes only. It is not a diagnostic or medical device. If you have mental health concerns, consult qualified healthcare professionals.

## Troubleshooting

- Ensure camera and microphone permissions are granted.
- Verify model files exist in `public/models/`.
- Use a modern browser with WebRTC, Canvas, and Web Speech API support.
- Refresh the page if detection or transcription stalls.

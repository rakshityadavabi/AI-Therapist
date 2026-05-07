# AI Therapist (web-v2)

A **Vite + React + Tailwind v4 + shadcn-style** rebuild of the Mental Health Screening
demo with a calm, modern SaaS UI.

This app lives alongside the original CRA project (root). It's a parallel rewrite —
the original `src/` and `public/` continue to work untouched.

## Run

```bash
cd web-v2
npm install        # if you haven't already
npm run dev        # starts at http://localhost:5173
npm run build      # production build to dist/
```

> face-api.js models are served from `/models`. The `web-v2/public/models` is a
> symlink into the parent project's `public/models` folder, so they share a single
> on-disk copy. If you move this directory, replace the symlink with a real copy.

## Optional Gemini AI

To enable AI sentiment + clinical write-up, create `web-v2/.env.local`:

```
VITE_GEMINI_API_KEY=your_key_here
```

Without a key, the app uses a fully local fallback for sentiment and analysis.

## Stack

- React 19 + Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- shadcn-style primitives built on `@radix-ui/*` + `class-variance-authority`
- Framer Motion for entrance/exit animations
- face-api.js / @tensorflow/tfjs for facial emotion inference
- Web Speech API for transcription
- Chart.js / react-chartjs-2 (available for future visualisations)

## Structure

```
src/
  components/
    ui/                shadcn-style primitives (Button, Card, Pill, Stepper, …)
    screens/           one component per flow step
    AppShell.jsx       global layout (sticky bar + progress)
    BrandMark.jsx      logo
    CameraEmotion.jsx  face-api.js + photo capture
    ErrorBoundary.jsx  full-screen error fallback
    FlowStepper.jsx    5-step indicator used across screens
  hooks/               useCamera, useSpeechToText, useCountdownTimer
  utils/               speech analysis, DSM-5 scoring, TF backend config
  services/            geminiApi.js
  data/                questions.json (18 MINI-style items)
  lib/utils.js         cn() helper, risk colour map
  App.jsx              flow orchestration
  index.css            Tailwind theme tokens
```

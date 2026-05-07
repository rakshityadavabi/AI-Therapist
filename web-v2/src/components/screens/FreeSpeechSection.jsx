import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { StatusDot } from '../ui/StatusDot';
import { FlowStepper } from '../FlowStepper';
import useSpeechToText from '@/hooks/useSpeechToText';
import useCountdownTimer from '@/hooks/useCountdownTimer';
import { analyzeTranscript } from '@/utils/speechAnalysis';
import { analyzeSentimentWithAI } from '@/services/geminiApi';

const FREE_SPEECH_PROMPT = 'Tell me about yourself — how have you been feeling lately?';
const TIMER_DURATION = 120;

export function FreeSpeechSection({ onComplete, onSkip }) {
  const {
    transcript,
    isListening,
    isSupported,
    start: startRecognition,
    stop: stopRecognition,
  } = useSpeechToText();

  const [hasStarted, setHasStarted] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recordingStartRef = useRef(null);

  const handleTimerComplete = useCallback(() => {
    stopRecognition();
    setIsDone(true);
  }, [stopRecognition]);

  const { remaining, isRunning, start: startTimer, stop: stopTimer, formattedTime } =
    useCountdownTimer(TIMER_DURATION, handleTimerComplete);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    setIsDone(false);
    recordingStartRef.current = Date.now();
    startRecognition();
    startTimer();
  }, [startRecognition, startTimer]);

  const handleStop = useCallback(() => {
    stopRecognition();
    stopTimer();
    setIsDone(true);
  }, [stopRecognition, stopTimer]);

  const handleContinue = useCallback(async () => {
    const elapsed = recordingStartRef.current
      ? (Date.now() - recordingStartRef.current) / 1000
      : 0;
    const results = analyzeTranscript(transcript, elapsed);

    setIsAnalyzing(true);
    try {
      const aiSentiment = await analyzeSentimentWithAI(transcript);
      if (aiSentiment) {
        results.sentiment = aiSentiment;
      } else {
        results.sentiment = { ...results.sentiment, source: 'local' };
      }
    } catch {
      results.sentiment = { ...results.sentiment, source: 'local' };
    } finally {
      setIsAnalyzing(false);
    }

    results.prompt = FREE_SPEECH_PROMPT;
    onComplete(results);
  }, [transcript, onComplete]);

  const warn = remaining <= 30 && isRunning;
  const status = isListening ? 'Listening' : isDone ? 'Stopped' : hasStarted ? 'Paused' : 'Ready';

  return (
    <div className="max-w-[820px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <FlowStepper currentStateId="free_speech" className="mb-10" />

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center"
      >
        <Pill tone="primary" className="mb-3">Step 1 of 5</Pill>
        <h1 className="font-display text-[32px] sm:text-[40px] font-bold tracking-tight text-[var(--color-ink)]">
          Tell me how you have been.
        </h1>
        <p className="mt-3 text-[15px] sm:text-base text-[var(--color-muted)] max-w-xl mx-auto">
          Speak freely for up to 2 minutes. Your voice is transcribed in the browser; response text may be included in the Gemini final report when configured.
        </p>
      </motion.header>

      <Card className="mt-8 overflow-hidden">
        <div className="border-l-[4px] border-[var(--color-primary)] px-7 py-6">
          <div className="eyebrow mb-2">Prompt</div>
          <p className="font-display text-[20px] sm:text-[22px] font-semibold text-[var(--color-ink)] leading-snug">
            {FREE_SPEECH_PROMPT}
          </p>
        </div>
      </Card>

      {!isSupported && (
        <div
          role="alert"
          className="mt-6 rounded-[12px] bg-[var(--color-coral-soft)] border border-[var(--color-coral-border)] px-5 py-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-[var(--color-coral)] shrink-0 mt-0.5" />
          <div className="text-sm text-[#7a2522] leading-relaxed">
            Your browser does not support the Web Speech API. Try Chrome, Edge, or Safari — or skip this section.
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <div
          className="font-display font-bold tabular-nums text-[64px] sm:text-[72px] leading-none tracking-tight transition-colors"
          style={{ color: warn ? 'var(--color-coral)' : 'var(--color-ink)' }}
          aria-live="polite"
        >
          {formattedTime}
        </div>
        <div className="mt-3 inline-flex items-center gap-2">
          <StatusDot
            tone={isListening ? 'primary' : isDone ? 'muted' : 'amber'}
            pulse={isListening}
          />
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            {status}
          </span>
        </div>
      </div>

      <Card className="mt-8 p-6 sm:p-7">
        <div className="flex items-center justify-between mb-3">
          <div className="eyebrow">Live transcript</div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-faint)]">
            <Lock className="h-3 w-3" /> On-device only
          </div>
        </div>
        <textarea
          readOnly
          value={transcript}
          placeholder="Your transcribed speech will appear here…"
          aria-label="Live transcription"
          className="w-full min-h-[180px] resize-y rounded-[10px] border border-[var(--color-border-soft)] bg-[var(--color-surface)]/50 px-4 py-3 text-[15px] leading-relaxed text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] scrollbar-thin"
        />
      </Card>

      <div className="mt-8 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait" initial={false}>
          {!hasStarted && (
            <motion.div key="start" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Button size="lg" onClick={handleStart} disabled={!isSupported}>
                <Mic className="h-4 w-4" /> Start recording
              </Button>
            </motion.div>
          )}
          {hasStarted && !isDone && (
            <motion.div key="stop" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Button size="lg" variant="secondary" onClick={handleStop}>
                <Square className="h-4 w-4" /> Stop recording
              </Button>
            </motion.div>
          )}
          {isDone && (
            <motion.div key="continue" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Button size="lg" onClick={handleContinue} disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing…' : 'Continue'} <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onSkip}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:underline underline-offset-4 transition-colors"
        >
          Skip to questionnaire →
        </button>
      </div>
    </div>
  );
}

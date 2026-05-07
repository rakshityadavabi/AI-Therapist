import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, ArrowRight, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { StatusDot } from '../ui/StatusDot';
import { FlowStepper } from '../FlowStepper';
import useSpeechToText from '@/hooks/useSpeechToText';
import {
  SYMPTOM_QUESTIONS,
  inferDSMScore,
  detectSelfHarmIdeation,
  DSM_COLORS,
} from '@/utils/symptomScoring';
import { cn } from '@/lib/utils';

function InternalStepper({ currentIndex }) {
  return (
    <ol className="flex items-center justify-center gap-2 flex-wrap mb-8">
      {SYMPTOM_QUESTIONS.map((q, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={q.id} className="flex items-center">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center text-base transition-colors border-2',
                done && 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white',
                active && 'bg-white border-[var(--color-primary)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]',
                !done && !active && 'bg-white border-[var(--color-border)] text-[var(--color-faint)]'
              )}
              aria-label={`${q.label} — ${done ? 'completed' : active ? 'current' : 'upcoming'}`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : q.icon}
            </div>
            {i < SYMPTOM_QUESTIONS.length - 1 && (
              <span
                className={cn(
                  'h-px w-6 sm:w-10 mx-1',
                  done ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ScoreCard({ result }) {
  const color = DSM_COLORS[result.score];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 rounded-[12px] border-2 px-6 py-5"
      style={{ borderColor: color, background: `${color}10` }}
      role="region"
      aria-label="Severity score result"
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div className="font-display font-extrabold text-[40px] leading-none" style={{ color }}>
          {result.score}
        </div>
        <div>
          <div className="font-bold text-lg text-[var(--color-ink)]">{result.label}</div>
          <span
            className="inline-block mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white px-2.5 py-0.5 rounded-full"
            style={{ background: color }}
          >
            DSM-5 Severity
          </span>
        </div>
      </div>
      <div className="mt-4 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full transition-colors"
            style={{ background: i <= result.score ? color : 'var(--color-border-soft)' }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-[var(--color-muted)] leading-relaxed">
        <span className="font-semibold text-[var(--color-ink)]">Analysis: </span>
        {result.reasoning}
      </p>
    </motion.div>
  );
}

function SafetyAlert() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="assertive"
      className="mt-5 rounded-[12px] border-2 border-[var(--color-coral-border)] bg-[var(--color-coral-soft)] px-6 py-5"
    >
      <div className="flex items-center gap-2 font-bold text-[var(--color-coral)] uppercase tracking-[0.06em] text-sm">
        <ShieldAlert className="h-5 w-5" /> Safety concern detected
      </div>
      <div className="mt-2 text-sm text-[#7a2522] leading-relaxed">
        Your response may indicate thoughts of self-harm. Your overall risk will be marked{' '}
        <span className="font-semibold">Elevated</span>. You are not alone — immediate support is available:
        <ul className="mt-2 space-y-1 pl-4 list-disc">
          <li><span className="font-semibold">988 Suicide & Crisis Lifeline</span> — call or text 988 (US)</li>
          <li><span className="font-semibold">Crisis Text Line</span> — text HOME to 741741</li>
          <li>International: <span className="underline">iasp.info/resources/Crisis_Centres/</span></li>
        </ul>
      </div>
    </motion.div>
  );
}

export function VoiceSymptomSection({ onComplete, onSkip }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [scoreResult, setScoreResult] = useState(null);
  const [safetyDetails, setSafetyDetails] = useState(null);
  const [phase, setPhase] = useState('record'); // 'record' | 'result' | 'review'
  const [isScoring, setIsScoring] = useState(false);
  const recordingStartRef = useRef(null);

  const {
    transcript,
    isListening,
    isSupported,
    start: startRecognition,
    stop: stopRecognition,
    resetTranscript,
  } = useSpeechToText();

  const currentQ = SYMPTOM_QUESTIONS[currentIndex];
  const totalQuestions = SYMPTOM_QUESTIONS.length;

  const handleStartRecording = useCallback(() => {
    resetTranscript?.();
    recordingStartRef.current = Date.now();
    startRecognition();
  }, [startRecognition, resetTranscript]);

  const handleStopRecording = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  const handleScore = useCallback(async () => {
    stopRecognition();
    setIsScoring(true);
    await new Promise((r) => setTimeout(r, 300));

    const finalTranscript = transcript || '';
    const result = inferDSMScore(currentQ.domain, finalTranscript);
    const safety = currentQ.domain === 'safety' ? detectSelfHarmIdeation(finalTranscript) : null;

    setScoreResult(result);
    setSafetyDetails(safety);
    setPhase('result');
    setIsScoring(false);
  }, [transcript, currentQ, stopRecognition]);

  const handleAcceptResult = useCallback(() => {
    const entry = {
      domain: currentQ.domain,
      label: currentQ.label,
      icon: currentQ.icon,
      transcript: transcript || '',
      score: scoreResult.score,
      dsmLabel: scoreResult.label,
      confidence: scoreResult.confidence,
      reasoning: scoreResult.reasoning,
      matchDetails: scoreResult.matchDetails,
      safetyFlag: safetyDetails?.detected ?? false,
      safetyKeywords: safetyDetails?.matchedKeywords ?? [],
      timestamp: new Date().toISOString(),
    };

    const newResponses = [...responses, entry];
    setResponses(newResponses);

    if (currentIndex < totalQuestions - 1) {
      resetTranscript?.();
      setCurrentIndex((i) => i + 1);
      setScoreResult(null);
      setSafetyDetails(null);
      setPhase('record');
    } else {
      setPhase('review');
    }
  }, [currentQ, transcript, scoreResult, safetyDetails, responses, currentIndex, totalQuestions, resetTranscript]);

  const handleSubmit = useCallback(() => {
    onComplete(responses);
  }, [responses, onComplete]);

  if (phase === 'review') {
    const anySafety = responses.some((r) => r.safetyFlag);
    return (
      <div className="max-w-[860px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <FlowStepper currentStateId="voice_symptoms" className="mb-10" />

        <header className="text-center mb-8">
          <Pill tone="primary" className="mb-3">Review</Pill>
          <h1 className="font-display text-[32px] sm:text-[36px] font-bold text-[var(--color-ink)]">
            Symptom review
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">Review your captured responses before continuing.</p>
        </header>

        {anySafety && <SafetyAlert />}

        <ul className="space-y-3 mt-2">
          {responses.map((r) => {
            const color = DSM_COLORS[r.score];
            return (
              <li
                key={r.domain}
                className="grid grid-cols-[auto_1fr_auto] gap-4 items-start p-4 rounded-[12px] bg-white border border-[var(--color-border-soft)]"
                style={{ borderLeftColor: color, borderLeftWidth: 4 }}
              >
                <span className="text-2xl leading-none mt-0.5">{r.icon}</span>
                <div>
                  <div className="eyebrow text-[var(--color-faint)]">{r.label}</div>
                  <p className="text-sm text-[var(--color-muted)] italic mt-1 leading-relaxed">
                    “{r.transcript || '(no speech)'}”
                  </p>
                </div>
                <span
                  className="self-center text-[10px] font-bold uppercase tracking-[0.08em] text-white px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: color }}
                >
                  {r.score}/4 · {r.dsmLabel}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={handleSubmit}>
            Continue to consent <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <FlowStepper currentStateId="voice_symptoms" className="mb-8" />

      <header className="text-center mb-8">
        <Pill tone="primary" className="mb-3">Step 2 of 5</Pill>
        <h1 className="font-display text-[28px] sm:text-[36px] font-bold text-[var(--color-ink)]">
          Structured symptom assessment
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Answer each question by speaking — responses are transcribed and scored locally.
        </p>
      </header>

      <InternalStepper currentIndex={currentIndex} />

      <Card className="overflow-hidden">
        <div className="bg-[var(--color-primary-soft)] px-6 py-4 flex items-center gap-3">
          <span className="text-2xl leading-none">{currentQ.icon}</span>
          <div className="min-w-0">
            <div className="eyebrow text-[var(--color-primary-hover)]">
              Question {currentIndex + 1} of {totalQuestions} — {currentQ.label}
            </div>
            <p className="font-display text-[17px] sm:text-[18px] font-semibold text-[var(--color-ink)] leading-snug mt-0.5">
              {currentQ.prompt}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <p className="text-sm italic text-[var(--color-muted)] bg-[var(--color-surface)] border-l-2 border-[var(--color-border)] px-4 py-3 rounded">
            {currentQ.hint}
          </p>

          {!isSupported && (
            <div
              role="alert"
              className="mt-4 rounded-[12px] bg-[var(--color-coral-soft)] border border-[var(--color-coral-border)] px-5 py-4 text-sm text-[#7a2522] flex items-start gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-[var(--color-coral)] shrink-0" />
              Web Speech API isn't available in this browser — try Chrome, Edge, or Safari, or skip this section.
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-2.5">
            <StatusDot tone={isListening ? 'coral' : 'muted'} pulse={isListening} />
            <span
              className="text-xs font-semibold uppercase tracking-[0.08em]"
              style={{ color: isListening ? 'var(--color-coral)' : 'var(--color-muted)' }}
            >
              {isListening ? 'Recording…' : phase === 'result' ? 'Done' : 'Ready'}
            </span>
          </div>

          <textarea
            readOnly
            value={transcript}
            placeholder="Your spoken response will appear here…"
            aria-label="Live transcription"
            aria-live="polite"
            className="mt-3 w-full min-h-[120px] resize-y rounded-[10px] border border-[var(--color-border-soft)] bg-[var(--color-surface)]/40 px-4 py-3 text-[15px] leading-relaxed text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)] scrollbar-thin"
          />
          <p className="mt-1 text-[11px] text-[var(--color-faint)] text-center">🔒 Voice processed locally and never uploaded.</p>

          <AnimatePresence>
            {phase === 'result' && scoreResult && <ScoreCard result={scoreResult} />}
          </AnimatePresence>
          <AnimatePresence>
            {phase === 'result' && safetyDetails?.detected && <SafetyAlert />}
          </AnimatePresence>

          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            {phase === 'record' && !isListening && (
              <Button onClick={handleStartRecording} disabled={!isSupported}>
                <Mic className="h-4 w-4" /> Start recording
              </Button>
            )}
            {phase === 'record' && isListening && (
              <Button variant="secondary" onClick={handleStopRecording}>
                <Square className="h-4 w-4" /> Stop recording
              </Button>
            )}
            {phase === 'record' && !isListening && transcript && (
              <Button onClick={handleScore} disabled={isScoring}>
                {isScoring ? 'Analysing…' : 'Analyse response'} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {phase === 'result' && (
              <Button onClick={handleAcceptResult}>
                {currentIndex < totalQuestions - 1 ? 'Next question' : 'Review responses'}{' '}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={onSkip}
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:underline underline-offset-4 transition-colors"
            >
              Skip this section →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

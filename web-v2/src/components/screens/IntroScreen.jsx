import { motion } from 'framer-motion';
import { Mic, Camera, ClipboardList, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';

const FEATURES = [
  {
    icon: Mic,
    title: 'Free-speech analysis',
    body: 'Speak freely about how you have been. Live transcription, pace, and sentiment — all on-device.',
  },
  {
    icon: Camera,
    title: 'Real-time emotion detection',
    body: 'Your webcam reads expressions while you answer using face-api.js — frames never leave your browser.',
  },
  {
    icon: ClipboardList,
    title: 'Clinical-style questionnaire',
    body: '18 MINI-style items combined with structured DSM-5 voice prompts and an integrated risk summary.',
  },
];

export function IntroScreen({ onGetStarted }) {
  return (
    <div className="max-w-[960px] mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="text-center"
      >
        <Pill tone="primary" className="mb-5">
          Demo · Multi-modal screening
        </Pill>
        <h1 className="font-display text-[40px] sm:text-[52px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)] max-w-3xl mx-auto">
          Understand how you have been feeling — privately, in your browser.
        </h1>
        <p className="mt-5 text-[17px] sm:text-lg leading-relaxed text-[var(--color-muted)] max-w-2xl mx-auto">
          AI Therapist combines voice analysis, real-time facial emotion detection, and a clinical-style
          questionnaire to give you a calm, multi-signal snapshot. The app does not store patient records.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={onGetStarted} aria-label="Get started with the screening demo">
            Get started
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
          >
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </motion.div>

      <div id="how-it-works" className="mt-16 grid gap-5 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
          >
            <Card className="p-7 h-full">
              <div className="h-11 w-11 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary-hover)]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--color-ink)]">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{f.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 rounded-[12px] bg-[var(--color-primary-soft)]/70 border border-[var(--color-primary-soft)] px-6 py-5 flex items-center gap-3 flex-wrap">
        <Lock className="h-4 w-4 text-[var(--color-primary-hover)] shrink-0" />
        <p className="text-sm text-[var(--color-ink)] leading-relaxed">
          <span className="font-semibold">Session-only screening.</span>{' '}
          <span className="text-[var(--color-muted)]">
            Camera inference and browser transcription run locally. If Gemini is configured, response text and derived screening signals may be used for the final AI narrative. Your session clears when this tab closes.
          </span>
        </p>
      </div>

      <div className="mt-5 rounded-[12px] bg-[var(--color-amber-soft)] border border-[var(--color-amber-border)] px-6 py-5 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-[#a47314] shrink-0 mt-0.5" />
        <div>
          <div className="eyebrow text-[#a47314]">Important</div>
          <p className="text-sm text-[#5a4108] leading-relaxed mt-1">
            This is an educational research demo, not a medical diagnostic tool. If you are in
            crisis, please contact a qualified professional or call 988 (US) for immediate support.
          </p>
        </div>
      </div>
    </div>
  );
}

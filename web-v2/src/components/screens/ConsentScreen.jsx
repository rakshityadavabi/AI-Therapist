import { useState, useId } from 'react';
import { motion } from 'framer-motion';
import { Info, Lock, Camera, AlertTriangle, Phone, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { Checkbox } from '../ui/Checkbox';
import { FlowStepper } from '../FlowStepper';

function InfoCard({ icon: Icon, title, children }) {
  return (
    <Card className="p-6 sm:p-7">
      <header className="flex items-start gap-3">
        <span className="h-9 w-9 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)] mt-1">{title}</h3>
      </header>
      <div className="mt-4 ml-12 text-[15px] leading-relaxed text-[var(--color-muted)] space-y-2">
        {children}
      </div>
    </Card>
  );
}

export function ConsentScreen({ onConsent, onDecline }) {
  const [hasConsented, setHasConsented] = useState(false);
  const checkboxId = useId();

  return (
    <div className="max-w-[820px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <FlowStepper currentStateId="consent" className="mb-10" />

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Pill tone="primary" className="mb-3">Step 3 of 5</Pill>
        <h1 className="font-display text-[32px] sm:text-[40px] font-bold text-[var(--color-ink)]">
          A few words before we begin.
        </h1>
        <p className="mt-3 text-[var(--color-muted)] max-w-xl mx-auto">
          Please review how AI Therapist uses your camera and microphone, and confirm consent.
        </p>
      </motion.header>

      <div className="space-y-4">
        <InfoCard icon={Info} title="About this screening">
          <p>
            Approximately 5–10 minutes. Includes 18 MINI-style questions, a structured voice-symptom
            assessment, and real-time facial inference. Designed for educational and research use.
          </p>
        </InfoCard>

        <InfoCard icon={Lock} title="Privacy & data security">
          <ul className="space-y-1.5 list-disc pl-5">
            <li>All data processing occurs locally in your browser</li>
            <li>No video, audio, or responses are sent to a server</li>
            <li>Emotion detection runs on-device via face-api.js</li>
            <li>Session data is cleared when the tab closes</li>
            <li>No personally identifying information is collected</li>
          </ul>
        </InfoCard>

        <InfoCard icon={Camera} title="Camera & microphone">
          <p>
            Your webcam feed is used for live emotion inference and is never recorded or uploaded.
            You can stop the session at any time, and access can be revoked from your browser settings.
          </p>
        </InfoCard>

        <InfoCard icon={AlertTriangle} title="Important limitations">
          <ul className="space-y-1.5 list-disc pl-5">
            <li>This is a demonstration tool, not a clinical diagnostic instrument</li>
            <li>Results should not drive medical decisions</li>
            <li>Emotion detection accuracy depends on lighting and camera quality</li>
            <li>Always consult a qualified healthcare provider for mental-health concerns</li>
          </ul>
        </InfoCard>
      </div>

      <div className="mt-6 rounded-[12px] bg-[var(--color-amber-soft)] border border-[var(--color-amber-border)] px-5 py-4 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-[#a47314] shrink-0 mt-0.5" />
        <p className="text-sm text-[#5a4108] leading-relaxed">
          <span className="font-semibold">Medical disclaimer:</span> This screening is for
          educational and demo purposes only and is not intended to diagnose, treat, cure, or
          prevent any condition.
        </p>
      </div>

      <Card
        elevated={false}
        className="mt-6 bg-[var(--color-primary-soft)]/60 border-[var(--color-primary-soft)] p-5 sm:p-6"
      >
        <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            id={checkboxId}
            checked={hasConsented}
            onCheckedChange={(v) => setHasConsented(Boolean(v))}
            className="mt-1"
          />
          <span className="text-[15px] leading-relaxed text-[var(--color-ink)]">
            I have read and understood the above. I consent to participate in this demo. I understand
            camera/mic access is required and that all processing happens on this device.
          </span>
        </label>
      </Card>

      <div className="mt-6 flex justify-end gap-3 flex-wrap">
        <Button variant="secondary" onClick={onDecline}>
          Decline
        </Button>
        <Button onClick={onConsent} disabled={!hasConsented}>
          I consent — start screening <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {!hasConsented && (
        <p className="mt-2 text-xs text-right text-[var(--color-faint)]">
          Please tick the consent box to proceed.
        </p>
      )}

      <div className="mt-10 rounded-[12px] bg-white border border-[var(--color-border-soft)] px-5 py-4 flex items-center gap-3 text-sm text-[var(--color-muted)]">
        <Phone className="h-4 w-4 text-[var(--color-coral)] shrink-0" />
        <span>
          <span className="font-semibold text-[var(--color-ink)]">Need help right now? </span>
          Call or text 988 (US) for immediate crisis support.
        </span>
      </div>
    </div>
  );
}

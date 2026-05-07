import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, IdCard, SkipForward } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { FlowStepper } from '../FlowStepper';

export function PatientInfoScreen({ onComplete }) {
  const [uhid, setUhid] = useState('');

  const submit = (skipped = false) => {
    onComplete({
      uhid: skipped ? '' : uhid.trim(),
      skipped,
      capturedAt: new Date().toISOString(),
      storage: 'not persisted by this app',
    });
  };

  return (
    <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <FlowStepper currentStateId="patient_info" className="mb-10" />

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Pill tone="primary" className="mb-3">Patient identifier</Pill>
        <h1 className="font-display text-[32px] sm:text-[40px] font-bold text-[var(--color-ink)]">
          Enter UHID, or continue without it.
        </h1>
        <p className="mt-3 text-[var(--color-muted)] max-w-xl mx-auto">
          UHID integration is not connected yet. This app does not save a patient record or persist session data.
        </p>
      </motion.header>

      <Card className="p-6 sm:p-7">
        <label htmlFor="uhid" className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
          UHID
        </label>
        <div className="relative">
          <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <input
            id="uhid"
            value={uhid}
            onChange={(event) => setUhid(event.target.value)}
            placeholder="Enter UHID if available"
            className="w-full rounded-[12px] border border-[var(--color-border)] bg-white pl-11 pr-4 py-3 text-[15px] text-[var(--color-ink)] outline-none focus:ring-4 focus:ring-[var(--color-primary-ring)] focus:border-[var(--color-primary)]"
            autoComplete="off"
          />
        </div>
        <p className="mt-3 text-xs text-[var(--color-faint)]">
          The identifier is included only in the current in-browser report/export state and is cleared when the session restarts or the tab closes.
        </p>
      </Card>

      <div className="mt-6 flex justify-end gap-3 flex-wrap">
        <Button variant="secondary" onClick={() => submit(true)}>
          <SkipForward className="h-4 w-4" /> Skip UHID
        </Button>
        <Button onClick={() => submit(false)}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

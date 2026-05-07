import { Stepper } from './ui/Stepper';

const FLOW_STEPS = [
  { id: 'consent', label: 'Consent', icon: 'OK' },
  { id: 'patient_info', label: 'UHID', icon: 'ID' },
  { id: 'free_speech', label: 'Free speech', icon: 'Mic' },
  { id: 'voice_symptoms', label: 'Symptom Q&A', icon: 'Q&A' },
  { id: 'questions', label: 'Interview', icon: 'Cam' },
  { id: 'summary', label: 'Summary', icon: 'AI' },
];

const ID_TO_INDEX = FLOW_STEPS.reduce((acc, s, i) => ({ ...acc, [s.id]: i }), {});

export function FlowStepper({ currentStateId, className }) {
  const activeIndex = ID_TO_INDEX[currentStateId] ?? 0;
  return <Stepper steps={FLOW_STEPS} activeIndex={activeIndex} className={className} />;
}

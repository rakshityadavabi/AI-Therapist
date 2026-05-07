import { Stepper } from './ui/Stepper';

export const FLOW_STEPS = [
  { id: 'free_speech', label: 'Free speech', icon: '🎤' },
  { id: 'voice_symptoms', label: 'Symptom Q&A', icon: '🩺' },
  { id: 'consent', label: 'Consent', icon: '📝' },
  { id: 'questions', label: 'Interview', icon: '🧠' },
  { id: 'summary', label: 'Summary', icon: '✨' },
];

const ID_TO_INDEX = FLOW_STEPS.reduce((acc, s, i) => ({ ...acc, [s.id]: i }), {});

export function FlowStepper({ currentStateId, className }) {
  const activeIndex = ID_TO_INDEX[currentStateId] ?? 0;
  return <Stepper steps={FLOW_STEPS} activeIndex={activeIndex} className={className} />;
}

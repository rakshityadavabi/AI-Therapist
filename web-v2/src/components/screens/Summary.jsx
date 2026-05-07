import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope,
  Mic,
  Sparkles,
  ImageIcon,
  Download,
  RotateCcw,
  ShieldAlert,
  Camera as CameraIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { FlowStepper } from '../FlowStepper';
import { computeIntegratedRisk, DSM_COLORS } from '@/utils/symptomScoring';
import { generateEmotionAnalysis, getApiKey } from '@/services/geminiApi';
import { cn, RISK_COLORS } from '@/lib/utils';

const RISK_BG = {
  Low: '#eaf6ef',
  Moderate: '#fdf3df',
  Elevated: '#fcebd9',
  High: '#fbe0dd',
};

const EMOTION_ICONS = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😠',
  Fearful: '😰',
  Disgusted: '🤢',
  Surprised: '😲',
  Neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fearful: '😰',
  disgusted: '🤢',
  surprised: '😲',
  neutral: '😐',
};

function getEmotionIcon(emotion) {
  return EMOTION_ICONS[emotion] || '😐';
}

function StatTile({ value, label, hint }) {
  return (
    <div className="rounded-[12px] bg-white border border-[var(--color-border-soft)] px-5 py-4 text-center">
      <div className="font-display text-[28px] font-bold text-[var(--color-ink)] tabular-nums leading-none">
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-[var(--color-muted)]">
        {label}
      </div>
      {hint && (
        <div className="mt-1 text-[10px] text-[var(--color-faint)]">{hint}</div>
      )}
    </div>
  );
}

export function Summary({
  answers,
  photoAnalysisResults,
  freeSpeechResults,
  voiceSymptomResults,
  finalReportText,
  finalCombinedJson,
  onRestart,
  onExport,
}) {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

  const geminiApiKey = getApiKey();

  useEffect(() => {
    if (finalReportText) {
      setAiAnalysis(finalReportText);
      return;
    }
    if (!answers || answers.length === 0) return;
    if (!geminiApiKey) {
      setAiAnalysis(
        'AI analysis is unavailable: no Gemini API key was found. Add VITE_GEMINI_API_KEY to your .env to enable.'
      );
      return;
    }
    let cancelled = false;
    (async () => {
      setIsGeneratingAnalysis(true);
      try {
        const analysis = await generateEmotionAnalysis(
          answers,
          photoAnalysisResults,
          freeSpeechResults,
          geminiApiKey
        );
        if (!cancelled) setAiAnalysis(analysis);
      } catch {
        if (!cancelled)
          setAiAnalysis(
            'Analysis temporarily unavailable. Consider speaking with a mental-health professional for personalised guidance.'
          );
      } finally {
        if (!cancelled) setIsGeneratingAnalysis(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [answers, photoAnalysisResults, freeSpeechResults, finalReportText, geminiApiKey]);

  const integratedRisk = useMemo(
    () => computeIntegratedRisk({ voiceSymptomResults, freeSpeechResults, answers }),
    [voiceSymptomResults, freeSpeechResults, answers]
  );

  const photoData = useMemo(() => {
    if (!photoAnalysisResults || photoAnalysisResults.length === 0) {
      return { totalPhotos: 0, successfulAnalysis: 0, averageConfidence: 0, photos: [] };
    }
    const successful = photoAnalysisResults.filter((p) => p.processedEmotion?.faceDetected);
    const avgConf =
      successful.length > 0
        ? successful.reduce((s, p) => s + p.processedEmotion.confidence, 0) / successful.length
        : 0;
    return {
      totalPhotos: photoAnalysisResults.length,
      successfulAnalysis: successful.length,
      averageConfidence: avgConf,
      photos: photoAnalysisResults,
    };
  }, [photoAnalysisResults]);

  const clinicalInsights = useMemo(() => {
    const insights = [];

    if (freeSpeechResults) {
      const wpm = freeSpeechResults.wordsPerMinute ?? 0;
      if (wpm > 0 && wpm < 90)
        insights.push({
          label: 'Speech rate',
          value: `${wpm} WPM (below avg) — may indicate psychomotor slowing or low energy`,
          color: '#dc7a45',
        });
      else if (wpm > 180)
        insights.push({
          label: 'Speech rate',
          value: `${wpm} WPM (elevated) — possible anxiety or flight of ideas`,
          color: '#dc7a45',
        });
      const sentScore = freeSpeechResults.sentiment?.score ?? 0;
      if (sentScore < -0.3)
        insights.push({
          label: 'Speech sentiment',
          value: `Negative (${freeSpeechResults.sentiment?.label}) — corroborates depressive markers`,
          color: '#c2453f',
        });
      else if (sentScore > 0.3)
        insights.push({
          label: 'Speech sentiment',
          value: `Positive (${freeSpeechResults.sentiment?.label}) — patient expressed optimistic language`,
          color: '#4a9d7c',
        });
    }

    if (voiceSymptomResults?.length) {
      voiceSymptomResults.forEach((r) => {
        if (r.score >= 3)
          insights.push({
            label: `${r.label} severity`,
            value: `Score ${r.score}/4 (${r.dsmLabel}) — clinically significant; warrants focused assessment`,
            color: DSM_COLORS[r.score],
          });
        else if (r.score === 2)
          insights.push({
            label: `${r.label} severity`,
            value: `Score ${r.score}/4 (${r.dsmLabel}) — mild-moderate; monitor and reassess`,
            color: DSM_COLORS[r.score],
          });
      });
      const safetyEntry = voiceSymptomResults.find((r) => r.domain === 'safety');
      if (safetyEntry?.safetyFlag) {
        insights.push({
          label: 'Safety risk',
          value:
            'Self-harm ideation keywords detected in verbal response. Immediate safety assessment recommended.',
          color: '#c2453f',
        });
      }
    }

    if (answers?.length) {
      const yesRatio = answers.filter((a) => a.answer === 'Yes').length / answers.length;
      if (yesRatio > 0.6)
        insights.push({
          label: 'Symptom endorsement',
          value: `${Math.round(yesRatio * 100)}% Yes responses — high endorsement across MINI items`,
          color: '#c2453f',
        });
      const unsureRatio = answers.filter((a) => a.answer === 'Unsure').length / answers.length;
      if (unsureRatio > 0.3)
        insights.push({
          label: 'Response uncertainty',
          value: `${Math.round(unsureRatio * 100)}% Unsure responses — patient may benefit from guided clarification`,
          color: '#dc7a45',
        });
    }

    if (answers?.length) {
      const fearfulCount = answers.filter((a) => a.emotionSnapshot?.predominantEmotion === 'Fearful').length;
      const sadCount = answers.filter((a) => a.emotionSnapshot?.predominantEmotion === 'Sad').length;
      if (fearfulCount > answers.length * 0.3)
        insights.push({
          label: 'Facial affect — fear',
          value: `Fearful expression in ${fearfulCount}/${answers.length} responses — consistent with anxiety presentation`,
          color: '#c2453f',
        });
      if (sadCount > answers.length * 0.3)
        insights.push({
          label: 'Facial affect — sadness',
          value: `Sad affect in ${sadCount}/${answers.length} responses — congruent with depressed-mood endorsement`,
          color: '#3580a3',
        });
    }

    if (insights.length === 0)
      insights.push({
        label: 'Overall pattern',
        value: 'No clinically significant markers detected across available modalities.',
        color: '#4a9d7c',
      });

    return insights;
  }, [voiceSymptomResults, freeSpeechResults, answers]);

  const riskColor = RISK_COLORS[integratedRisk.level];
  const riskBg = RISK_BG[integratedRisk.level];

  return (
    <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <FlowStepper currentStateId="summary" className="mb-10" />

      <header className="flex items-end justify-between gap-5 flex-wrap mb-8">
        <div>
          <Pill tone="primary" className="mb-3">Report</Pill>
          <h1 className="font-display text-[34px] sm:text-[44px] font-bold text-[var(--color-ink)] leading-tight">
            Your AI Therapist summary
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Generated {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} · multi-modal
            screening overview · for clinician reference.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" /> Start new session
          </Button>
          <Button onClick={onExport}>
            <Download className="h-4 w-4" /> Export full JSON
          </Button>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-[16px] border-2 px-7 py-7 mb-10"
        style={{ background: riskBg, borderColor: riskColor }}
        role="region"
        aria-label="Integrated risk assessment"
      >
        <div className="flex items-center gap-5 flex-wrap mb-4">
          <div className="font-display font-extrabold text-[64px] leading-none tabular-nums" style={{ color: riskColor }}>
            {integratedRisk.score}
            <span className="text-[20px] text-[var(--color-muted)] font-semibold ml-1">/ 100</span>
          </div>
          <div>
            <div className="eyebrow text-[var(--color-muted)]">Integrated risk</div>
            <div className="font-display text-2xl font-bold text-[var(--color-ink)]">
              {integratedRisk.level} risk
            </div>
            <span
              className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white px-2.5 py-0.5 rounded-full"
              style={{ background: riskColor }}
            >
              Multi-modal score
            </span>
          </div>
        </div>

        <div
          className="h-2.5 bg-white/70 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={integratedRisk.score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${integratedRisk.score}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: riskColor }}
          />
        </div>

        <div className="mt-5">
          <div className="eyebrow text-[var(--color-muted)] mb-2">Contributing factors</div>
          <ul className="space-y-1.5 list-disc pl-5 text-sm text-[var(--color-muted)] leading-relaxed">
            {integratedRisk.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {integratedRisk.safetyOverride && (
          <div className="mt-5 rounded-[12px] bg-[var(--color-coral)] text-white px-5 py-4">
            <div className="font-bold text-sm uppercase tracking-[0.06em] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Safety override — Elevated risk
            </div>
            <p className="text-sm leading-relaxed mt-2 opacity-95">
              Self-harm or suicidal ideation indicators were detected. Conduct a thorough safety assessment.
              Crisis resources: <span className="font-semibold">988 Lifeline</span> (call or text 988 — US),{' '}
              <span className="font-semibold">Crisis Text Line</span> (text HOME to 741741).
            </p>
          </div>
        )}
      </motion.section>

      <Card className="p-6 sm:p-7 mb-10">
        <header className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Clinician notes</h2>
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinicalInsights.map((ins, i) => (
            <div
              key={i}
              className="rounded-[12px] bg-[var(--color-surface)]/60 border border-[var(--color-border-soft)] p-4"
              style={{ borderLeftColor: ins.color, borderLeftWidth: 4 }}
            >
              <div className="eyebrow text-[var(--color-faint)]">{ins.label}</div>
              <p className="mt-1.5 text-sm font-medium text-[var(--color-ink)] leading-relaxed">
                {ins.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {voiceSymptomResults && voiceSymptomResults.length > 0 && (
        <Card className="p-6 sm:p-7 mb-10">
          <header className="flex items-center gap-2 mb-5">
            <Mic className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
              Structured voice symptom assessment
            </h2>
            <span className="ml-auto text-xs text-[var(--color-muted)]">DSM-5 · 0–4</span>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {voiceSymptomResults.map((r) => {
              const c = DSM_COLORS[r.score];
              return (
                <div key={r.domain} className="rounded-[12px] bg-white border-2 overflow-hidden" style={{ borderColor: c }}>
                  <div className="px-4 py-3 flex items-center gap-2 text-white" style={{ background: c }}>
                    <span className="text-lg">{r.icon}</span>
                    <span className="text-[11px] uppercase font-bold tracking-[0.06em]">{r.label}</span>
                    {r.safetyFlag && <ShieldAlert className="h-4 w-4 ml-auto" />}
                  </div>
                  <div className="p-4">
                    <div className="flex items-baseline gap-2.5 mb-2">
                      <span className="font-display text-[32px] font-extrabold leading-none" style={{ color: c }}>
                        {r.score}
                      </span>
                      <span className="font-semibold text-[var(--color-ink)]">{r.dsmLabel}</span>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex-1 h-1.5 rounded-full"
                          style={{ background: i <= r.score ? c : 'var(--color-border-soft)' }}
                        />
                      ))}
                    </div>
                    <p className="text-xs italic text-[var(--color-muted)] border-t border-[var(--color-border-soft)] pt-2.5 leading-relaxed line-clamp-3">
                      “{r.transcript || '(no speech recorded)'}”
                    </p>
                    <p className="text-[11px] text-[var(--color-faint)] mt-2 leading-relaxed">{r.reasoning}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-[16px] bg-[#1f3d38] text-white p-7 sm:p-9 mb-10"
      >
        <header className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[#a8d8c8]" />
          <h2 className="font-display text-xl font-bold">AI-powered emotional analysis</h2>
        </header>
        {isGeneratingAnalysis ? (
          <div className="flex items-center gap-3 text-[#cce8e1] italic">
            <span className="inline-block h-2 w-2 rounded-full bg-[#a8d8c8] animate-pulse" />
            Generating your personalised analysis…
          </div>
        ) : aiAnalysis ? (
          <div className="text-[15px] leading-[1.85] whitespace-pre-wrap text-white/90">
            {aiAnalysis}
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-white/80">
            Your comprehensive emotional analysis is being prepared.
          </p>
        )}
      </motion.section>

      {!aiAnalysis && freeSpeechResults && (
        <Card className="p-6 sm:p-7 mb-10">
          <header className="flex items-center gap-2 mb-4">
            <Mic className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Free speech analysis</h2>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <StatTile value={freeSpeechResults.wordCount ?? '—'} label="Words" />
            <StatTile value={freeSpeechResults.sentenceCount ?? '—'} label="Sentences" />
            <StatTile value={`${freeSpeechResults.speakingDurationSec ?? '—'}s`} label="Duration" />
            <StatTile value={freeSpeechResults.wordsPerMinute ?? '—'} label="Words / min" />
            <StatTile
              value={freeSpeechResults.sentiment?.label ?? '—'}
              label="Sentiment"
              hint={
                freeSpeechResults.sentiment?.source === 'ai'
                  ? `✦ AI · ${freeSpeechResults.sentiment?.score ?? 0}`
                  : freeSpeechResults.sentiment?.source === 'local'
                  ? `Local · ${freeSpeechResults.sentiment?.score ?? 0}`
                  : null
              }
            />
          </div>
          <div className="rounded-[12px] bg-[var(--color-surface)]/60 border border-[var(--color-border-soft)] p-4">
            <div className="eyebrow mb-2">Transcript</div>
            <p className="text-sm leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap">
              {freeSpeechResults.transcribedText || '(no speech detected)'}
            </p>
          </div>
        </Card>
      )}

      {photoData.totalPhotos > 0 && (
        <Card className="p-6 sm:p-7 mb-10">
          <header className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Facial expression analysis</h2>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatTile value={photoData.totalPhotos} label="Photos captured" />
            <StatTile value={photoData.successfulAnalysis} label="Successful analysis" />
            <StatTile value={`${Math.round(photoData.averageConfidence * 100)}%`} label="Avg confidence" />
            <StatTile value={photoData.photos.length} label="Total frames" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photoData.photos.map((p) => (
              <figure key={p.id} className="rounded-[12px] overflow-hidden bg-white border border-[var(--color-border-soft)]">
                <div className="px-3 py-2 text-[11px] font-semibold text-[var(--color-muted)] bg-[var(--color-surface)]/60 border-b border-[var(--color-border-soft)]">
                  Q{p.questionData?.questionNumber} · {p.questionData?.answer}
                </div>
                <img src={p.dataUrl} alt={`Captured during Q${p.questionData?.questionNumber}`} className="w-full h-28 object-cover" />
                <figcaption className="p-3 text-xs">
                  {p.processedEmotion?.faceDetected ? (
                    <span className="flex items-center gap-1.5">
                      <span>{getEmotionIcon(p.processedEmotion.emotion)}</span>
                      <span className="capitalize font-medium text-[var(--color-ink)]">{p.processedEmotion.emotion}</span>
                      <span className="text-[var(--color-muted)]">· {Math.round(p.processedEmotion.confidence * 100)}%</span>
                    </span>
                  ) : (
                    <span className="text-[var(--color-faint)] italic">No face detected</span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-7 mb-10">
        <header className="flex items-center gap-2 mb-4">
          <CameraIcon className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Answer transcript</h2>
        </header>
        <ul className="space-y-2">
          {answers.map((a, i) => (
            <li
              key={a.questionId}
              className={cn(
                'grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 rounded-[10px]',
                i % 2 === 0 ? 'bg-[var(--color-surface)]/40' : 'bg-white border border-[var(--color-border-soft)]'
              )}
            >
              <span className="text-sm text-[var(--color-ink)]">
                <span className="text-[var(--color-faint)] font-semibold mr-2">Q{i + 1}.</span>
                {a.questionText}
              </span>
              <Pill tone={a.answer === 'Yes' ? 'primary' : a.answer === 'No' ? 'outline' : 'amber'} size="sm">
                {a.answer}
              </Pill>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-muted)]">
                <span>{getEmotionIcon(a.emotionSnapshot?.predominantEmotion || 'Neutral')}</span>
                <span className="capitalize">{a.emotionSnapshot?.predominantEmotion || 'Neutral'}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="rounded-[12px] bg-white border border-[var(--color-border-soft)] px-6 py-5 text-xs text-[var(--color-muted)] leading-relaxed">
        <span className="font-semibold text-[var(--color-ink)]">Medical disclaimer:</span> This is a screening
        demo for educational and research prototyping purposes only. It is not a diagnostic or medical device.
        All data is processed locally and never uploaded. If you have mental-health concerns, please consult a
        qualified healthcare professional immediately.
      </div>
    </div>
  );
}

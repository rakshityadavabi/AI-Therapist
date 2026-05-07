import React, { useState, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import useSpeechToText from '../hooks/useSpeechToText';
import {
  SYMPTOM_QUESTIONS,
  inferDSMScore,
  detectSelfHarmIdeation,
  DSM_COLORS,
} from '../utils/symptomScoring';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(231,76,60,0); }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const Container = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px;
  animation: ${fadeIn} 0.35s ease;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 36px;
  padding-bottom: 24px;
  border-bottom: 3px solid #000;
`;

const Title = styled.h1`
  font-size: 26px;
  font-weight: 800;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #555;
  margin: 0;
`;

// ─── Progress stepper ─────────────────────────────────────────────────────────

const Stepper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 36px;
  flex-wrap: wrap;
  row-gap: 8px;
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 16px;
    left: calc(50% + 16px);
    width: calc(100% - 32px);
    height: 2px;
    background: ${p => (p.$done ? '#000' : '#ddd')};
    z-index: 0;
  }
`;

const StepCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${p => (p.$active ? '#000' : p.$done ? '#000' : '#ccc')};
  background: ${p => (p.$done ? '#000' : p.$active ? '#fff' : '#fff')};
  color: ${p => (p.$done ? '#fff' : p.$active ? '#000' : '#ccc')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  z-index: 1;
  position: relative;
  transition: all 0.2s;
`;

const StepLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${p => (p.$active || p.$done ? '#000' : '#aaa')};
  white-space: nowrap;
`;

// ─── Question card ────────────────────────────────────────────────────────────

const QuestionCard = styled.div`
  border: 2.5px solid #000;
  background: #fff;
  margin-bottom: 28px;
  animation: ${fadeIn} 0.3s ease;
`;

const QuestionHeader = styled.div`
  background: #000;
  color: #fff;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QuestionIcon = styled.span`
  font-size: 22px;
`;

const QuestionLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
  margin-bottom: 2px;
`;

const QuestionText = styled.div`
  font-size: 17px;
  font-weight: 700;
`;

const QuestionBody = styled.div`
  padding: 24px;
`;

const HintText = styled.div`
  font-size: 13px;
  color: #888;
  font-style: italic;
  margin-bottom: 20px;
  padding: 10px 14px;
  background: #fafafa;
  border-left: 3px solid #ddd;
`;

// ─── Timer / status ───────────────────────────────────────────────────────────

const RecordingStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
`;

const RecordingDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => (p.$active ? '#e74c3c' : '#ccc')};
  animation: ${p => (p.$active ? pulse : 'none')} 1.2s infinite;
`;

const RecordingLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${p => (p.$active ? '#e74c3c' : '#999')};
`;

const TranscriptArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  border: 2px solid #000;
  padding: 14px 16px;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
  background: #fff;
  color: #222;
  font-family: inherit;
  margin-bottom: 6px;

  &:focus {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

const PrivacyNote = styled.div`
  font-size: 12px;
  color: #aaa;
  text-align: center;
  margin-bottom: 20px;
`;

// ─── Score card (shown after analysis) ───────────────────────────────────────

const ScoreCard = styled.div`
  border: 2px solid ${p => p.$color};
  background: ${p => p.$bg};
  padding: 20px 24px;
  margin-top: 20px;
  animation: ${fadeIn} 0.35s ease;
`;

const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const ScoreBadge = styled.div`
  background: ${p => p.$color};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 5px 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const ScoreNumber = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: ${p => p.$color};
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #222;
`;

const ScoreBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
`;

const ScoreSegment = styled.div`
  flex: 1;
  height: 8px;
  background: ${p => (p.$filled ? p.$color : '#eee')};
  border-radius: 2px;
  transition: background 0.3s;
`;

const ScoreReasoning = styled.div`
  font-size: 13px;
  color: #555;
  line-height: 1.6;
`;

// ─── Safety Alert ─────────────────────────────────────────────────────────────

const SafetyAlert = styled.div`
  border: 2px solid #c0392b;
  background: #fdf0ed;
  padding: 20px 24px;
  margin-top: 20px;
  animation: ${fadeIn} 0.35s ease;
`;

const SafetyAlertTitle = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: #c0392b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SafetyAlertBody = styled.div`
  font-size: 14px;
  color: #444;
  line-height: 1.7;
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
`;

const Btn = styled.button`
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 2px solid #000;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  background: ${p => (p.$primary ? '#000' : '#fff')};
  color: ${p => (p.$primary ? '#fff' : '#000')};

  &:hover {
    background: ${p => (p.$primary ? '#333' : '#f0f0f0')};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

const SkipBtn = styled.button`
  display: block;
  margin: 8px auto 0;
  padding: 9px 22px;
  font-size: 13px;
  font-weight: 500;
  color: #888;
  background: transparent;
  border: 1px solid #ddd;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: #000;
    border-color: #000;
  }

  &:focus {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

// ─── Responses review ─────────────────────────────────────────────────────────

const ReviewList = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 28px;
`;

const ReviewItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
  padding: 14px 16px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-left: 4px solid ${p => p.$color};
`;

const ReviewIcon = styled.div`
  font-size: 20px;
`;

const ReviewBody = styled.div``;

const ReviewDomain = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 3px;
`;

const ReviewTranscript = styled.div`
  font-size: 13px;
  color: #444;
  font-style: italic;
  line-height: 1.5;
`;

const ReviewBadge = styled.div`
  background: ${p => p.$color};
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  align-self: center;
`;

// ─── Unsupported notice ───────────────────────────────────────────────────────

const UnsupportedNotice = styled.div`
  padding: 20px 24px;
  border: 2px solid #c0392b;
  background: #fdf0ed;
  color: #c0392b;
  margin-bottom: 24px;
  font-weight: 500;
`;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * VoiceSymptomSection
 *
 * Walks the user through 5 structured DSM-aligned questions (sleep, interest,
 * mood, anxiety, safety) using the Web Speech API. Each response is
 * transcribed live and auto-scored to a 0-4 severity level on "Continue".
 *
 * Props:
 *   onComplete(results)  – called with array of { domain, label, transcript, score, ... }
 *   onSkip()             – skip the entire section
 */
const VoiceSymptomSection = ({ onComplete, onSkip }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]); // completed responses
  const [scoreResult, setScoreResult] = useState(null); // current question score
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

  // ── Recording controls ──────────────────────────────────────────────────
  const handleStartRecording = useCallback(() => {
    resetTranscript?.();
    recordingStartRef.current = Date.now();
    startRecognition();
  }, [startRecognition, resetTranscript]);

  const handleStopRecording = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  // ── Score the current response ──────────────────────────────────────────
  const handleScore = useCallback(async () => {
    stopRecognition();
    setIsScoring(true);

    // Small delay to ensure final transcript chunk arrives
    await new Promise(r => setTimeout(r, 300));

    const finalTranscript = transcript || '';
    const result = inferDSMScore(currentQ.domain, finalTranscript);
    const safety = currentQ.domain === 'safety' ? detectSelfHarmIdeation(finalTranscript) : null;

    setScoreResult(result);
    setSafetyDetails(safety);
    setPhase('result');
    setIsScoring(false);
  }, [transcript, currentQ, stopRecognition]);

  // ── Accept result and move on ────────────────────────────────────────────
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
      // Advance to next question
      resetTranscript?.();
      setCurrentIndex(i => i + 1);
      setScoreResult(null);
      setSafetyDetails(null);
      setPhase('record');
    } else {
      // All done — show review
      setPhase('review');
    }
  }, [currentQ, transcript, scoreResult, safetyDetails, responses, currentIndex, totalQuestions, resetTranscript]);

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    onComplete(responses);
  }, [responses, onComplete]);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderScoreCard = () => {
    if (!scoreResult) return null;
    const color = DSM_COLORS[scoreResult.score];
    const bg = `${color}18`;
    return (
      <ScoreCard $color={color} $bg={bg} role="region" aria-label="Severity score result">
        <ScoreRow>
          <ScoreNumber $color={color}>{scoreResult.score}</ScoreNumber>
          <div>
            <ScoreLabel>{scoreResult.label}</ScoreLabel>
            <ScoreBadge $color={color}>DSM-5 Severity</ScoreBadge>
          </div>
        </ScoreRow>
        <ScoreBar>
          {[0, 1, 2, 3, 4].map(i => (
            <ScoreSegment key={i} $filled={i <= scoreResult.score} $color={color} />
          ))}
        </ScoreBar>
        <ScoreReasoning>
          <strong>Analysis:</strong> {scoreResult.reasoning}
        </ScoreReasoning>
      </ScoreCard>
    );
  };

  const renderSafetyAlert = () => {
    if (!safetyDetails?.detected) return null;
    return (
      <SafetyAlert role="alert" aria-live="assertive">
        <SafetyAlertTitle>
          <span>🚨</span> Safety Concern Detected
        </SafetyAlertTitle>
        <SafetyAlertBody>
          Your response may indicate thoughts of self-harm or suicidal ideation. 
          Your overall risk will be automatically classified as <strong>Elevated</strong>. 
          <br /><br />
          <strong>Please remember:</strong> You are not alone. Immediate support is available:
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li><strong>988 Suicide &amp; Crisis Lifeline</strong> — call or text 988 (US)</li>
            <li><strong>Crisis Text Line</strong> — text HOME to 741741</li>
            <li><strong>International Association for Suicide Prevention</strong> — https://www.iasp.info/resources/Crisis_Centres/</li>
          </ul>
          No patient record is stored by this demo. If Gemini AI is configured, text responses may be used for report generation.
        </SafetyAlertBody>
      </SafetyAlert>
    );
  };

  // ─── Phase: Review (all questions done, confirm before submitting) ─────────
  if (phase === 'review') {
    const anySafety = responses.some(r => r.safetyFlag);
    return (
      <Container role="region" aria-label="Voice symptom review">
        <Header>
          <Title>Symptom Review</Title>
          <Subtitle>Review your captured responses before continuing</Subtitle>
        </Header>

        {anySafety && (
          <SafetyAlert role="alert">
            <SafetyAlertTitle><span>🚨</span> Safety Override Active</SafetyAlertTitle>
            <SafetyAlertBody>
              Self-harm indicators were detected. Your overall risk assessment will be marked <strong>Elevated</strong>.
              Please reach out to a mental health professional or crisis line immediately.
            </SafetyAlertBody>
          </SafetyAlert>
        )}

        <ReviewList>
          {responses.map((r, i) => (
            <ReviewItem key={r.domain} $color={DSM_COLORS[r.score]}>
              <ReviewIcon>{r.icon}</ReviewIcon>
              <ReviewBody>
                <ReviewDomain>{r.label}</ReviewDomain>
                <ReviewTranscript>"{r.transcript || '(no speech)'}"</ReviewTranscript>
              </ReviewBody>
              <ReviewBadge $color={DSM_COLORS[r.score]}>
                {r.score}/4 — {r.dsmLabel}
              </ReviewBadge>
            </ReviewItem>
          ))}
        </ReviewList>

        <ButtonRow>
          <Btn $primary onClick={handleSubmit}>
            Continue to Consent →
          </Btn>
        </ButtonRow>
      </Container>
    );
  }

  // ─── Phase: Record / Result per question ──────────────────────────────────
  return (
    <Container role="region" aria-label="Structured voice symptom assessment">
      <Header>
        <Title>Structured Symptom Assessment</Title>
        <Subtitle>
          Answer each question by speaking — responses are transcribed and scored locally
        </Subtitle>
      </Header>

      {/* Stepper */}
      <Stepper aria-label="Question progress">
        {SYMPTOM_QUESTIONS.map((q, i) => (
          <Step key={q.id} $done={i < currentIndex}>
            <StepCircle $active={i === currentIndex} $done={i < currentIndex}>
              {i < currentIndex ? '✓' : q.icon}
            </StepCircle>
            <StepLabel $active={i === currentIndex} $done={i < currentIndex}>
              {q.label.split(' ')[0]}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Question */}
      <QuestionCard>
        <QuestionHeader>
          <QuestionIcon>{currentQ.icon}</QuestionIcon>
          <div>
            <QuestionLabel>
              Question {currentIndex + 1} of {totalQuestions} — {currentQ.label}
            </QuestionLabel>
            <QuestionText>{currentQ.prompt}</QuestionText>
          </div>
        </QuestionHeader>

        <QuestionBody>
          <HintText>{currentQ.hint}</HintText>

          {!isSupported && (
            <UnsupportedNotice role="alert">
              Your browser does not support the Web Speech API.
              Please use Chrome, Edge, or Safari. You can skip this section.
            </UnsupportedNotice>
          )}

          {/* Live recording status */}
          <RecordingStatus>
            <RecordingDot $active={isListening} />
            <RecordingLabel $active={isListening}>
              {isListening ? 'Recording…' : phase === 'result' ? 'Done' : 'Ready'}
            </RecordingLabel>
          </RecordingStatus>

          {/* Transcript */}
          <TranscriptArea
            readOnly
            value={transcript}
            placeholder="Your spoken response will appear here…"
            aria-label="Live transcription"
            aria-live="polite"
          />
          <PrivacyNote>Voice is transcribed in the browser. If Gemini AI is configured, response text may be included in the final AI report.</PrivacyNote>

          {/* Score result panel (after scoring) */}
          {phase === 'result' && renderScoreCard()}
          {phase === 'result' && renderSafetyAlert()}

          {/* Controls */}
          <ButtonRow>
            {phase === 'record' && !isListening && (
              <Btn
                $primary
                onClick={handleStartRecording}
                disabled={!isSupported}
                aria-label="Start recording response"
              >
                ● Start Recording
              </Btn>
            )}

            {phase === 'record' && isListening && (
              <Btn onClick={handleStopRecording} aria-label="Stop recording">
                ■ Stop Recording
              </Btn>
            )}

            {phase === 'record' && !isListening && transcript && (
              <Btn
                $primary
                onClick={handleScore}
                disabled={isScoring}
                aria-label="Analyse response"
              >
                {isScoring ? 'Analysing…' : 'Analyse Response →'}
              </Btn>
            )}

            {phase === 'result' && (
              <Btn
                $primary
                onClick={handleAcceptResult}
                aria-label={currentIndex < totalQuestions - 1 ? 'Next question' : 'Review all responses'}
              >
                {currentIndex < totalQuestions - 1 ? 'Next Question →' : 'Review Responses →'}
              </Btn>
            )}
          </ButtonRow>

          <SkipBtn onClick={onSkip} aria-label="Skip structured symptom assessment">
            Skip this section →
          </SkipBtn>
        </QuestionBody>
      </QuestionCard>
    </Container>
  );
};

export default VoiceSymptomSection;

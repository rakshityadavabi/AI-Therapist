import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import useSpeechToText from '../hooks/useSpeechToText';
import useCountdownTimer from '../hooks/useCountdownTimer';
import { analyzeTranscript } from '../utils/speechAnalysis';
import { analyzeSentimentWithAI } from '../services/geminiApi';

/* ──── configurable prompt ──── */
const FREE_SPEECH_PROMPT = 'Tell me about yourself — how have you been feeling lately?';
const TIMER_DURATION = 120; // seconds

/* ───────── styled-components ───────── */

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000000;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 640px) {
    font-size: 22px;
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin: 0;
`;

const PromptCard = styled.div`
  border: 2px solid #000;
  padding: 24px;
  margin-bottom: 28px;
  background: #fafafa;
  text-align: center;
`;

const PromptLabel = styled.div`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 10px;
`;

const PromptText = styled.div`
  font-size: 22px;
  font-weight: 600;
  color: #000;

  @media (max-width: 640px) {
    font-size: 18px;
  }
`;

const TimerDisplay = styled.div`
  text-align: center;
  font-size: 48px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${p => (p.$warn ? '#c0392b' : '#000')};
  margin-bottom: 20px;
  letter-spacing: 2px;

  @media (max-width: 640px) {
    font-size: 36px;
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border: 1px solid ${p => (p.$active ? '#27ae60' : '#999')};
  color: ${p => (p.$active ? '#27ae60' : '#999')};
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
`;

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => (p.$active ? '#27ae60' : '#999')};
  display: inline-block;
  animation: ${p => (p.$active ? 'pulse 1.2s infinite' : 'none')};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;

const TranscriptArea = styled.textarea`
  width: 100%;
  min-height: 180px;
  border: 2px solid #000;
  padding: 16px;
  font-size: 16px;
  line-height: 1.6;
  resize: vertical;
  background: #fff;
  color: #222;
  font-family: inherit;

  &:focus {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

const PrivacyNotice = styled.div`
  font-size: 13px;
  color: #888;
  text-align: center;
  margin: 10px 0 24px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const Btn = styled.button`
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 2px solid #000;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${p => (p.$primary ? '#000' : '#fff')};
  color: ${p => (p.$primary ? '#fff' : '#000')};

  &:hover {
    background: ${p => (p.$primary ? '#333' : '#f0f0f0')};
  }

  &:focus {
    outline: 2px solid #000;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SkipBtn = styled.button`
  display: block;
  margin: 0 auto;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  background: transparent;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #000;
    border-color: #000;
  }

  &:focus {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

const UnsupportedNotice = styled.div`
  padding: 24px;
  border: 2px solid #c0392b;
  background: #fdf0ef;
  color: #c0392b;
  text-align: center;
  margin-bottom: 24px;
  font-weight: 500;
`;

/* ───────── component ───────── */

/**
 * FreeSpeechSection
 *
 * Displays an open-ended prompt, records speech via the Web Speech API,
 * runs a 2-minute countdown, and passes analysis results upstream.
 *
 * Props:
 *   onComplete(analysisResults)  – called with the analysis object
 *   onSkip()                     – called when the user skips
 */
const FreeSpeechSection = ({ onComplete, onSkip }) => {
  const {
    transcript,
    isListening,
    isSupported,
    start: startRecognition,
    stop: stopRecognition,
  } = useSpeechToText();

  const [hasStarted, setHasStarted] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const recordingStartRef = useRef(null);

  // ── Timer ──
  const handleTimerComplete = useCallback(() => {
    stopRecognition();
    setIsDone(true);
  }, [stopRecognition]);

  const { remaining, isRunning, start: startTimer, stop: stopTimer, formattedTime } =
    useCountdownTimer(TIMER_DURATION, handleTimerComplete);

  // ── Actions ──
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleContinue = useCallback(async () => {
    const elapsed = recordingStartRef.current
      ? (Date.now() - recordingStartRef.current) / 1000
      : 0;
    const results = analyzeTranscript(transcript, elapsed);

    // Primary: use Gemini AI for sentiment. Fallback: local analysis.
    setIsAnalyzing(true);
    try {
      const aiSentiment = await analyzeSentimentWithAI(transcript);
      if (aiSentiment) {
        results.sentiment = aiSentiment; // already has source: 'ai'
      } else {
        // Mark local result so Summary can show the source
        results.sentiment = { ...results.sentiment, source: 'local' };
        console.warn('[Sentiment] Using local fallback analysis');
      }
    } catch (err) {
      results.sentiment = { ...results.sentiment, source: 'local' };
      console.warn('[Sentiment] AI failed, using local fallback:', err);
    } finally {
      setIsAnalyzing(false);
    }

    // Attach prompt for traceability and send upstream
    results.prompt = FREE_SPEECH_PROMPT;
    onComplete(results);
  }, [transcript, onComplete]);

  const warn = remaining <= 30 && isRunning;

  // ── Render ──
  return (
    <Container role="region" aria-label="Free speech voice analysis">
      <Header>
        <Title>Free Speech Analysis</Title>
        <Subtitle>Speak freely — your voice is processed locally and not uploaded</Subtitle>
      </Header>

      <PromptCard>
        <PromptLabel>Prompt</PromptLabel>
        <PromptText>{FREE_SPEECH_PROMPT}</PromptText>
      </PromptCard>

      {!isSupported && (
        <UnsupportedNotice role="alert">
          Your browser does not support the Web Speech API.
          Please use a recent version of Chrome, Edge, or Safari.
          You can skip this section and proceed to the questionnaire.
        </UnsupportedNotice>
      )}

      {/* Timer */}
      <TimerDisplay $warn={warn} aria-live="polite" aria-label={`Time remaining: ${formattedTime}`}>
        {formattedTime}
      </TimerDisplay>

      {/* Status */}
      <div style={{ textAlign: 'center' }}>
        <StatusBadge $active={isListening}>
          <Dot $active={isListening} />
          {isListening ? 'Listening' : isDone ? 'Stopped' : 'Ready'}
        </StatusBadge>
      </div>

      {/* Transcript */}
      <TranscriptArea
        readOnly
        value={transcript}
        placeholder="Your transcribed speech will appear here…"
        aria-label="Live transcription"
      />

      <PrivacyNotice>
        🔒 Voice is processed locally and not uploaded.
      </PrivacyNotice>

      {/* Controls */}
      <ButtonRow>
        {!hasStarted && (
          <Btn
            $primary
            onClick={handleStart}
            disabled={!isSupported}
            aria-label="Start recording"
          >
            Start Recording
          </Btn>
        )}

        {hasStarted && !isDone && (
          <Btn onClick={handleStop} aria-label="Stop recording">
            Stop Recording
          </Btn>
        )}

        {isDone && (
          <Btn $primary onClick={handleContinue} disabled={isAnalyzing} aria-label="Continue to questionnaire">
            {isAnalyzing ? 'Analyzing…' : 'Continue'}
          </Btn>
        )}
      </ButtonRow>

      <SkipBtn onClick={onSkip} aria-label="Skip free speech section">
        Skip to Questionnaire →
      </SkipBtn>
    </Container>
  );
};

export default FreeSpeechSection;

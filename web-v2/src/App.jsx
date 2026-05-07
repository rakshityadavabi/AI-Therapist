import { useState, useCallback, useRef } from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IntroScreen } from './components/screens/IntroScreen';
import { FreeSpeechSection } from './components/screens/FreeSpeechSection';
import { VoiceSymptomSection } from './components/screens/VoiceSymptomSection';
import { ConsentScreen } from './components/screens/ConsentScreen';
import { QuestionScreen } from './components/screens/QuestionScreen';
import { Summary } from './components/screens/Summary';
import { generateEmotionAnalysis, getApiKey } from './services/geminiApi';
import questionsData from './data/questions.json';

const APP_STATES = {
  INTRO: 'intro',
  FREE_SPEECH: 'free_speech',
  VOICE_SYMPTOMS: 'voice_symptoms',
  CONSENT: 'consent',
  QUESTIONS: 'questions',
  SUMMARY: 'summary',
};

export default function App() {
  const [currentState, setCurrentState] = useState(APP_STATES.INTRO);
  const [freeSpeechResults, setFreeSpeechResults] = useState(null);
  const [voiceSymptomResults, setVoiceSymptomResults] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const photoCaptureRef = useRef({});
  const [photoAnalysisResults, setPhotoAnalysisResults] = useState([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [finalReportText, setFinalReportText] = useState(null);
  const [finalCombinedJson, setFinalCombinedJson] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);

  const handleGetStarted = useCallback(() => setCurrentState(APP_STATES.FREE_SPEECH), []);

  const handleFreeSpeechComplete = useCallback((results) => {
    setFreeSpeechResults(results);
    setCurrentState(APP_STATES.VOICE_SYMPTOMS);
  }, []);

  const handleFreeSpeechSkip = useCallback(() => {
    setFreeSpeechResults(null);
    setCurrentState(APP_STATES.VOICE_SYMPTOMS);
  }, []);

  const handleVoiceSymptomComplete = useCallback((results) => {
    setVoiceSymptomResults(results);
    setCurrentState(APP_STATES.CONSENT);
  }, []);

  const handleVoiceSymptomSkip = useCallback(() => {
    setVoiceSymptomResults(null);
    setCurrentState(APP_STATES.CONSENT);
  }, []);

  const handleConsent = useCallback(() => setCurrentState(APP_STATES.QUESTIONS), []);
  const handleConsentDecline = useCallback(() => {
    alert(
      'Thank you for your time. If you need mental-health support, please contact a healthcare professional or call 988 (US).'
    );
  }, []);

  const handleAnswerSelect = useCallback(
    (answer) => {
      const currentQuestion = questionsData[currentQuestionIndex];
      const emotionSnapshot = currentEmotion
        ? {
            predominantEmotion: currentEmotion.emotion,
            confidence: currentEmotion.confidence,
            timestamp: currentEmotion.timestamp,
            allExpressions: currentEmotion.allExpressions,
          }
        : null;

      const answerData = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        answer,
        emotionSnapshot,
        timestamp: new Date().toISOString(),
      };

      setAnswers((prev) => {
        const existingIdx = prev.findIndex((a) => a.questionId === currentQuestion.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = answerData;
          return next;
        }
        return [...prev, answerData];
      });
    },
    [currentQuestionIndex, currentEmotion]
  );

  const handleNext = useCallback(async () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex((p) => p + 1);
      return;
    }

    try {
      setIsProcessingPhotos(true);
      let analysisResults = null;
      if (photoCaptureRef.current && photoCaptureRef.current.processCapturedPhotos) {
        analysisResults = await photoCaptureRef.current.processCapturedPhotos();
        if (analysisResults) setPhotoAnalysisResults(analysisResults);
      }

      // Close any still-open behavioural segment, then snapshot the session.
      photoCaptureRef.current?.endQuestion?.({ reason: 'session-end' });
      const behavioralSession = photoCaptureRef.current?.getSessionSummary?.() ?? null;

      try {
        const apiKey = getApiKey();
        if (apiKey) {
          const report = await generateEmotionAnalysis(
            answers,
            analysisResults || [],
            freeSpeechResults,
            apiKey,
            { behavioralSession }
          );
          setFinalReportText(report);
          setFinalCombinedJson({
            timestamp: new Date().toISOString(),
            answers,
            photoAnalysisResults: analysisResults || [],
            freeSpeechResults,
            voiceSymptomResults,
            behavioralSession,
            aiReport: report,
          });
        } else {
          setFinalCombinedJson({
            timestamp: new Date().toISOString(),
            answers,
            photoAnalysisResults: analysisResults || [],
            freeSpeechResults,
            voiceSymptomResults,
            behavioralSession,
            aiReport: null,
          });
        }
      } catch (err) {
        console.warn('Gemini analysis failed or unavailable:', err);
      }

      setCurrentState(APP_STATES.SUMMARY);
    } catch (error) {
      console.error('Failed to process photos:', error);
      setCurrentState(APP_STATES.SUMMARY);
    } finally {
      setIsProcessingPhotos(false);
    }
  }, [currentQuestionIndex, answers, freeSpeechResults, voiceSymptomResults]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((p) => p - 1);
  }, [currentQuestionIndex]);

  const handleRestart = useCallback(() => {
    setCurrentState(APP_STATES.INTRO);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setFreeSpeechResults(null);
    setVoiceSymptomResults(null);
    setPhotoAnalysisResults([]);
    setFinalReportText(null);
    setFinalCombinedJson(null);
  }, []);

  const handleExport = useCallback(() => {
    try {
      const exportPayload =
        finalCombinedJson || {
          timestamp: new Date().toISOString(),
          totalQuestions: questionsData.length,
          answers,
          photoAnalysisResults,
          freeSpeechResults,
          voiceSymptomResults,
          summary: {
            yesCount: answers.filter((a) => a.answer === 'Yes').length,
            noCount: answers.filter((a) => a.answer === 'No').length,
            unsureCount: answers.filter((a) => a.answer === 'Unsure').length,
            emotionFrequency: answers.reduce((acc, a) => {
              const e = a.emotionSnapshot?.predominantEmotion || 'Neutral';
              acc[e] = (acc[e] || 0) + 1;
              return acc;
            }, {}),
          },
          aiReport: finalReportText || null,
        };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mental-health-screening-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export data. Please try again.');
    }
  }, [answers, finalCombinedJson, finalReportText, freeSpeechResults, photoAnalysisResults, voiceSymptomResults]);

  const getProgress = () => {
    switch (currentState) {
      case APP_STATES.INTRO:
        return 0;
      case APP_STATES.FREE_SPEECH:
        return 8;
      case APP_STATES.VOICE_SYMPTOMS:
        return 18;
      case APP_STATES.CONSENT:
        return 28;
      case APP_STATES.QUESTIONS:
        return 28 + ((currentQuestionIndex + 1) / questionsData.length) * 64;
      case APP_STATES.SUMMARY:
        return 100;
      default:
        return 0;
    }
  };

  const currentQuestion = questionsData[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id)?.answer;
  const canGoNext = currentAnswer !== undefined;
  const canGoPrevious = currentQuestionIndex > 0;
  const isLastQuestion = currentQuestionIndex === questionsData.length - 1;

  return (
    <ErrorBoundary onRestart={handleRestart}>
      <AppShell progress={getProgress()}>
        {currentState === APP_STATES.INTRO && <IntroScreen onGetStarted={handleGetStarted} />}

        {currentState === APP_STATES.FREE_SPEECH && (
          <FreeSpeechSection onComplete={handleFreeSpeechComplete} onSkip={handleFreeSpeechSkip} />
        )}

        {currentState === APP_STATES.VOICE_SYMPTOMS && (
          <VoiceSymptomSection onComplete={handleVoiceSymptomComplete} onSkip={handleVoiceSymptomSkip} />
        )}

        {currentState === APP_STATES.CONSENT && (
          <ConsentScreen onConsent={handleConsent} onDecline={handleConsentDecline} />
        )}

        {currentState === APP_STATES.QUESTIONS && currentQuestion && (
          <QuestionScreen
            question={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questionsData.length}
            selectedAnswer={currentAnswer}
            onAnswerSelect={handleAnswerSelect}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            isLastQuestion={isLastQuestion}
            photoCapture={photoCaptureRef.current}
            isProcessingPhotos={isProcessingPhotos}
            setCurrentEmotion={setCurrentEmotion}
          />
        )}

        {currentState === APP_STATES.SUMMARY && (
          <Summary
            answers={answers}
            photoAnalysisResults={photoAnalysisResults}
            freeSpeechResults={freeSpeechResults}
            voiceSymptomResults={voiceSymptomResults}
            finalReportText={finalReportText}
            finalCombinedJson={finalCombinedJson}
            onRestart={handleRestart}
            onExport={handleExport}
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}

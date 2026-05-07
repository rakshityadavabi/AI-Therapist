import { useState, useCallback, useRef } from 'react';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IntroScreen } from './components/screens/IntroScreen';
import { FreeSpeechSection } from './components/screens/FreeSpeechSection';
import { VoiceSymptomSection } from './components/screens/VoiceSymptomSection';
import { ConsentScreen } from './components/screens/ConsentScreen';
import { PatientInfoScreen } from './components/screens/PatientInfoScreen';
import { QuestionScreen } from './components/screens/QuestionScreen';
import { Summary } from './components/screens/Summary';
import { generateEmotionAnalysis, getApiKey } from './services/geminiApi';
import { summarizeFacialSignals } from './utils/emotionAnalysis';
import questionsData from './data/questions.json';

const APP_STATES = {
  INTRO: 'intro',
  FREE_SPEECH: 'free_speech',
  VOICE_SYMPTOMS: 'voice_symptoms',
  CONSENT: 'consent',
  PATIENT_INFO: 'patient_info',
  QUESTIONS: 'questions',
  SUMMARY: 'summary',
};

export default function App() {
  const [currentState, setCurrentState] = useState(APP_STATES.INTRO);
  const [freeSpeechResults, setFreeSpeechResults] = useState(null);
  const [voiceSymptomResults, setVoiceSymptomResults] = useState(null);
  const [patientMeta, setPatientMeta] = useState({ uhid: '', skipped: true });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const photoCaptureRef = useRef({});
  const [photoAnalysisResults, setPhotoAnalysisResults] = useState([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [finalReportText, setFinalReportText] = useState(null);
  const [finalCombinedJson, setFinalCombinedJson] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);

  const handleGetStarted = useCallback(() => setCurrentState(APP_STATES.CONSENT), []);

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
    setCurrentState(APP_STATES.QUESTIONS);
  }, []);

  const handleVoiceSymptomSkip = useCallback(() => {
    setVoiceSymptomResults(null);
    setCurrentState(APP_STATES.QUESTIONS);
  }, []);

  const handleConsent = useCallback(() => setCurrentState(APP_STATES.PATIENT_INFO), []);
  const handleConsentDecline = useCallback(() => {
    alert(
      'Thank you for your time. If you need mental-health support, please contact a healthcare professional or call 988 (US).'
    );
  }, []);

  const handlePatientInfoComplete = useCallback((meta) => {
    setPatientMeta(meta || { uhid: '', skipped: true });
    setCurrentState(APP_STATES.FREE_SPEECH);
  }, []);

  const handleAnswerSelect = useCallback(
    (answer, capturedPhoto = null) => {
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
        emotionAggregate: capturedPhoto?.emotionAggregate || null,
        photoId: capturedPhoto?.id || null,
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

      try {
        const apiKey = getApiKey();
        if (apiKey) {
          const report = await generateEmotionAnalysis(
            answers,
            analysisResults || [],
            freeSpeechResults,
            apiKey,
            { voiceSymptomResults, patientMeta }
          );
          const facialSummary = summarizeFacialSignals(answers, analysisResults || []);
          setFinalReportText(report);
          setFinalCombinedJson({
            timestamp: new Date().toISOString(),
            patientMeta: {
              uhid: patientMeta?.uhid || null,
              uhidProvided: Boolean(patientMeta?.uhid),
              uhidSkipped: Boolean(patientMeta?.skipped),
              storage: 'not persisted by this app',
            },
            answers,
            photoAnalysisResults: analysisResults || [],
            facialSummary,
            freeSpeechResults,
            voiceSymptomResults,
            aiReport: report,
          });
        } else {
          const facialSummary = summarizeFacialSignals(answers, analysisResults || []);
          setFinalCombinedJson({
            timestamp: new Date().toISOString(),
            patientMeta: {
              uhid: patientMeta?.uhid || null,
              uhidProvided: Boolean(patientMeta?.uhid),
              uhidSkipped: Boolean(patientMeta?.skipped),
              storage: 'not persisted by this app',
            },
            answers,
            photoAnalysisResults: analysisResults || [],
            facialSummary,
            freeSpeechResults,
            voiceSymptomResults,
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
  }, [currentQuestionIndex, answers, freeSpeechResults, voiceSymptomResults, patientMeta]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((p) => p - 1);
  }, [currentQuestionIndex]);

  const handleRestart = useCallback(() => {
    setCurrentState(APP_STATES.INTRO);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setFreeSpeechResults(null);
    setVoiceSymptomResults(null);
    setPatientMeta({ uhid: '', skipped: true });
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
          patientMeta: {
            uhid: patientMeta?.uhid || null,
            uhidProvided: Boolean(patientMeta?.uhid),
            uhidSkipped: Boolean(patientMeta?.skipped),
            storage: 'not persisted by this app',
          },
          facialSummary: summarizeFacialSignals(answers, photoAnalysisResults),
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
  }, [answers, finalCombinedJson, finalReportText, freeSpeechResults, photoAnalysisResults, voiceSymptomResults, patientMeta]);

  const getProgress = () => {
    switch (currentState) {
      case APP_STATES.INTRO:
        return 0;
      case APP_STATES.FREE_SPEECH:
        return 18;
      case APP_STATES.VOICE_SYMPTOMS:
        return 30;
      case APP_STATES.CONSENT:
        return 8;
      case APP_STATES.PATIENT_INFO:
        return 14;
      case APP_STATES.QUESTIONS:
        return 38 + ((currentQuestionIndex + 1) / questionsData.length) * 54;
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

        {currentState === APP_STATES.PATIENT_INFO && (
          <PatientInfoScreen onComplete={handlePatientInfoComplete} />
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
            photoCaptureRef={photoCaptureRef}
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
            patientMeta={patientMeta}
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

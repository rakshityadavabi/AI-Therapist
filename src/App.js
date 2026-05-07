import React, { useState, useCallback, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import ConsentScreen from './components/ConsentScreen';
import QuestionForm from './components/QuestionForm';
import Summary from './components/Summary';
import CameraEmotion from './components/CameraEmotion';
import ErrorBoundary from './components/ErrorBoundary';
import IntroScreen from './components/IntroScreen';
import FreeSpeechSection from './components/FreeSpeechSection';
import VoiceSymptomSection from './components/VoiceSymptomSection';
import PatientInfoScreen from './components/PatientInfoScreen';
import questionsData from './data/questions.json';
import { summarizeFacialSignals } from './utils/emotionAnalysis';

// Global styles for accessibility and mobile responsiveness
const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #ffffff;
    min-height: 100vh;
    color: #212529;
    line-height: 1.6;
  }

  /* Focus styles for accessibility */
  *:focus {
    outline: 2px solid #000000;
    outline-offset: 2px;
  }

  /* Skip to content link for screen readers */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000000;
    color: white;
    padding: 8px;
    text-decoration: none;
    border-radius: 4px;
    z-index: 1000;
  }

  .skip-link:focus {
    top: 6px;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    * {
      border-color: ButtonText !important;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Print styles */
  @media print {
    body {
      background: white !important;
    }
  }
`;

const AppContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 10px;
    align-items: flex-start;
    padding-top: 20px;
  }
`;

const MainContent = styled.main`
  width: 100%;
  max-width: 1200px;
  background: white;
  border: 2px solid #000000;
  overflow: hidden;
  position: relative;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #ffffff;
  border-bottom: 1px solid #000000;
  position: relative;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #000000;
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
  position: relative;
`;

// Application states
const APP_STATES = {
  INTRO: 'intro',
  PATIENT_INFO: 'patient_info',
  FREE_SPEECH: 'free_speech',
  VOICE_SYMPTOMS: 'voice_symptoms',
  CONSENT: 'consent',
  QUESTIONS: 'questions', 
  SUMMARY: 'summary',
  ERROR: 'error'
};

/**
 * Main App Component
 * 
 * Manages the entire application flow:
 * 1. Consent screen with privacy information
 * 2. Question-by-question interview with emotion detection
 * 3. Summary with results and charts
 * 
 * Features:
 * - State management for answers and emotions
 * - Progress tracking
 * - Error boundary
 * - Accessibility considerations
 * - Mobile-responsive design
 */
function App() {
  // Application state
  const [currentState, setCurrentState] = useState(APP_STATES.INTRO);
  const [patientMeta, setPatientMeta] = useState(null);
  const [freeSpeechResults, setFreeSpeechResults] = useState(null);
  const [voiceSymptomResults, setVoiceSymptomResults] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  
  // Photo capture state
  const photoCaptureRef = useRef({});
  const [photoAnalysisResults, setPhotoAnalysisResults] = useState([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [finalReportText, setFinalReportText] = useState(null);
  const [finalCombinedJson, setFinalCombinedJson] = useState(null);
  
  // Current emotion state for real-time tracking
  const [currentEmotion, setCurrentEmotion] = useState(null);

  // Handle intro "Get Started"
  const handleGetStarted = useCallback(() => {
    setCurrentState(APP_STATES.CONSENT);
  }, []);

  // Handle optional UHID entry / skip
  const handlePatientInfoComplete = useCallback((metadata) => {
    setPatientMeta(metadata);
    setCurrentState(APP_STATES.FREE_SPEECH);
  }, []);

  // Handle free-speech completion
  const handleFreeSpeechComplete = useCallback((results) => {
    setFreeSpeechResults(results);
    setCurrentState(APP_STATES.VOICE_SYMPTOMS);
  }, []);

  // Handle free-speech skip
  const handleFreeSpeechSkip = useCallback(() => {
    setFreeSpeechResults(null); // explicitly null = skipped
    setCurrentState(APP_STATES.VOICE_SYMPTOMS);
  }, []);

  // Handle voice symptom completion
  const handleVoiceSymptomComplete = useCallback((results) => {
    setVoiceSymptomResults(results);
    setCurrentState(APP_STATES.QUESTIONS);
  }, []);

  // Handle voice symptom skip
  const handleVoiceSymptomSkip = useCallback(() => {
    setVoiceSymptomResults(null);
    setCurrentState(APP_STATES.QUESTIONS);
  }, []);

  // Handle consent acceptance
  const handleConsent = useCallback(() => {
    try {
      setCurrentState(APP_STATES.PATIENT_INFO);
      setError(null);
    } catch (err) {
      setError('Failed to start screening. Please try again.');
      setCurrentState(APP_STATES.ERROR);
    }
  }, []);

  // Handle consent decline
  const handleConsentDecline = useCallback(() => {
    // In a real app, you might redirect or show additional resources
    alert('Thank you for your time. If you need mental health support, please contact a healthcare professional.');
  }, []);

  // Handle answer selection
  const handleAnswerSelect = useCallback((answer, capturedPhoto = null) => {
    const currentQuestion = questionsData[currentQuestionIndex];
    
    // Create emotion snapshot from current emotion state
    const sourceEmotion = capturedPhoto?.currentEmotion || currentEmotion;
    const emotionSnapshot = sourceEmotion ? {
      predominantEmotion: sourceEmotion.emotion,
      confidence: sourceEmotion.confidence,
      timestamp: sourceEmotion.timestamp,
      allExpressions: sourceEmotion.allExpressions
    } : null;
    
    const answerData = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      answer,
      emotionSnapshot,
      emotionAggregate: capturedPhoto?.emotionAggregate || null,
      photoId: capturedPhoto?.id || null,
      timestamp: new Date().toISOString()
    };

    setAnswers(prevAnswers => {
      // Replace existing answer for this question or add new one
      const existingIndex = prevAnswers.findIndex(a => a.questionId === currentQuestion.id);
      if (existingIndex >= 0) {
        const newAnswers = [...prevAnswers];
        newAnswers[existingIndex] = answerData;
        return newAnswers;
      } else {
        return [...prevAnswers, answerData];
      }
    });
  }, [currentQuestionIndex, currentEmotion]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    if (currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Process photos before moving to summary
      try {
        setIsProcessingPhotos(true);

        let analysisResults = null;
        if (photoCaptureRef.current && photoCaptureRef.current.processCapturedPhotos) {
          console.log('🔄 Processing captured photos for final analysis...');
          analysisResults = await photoCaptureRef.current.processCapturedPhotos();

          if (analysisResults) {
            setPhotoAnalysisResults(analysisResults);
            console.log('✅ Photo analysis complete:', analysisResults.length, 'photos processed');
          }
        }

        // Generate combined Gemini report (if API key exists)
        try {
          const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
          const facialSummary = summarizeFacialSignals(answers, analysisResults || []);

          if (apiKey) {
            // Import generateEmotionAnalysis dynamically to avoid top-level coupling
            const { generateEmotionAnalysis } = await import('./services/geminiApi');
            const report = await generateEmotionAnalysis(
              answers,
              analysisResults || [],
              freeSpeechResults,
              apiKey,
              voiceSymptomResults,
              patientMeta,
              facialSummary
            );
            setFinalReportText(report);

            const combined = {
              timestamp: new Date().toISOString(),
              patientMeta,
              answers,
              photoAnalysisResults: analysisResults || [],
              freeSpeechResults,
              voiceSymptomResults,
              facialSummary,
              aiReport: report
            };

            setFinalCombinedJson(combined);
          } else {
            // No API key — still prepare combined JSON using local analysis
            const combined = {
              timestamp: new Date().toISOString(),
              patientMeta,
              answers,
              photoAnalysisResults: analysisResults || [],
              freeSpeechResults,
              voiceSymptomResults,
              facialSummary,
              aiReport: null
            };
            setFinalCombinedJson(combined);
          }
        } catch (genErr) {
          console.warn('Gemini analysis failed or unavailable:', genErr);
        }

        // Move to summary
        setCurrentState(APP_STATES.SUMMARY);
      } catch (error) {
        console.error('❌ Failed to process photos:', error);
        // Still move to summary even if photo processing fails
        setCurrentState(APP_STATES.SUMMARY);
      } finally {
        setIsProcessingPhotos(false);
      }
    }
  }, [currentQuestionIndex, answers, freeSpeechResults, voiceSymptomResults, patientMeta]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Summary handlers
  const handleRestart = useCallback(() => {
    setCurrentState(APP_STATES.INTRO);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setPatientMeta(null);
    setFreeSpeechResults(null);
    setVoiceSymptomResults(null);
    setPhotoAnalysisResults([]);
    setFinalReportText(null);
    setFinalCombinedJson(null);
    setCurrentEmotion(null);
    setError(null);
  }, []);

  const handleExport = useCallback(() => {
    try {
      const exportPayload = finalCombinedJson || {
        timestamp: new Date().toISOString(),
        patientMeta,
        totalQuestions: questionsData.length,
        answers: answers,
        photoAnalysisResults: photoAnalysisResults,
        freeSpeechResults: freeSpeechResults,
        voiceSymptomResults: voiceSymptomResults,
        facialSummary: summarizeFacialSignals(answers, photoAnalysisResults),
        summary: {
          yesCount: answers.filter(a => a.answer === 'Yes').length,
          noCount: answers.filter(a => a.answer === 'No').length,
          unsureCount: answers.filter(a => a.answer === 'Unsure').length,
          emotionFrequency: answers.reduce((acc, answer) => {
            const emotion = answer.emotionSnapshot?.predominantEmotion || 'Neutral';
            acc[emotion] = (acc[emotion] || 0) + 1;
            return acc;
          }, {})
        },
        aiReport: finalReportText || null
      };

      const dataStr = JSON.stringify(exportPayload, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mental-health-screening-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data. Please try again.');
    }
  }, [answers, finalCombinedJson, finalReportText, freeSpeechResults, patientMeta, photoAnalysisResults, voiceSymptomResults]);

  // Calculate progress
  const getProgress = () => {
    switch (currentState) {
      case APP_STATES.INTRO:
        return 0;
      case APP_STATES.CONSENT:
        return 5;
      case APP_STATES.PATIENT_INFO:
        return 10;
      case APP_STATES.FREE_SPEECH:
        return 15;
      case APP_STATES.VOICE_SYMPTOMS:
        return 25;
      case APP_STATES.QUESTIONS:
        return 30 + ((currentQuestionIndex + 1) / questionsData.length) * 60;
      case APP_STATES.SUMMARY:
        return 100;
      default:
        return 0;
    }
  };

  // Get current question data
  const currentQuestion = questionsData[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id)?.answer;

  // Check navigation permissions
  const canGoNext = currentAnswer !== undefined;
  const canGoPrevious = currentQuestionIndex > 0;
  const isLastQuestion = currentQuestionIndex === questionsData.length - 1;

  // Error boundary
  if (currentState === APP_STATES.ERROR || error) {
    return (
      <>
        <GlobalStyle />
        <AppContainer>
          <ErrorBoundary onRestart={handleRestart}>
            <div>Error: {error || 'An unexpected error occurred.'}</div>
          </ErrorBoundary>
        </AppContainer>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <ErrorBoundary onRestart={handleRestart}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <AppContainer>
          <MainContent>
            <ProgressBar>
              <ProgressFill 
                $progress={getProgress()} 
                role="progressbar"
                aria-valuenow={Math.round(getProgress())}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Screening progress: ${Math.round(getProgress())}% complete`}
              />
            </ProgressBar>

            <div id="main-content">
              {currentState === APP_STATES.INTRO && (
                <IntroScreen onGetStarted={handleGetStarted} />
              )}

              {currentState === APP_STATES.CONSENT && (
                <ConsentScreen
                  onConsent={handleConsent}
                  onDecline={handleConsentDecline}
                />
              )}

              {currentState === APP_STATES.PATIENT_INFO && (
                <PatientInfoScreen
                  onComplete={handlePatientInfoComplete}
                />
              )}

              {currentState === APP_STATES.FREE_SPEECH && (
                <FreeSpeechSection
                  onComplete={handleFreeSpeechComplete}
                  onSkip={handleFreeSpeechSkip}
                />
              )}

              {currentState === APP_STATES.VOICE_SYMPTOMS && (
                <VoiceSymptomSection
                  onComplete={handleVoiceSymptomComplete}
                  onSkip={handleVoiceSymptomSkip}
                />
              )}

              {currentState === APP_STATES.QUESTIONS && currentQuestion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <CameraEmotion 
                    onModelLoad={() => {}} // Add model load handler if needed
                    onPhotoCapture={photoCaptureRef.current}
                    onEmotionDetected={setCurrentEmotion}
                    questionContext={{
                      questionId: currentQuestion.id,
                      questionNumber: currentQuestionIndex + 1,
                      questionText: currentQuestion.text
                    }}
                  />
                  <QuestionForm
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
                    currentEmotion={currentEmotion}
                  />
                </div>
              )}

              {currentState === APP_STATES.SUMMARY && (
                <Summary
                  answers={answers}
                  photoAnalysisResults={photoAnalysisResults}
                  freeSpeechResults={freeSpeechResults}
                  voiceSymptomResults={voiceSymptomResults}
                  patientMeta={patientMeta}
                  finalReportText={finalReportText}
                  onRestart={handleRestart}
                  onExport={handleExport}
                />
              )}
            </div>
          </MainContent>
        </AppContainer>
      </ErrorBoundary>
    </>
  );
}

export default App;

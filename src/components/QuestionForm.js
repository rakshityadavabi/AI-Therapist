import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const FormContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 15px;
  }
`;

const QuestionSection = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
`;

const CameraSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  
  @media (max-width: 768px) {
    order: -1; /* Move camera above question on mobile */
  }
`;

const QuestionNumber = styled.div`
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
  font-weight: 500;
`;

const QuestionText = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #212529;
  line-height: 1.4;
  margin: 0 0 30px 0;

  @media (max-width: 768px) {
    font-size: 20px;
    margin-bottom: 25px;
  }
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 30px;
`;

const OptionButton = styled.button`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border: 2px solid ${props => props.selected ? '#007bff' : '#dee2e6'};
  background: ${props => props.selected ? '#e7f3ff' : 'white'};
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  color: ${props => props.selected ? '#007bff' : '#495057'};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: #007bff;
    background: ${props => props.selected ? '#e7f3ff' : '#f8f9fa'};
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  &:active {
    transform: translateY(1px);
  }

  @media (max-width: 768px) {
    padding: 14px 16px;
    font-size: 16px;
  }
`;

const RadioIcon = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.selected ? '#007bff' : '#6c757d'};
  border-radius: 50%;
  margin-right: 12px;
  position: relative;
  flex-shrink: 0;
  
  ${props => props.selected && `
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      background: #007bff;
      border-radius: 50%;
    }
  `}
`;

const NavigationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
`;

const NavigationButton = styled.button`
  padding: 12px 24px;
  border: 2px solid #007bff;
  background: ${props => props.$primary ? '#007bff' : 'white'};
  color: ${props => props.$primary ? 'white' : '#007bff'};
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#0056b3' : '#e7f3ff'};
    border-color: #0056b3;
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 10px 20px;
    font-size: 14px;
  }
`;

const ProgressIndicator = styled.div`
  font-size: 14px;
  color: #6c757d;
  text-align: center;
`;

const CameraTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  margin: 0 0 15px 0;
  text-align: center;
`;

const PhotoStatusDisplay = styled.div`
  margin-top: 15px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  color: #495057;
  text-align: center;
  border: 1px solid #e9ecef;
`;

const PhotoCaptureIndicator = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  
  .capture-message {
    background: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    color: #333;
    font-weight: 500;
    
    .capture-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
  }
`;

/**
 * QuestionForm Component
 * 
 * Displays a single question with answer options and camera emotion detection
 * Features:
 * - Accessible radio button interface
 * - Integration with CameraEmotion component
 * - Progress tracking
 * - Navigation controls
 * - Responsive design
 */
const QuestionForm = ({
  question,
  currentQuestionIndex,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  isLastQuestion,
  photoCapture,
  isProcessingPhotos
}) => {
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  // Handle answer selection with automatic photo capture
  const handleAnswerClick = useCallback(async (answer) => {
    try {
      setIsCapturingPhoto(true);
      
      // Capture photo when user selects an answer
      if (photoCapture && photoCapture.capturePhoto) {
        const questionData = {
          questionNumber: currentQuestionIndex + 1,
          questionText: question.text,
          answer: answer,
          timestamp: new Date().toISOString()
        };
        
        await photoCapture.capturePhoto(questionData);
        console.log('📸 Photo captured for question', questionData.questionNumber, 'with answer:', answer);
      }
      
      // Call the parent's answer select handler
      onAnswerSelect(answer);
      
    } catch (error) {
      console.error('Error capturing photo during answer selection:', error);
      
      // Still proceed with answer selection even if photo capture fails
      onAnswerSelect(answer);
    } finally {
      setIsCapturingPhoto(false);
    }
  }, [photoCapture, currentQuestionIndex, question.text, onAnswerSelect]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && canGoNext) {
        onNext();
      } else if (event.key === 'Escape' && canGoPrevious) {
        onPrevious();
      } else if (event.key >= '1' && event.key <= '3') {
        const optionIndex = parseInt(event.key) - 1;
        if (question.options[optionIndex]) {
          handleAnswerClick(question.options[optionIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canGoNext, canGoPrevious, onNext, onPrevious, question.options, handleAnswerClick]);

  return (
    <FormContainer>
      <QuestionSection>
        <QuestionNumber>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </QuestionNumber>
        
        <QuestionText 
          id={`question-${question.id}`}
          role="heading" 
          aria-level="1"
        >
          {question.text}
        </QuestionText>
        
        <OptionsContainer
          role="radiogroup"
          aria-labelledby={`question-${question.id}`}
        >
          {question.options.map((option, index) => (
            <OptionButton
              key={option}
              selected={selectedAnswer === option}
              onClick={() => handleAnswerClick(option)}
              role="radio"
              aria-checked={selectedAnswer === option}
              aria-describedby="keyboard-hint"
            >
              <RadioIcon selected={selectedAnswer === option} />
              {option}
            </OptionButton>
          ))}
        </OptionsContainer>

        <div id="keyboard-hint" style={{ fontSize: '12px', color: '#6c757d', marginBottom: '20px' }}>
          Tip: Use number keys 1-3 to select answers, Enter to continue, Escape to go back
        </div>

        <NavigationContainer>
          <NavigationButton
            onClick={onPrevious}
            disabled={!canGoPrevious}
            aria-label="Go to previous question"
          >
            Previous
          </NavigationButton>
          
          <ProgressIndicator>
            {currentQuestionIndex + 1} / {totalQuestions}
          </ProgressIndicator>
          
          <NavigationButton
            $primary
            onClick={onNext}
            disabled={!canGoNext}
            aria-label={isLastQuestion ? "View summary" : "Go to next question"}
          >
            {isLastQuestion ? 'View Summary' : 'Next'}
          </NavigationButton>
        </NavigationContainer>
      </QuestionSection>

      <CameraSection>
        <CameraTitle>Photo Capture Status</CameraTitle>
        <PhotoStatusDisplay>
          {isProcessingPhotos ? (
            <div>
              <div>🔄 Processing captured photos...</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
                Please wait while we analyze your responses
              </div>
            </div>
          ) : photoCapture ? (
            <div>
              <div>📸 Photo capture ready</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#28a745' }}>
                Photos will be captured automatically when you answer
              </div>
            </div>
          ) : (
            <div>
              <div>⏳ Initializing camera...</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
                Please allow camera access for emotion analysis
              </div>
            </div>
          )}
        </PhotoStatusDisplay>
      </CameraSection>
      
      {/* Photo Capture Indicator */}
      <PhotoCaptureIndicator $visible={isCapturingPhoto}>
        <div className="capture-message">
          <div className="capture-icon">📸</div>
          <div>Capturing photo...</div>
        </div>
      </PhotoCaptureIndicator>
    </FormContainer>
  );
};

export default QuestionForm;
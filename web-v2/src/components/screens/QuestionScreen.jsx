import { Pill } from '../ui/Pill';
import { FlowStepper } from '../FlowStepper';
import { CameraEmotion } from '../CameraEmotion';
import { QuestionForm } from './QuestionForm';

export function QuestionScreen({
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
  isProcessingPhotos,
  setCurrentEmotion,
}) {
  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <FlowStepper currentStateId="questions" className="mb-8" />

      <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Pill tone="primary" className="mb-2">Step 4 of 5 · Interview</Pill>
          <p className="text-sm text-[var(--color-muted)]">
            Question{' '}
            <span className="font-semibold text-[var(--color-ink)] tabular-nums">
              {currentQuestionIndex + 1}
            </span>{' '}
            of <span className="tabular-nums">{totalQuestions}</span>
          </p>
        </div>
        <div className="hidden sm:flex flex-1 max-w-sm items-center gap-3">
          <div className="h-1 flex-1 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] transition-[width] duration-500 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-[var(--color-muted)] tabular-nums">
            {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-7">
          <QuestionForm
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={onAnswerSelect}
            onNext={onNext}
            onPrevious={onPrevious}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            isLastQuestion={isLastQuestion}
            photoCapture={photoCapture}
            isProcessingPhotos={isProcessingPhotos}
          />
        </div>
        <div className="lg:col-span-5 order-first lg:order-last">
          <CameraEmotion onPhotoCapture={photoCapture} onEmotionDetected={setCurrentEmotion} />
        </div>
      </div>
    </div>
  );
}

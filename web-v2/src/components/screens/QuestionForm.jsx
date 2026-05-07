import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Aperture } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';
import { cn } from '@/lib/utils';

export function QuestionForm({
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
  photoCaptureRef,
  isProcessingPhotos,
}) {
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  const handleAnswerClick = useCallback(
    async (answer) => {
      try {
        setIsCapturingPhoto(true);
        let capturedPhoto = null;
        if (photoCaptureRef?.current?.capturePhoto) {
          capturedPhoto = await photoCaptureRef.current.capturePhoto({
            questionNumber: currentQuestionIndex + 1,
            questionId: question.id,
            questionText: question.text,
            answer,
            timestamp: new Date().toISOString(),
          });
        }
        onAnswerSelect(answer, capturedPhoto);
      } catch {
        onAnswerSelect(answer);
      } finally {
        setIsCapturingPhoto(false);
      }
    },
    [photoCaptureRef, currentQuestionIndex, question.id, question.text, onAnswerSelect]
  );

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && canGoNext) onNext();
      else if (event.key === 'Escape' && canGoPrevious) onPrevious();
      else if (event.key >= '1' && event.key <= '3') {
        const optionIndex = parseInt(event.key) - 1;
        if (question.options[optionIndex]) handleAnswerClick(question.options[optionIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canGoNext, canGoPrevious, onNext, onPrevious, question.options, handleAnswerClick]);

  return (
    <Card className="p-6 sm:p-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <Pill tone="primary" size="md" className="capitalize">
          Question {currentQuestionIndex + 1} of {totalQuestions} · {question.category}
        </Pill>
        <span className="text-xs text-[var(--color-muted)] font-semibold tabular-nums">
          {String(currentQuestionIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
        </span>
      </header>

      <h2
        id={`question-${question.id}`}
        className="mt-5 font-display text-[24px] sm:text-[28px] font-bold text-[var(--color-ink)] tracking-tight leading-[1.25]"
      >
        {question.text}
      </h2>

      <div
        role="radiogroup"
        aria-labelledby={`question-${question.id}`}
        className="mt-6 space-y-3"
      >
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          return (
            <button
              key={option}
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleAnswerClick(option)}
              className={cn(
                'group w-full text-left rounded-[12px] border transition-all duration-150 px-5 py-4 flex items-center gap-4',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-ring)]',
                isSelected
                  ? 'border-[var(--color-primary)] border-2 bg-[var(--color-primary-soft)]/55 shadow-[var(--shadow-soft)]'
                  : 'border-[var(--color-border-soft)] bg-white hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary-soft)]/30'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  isSelected
                    ? 'border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] group-hover:border-[var(--color-primary)]/60'
                )}
              >
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
              </span>
              <span
                className={cn(
                  'text-[16px] font-semibold flex-1',
                  isSelected ? 'text-[var(--color-primary-hover)]' : 'text-[var(--color-ink)]'
                )}
              >
                {option}
              </span>
              <span className="hidden sm:inline-flex items-center justify-center h-7 w-7 rounded-md text-[11px] font-bold text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border-soft)]">
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-[var(--color-faint)]">
        Tip: press <kbd className="px-1.5 py-0.5 rounded border bg-white">1</kbd>–<kbd className="px-1.5 py-0.5 rounded border bg-white">3</kbd>{' '}
        to choose, <kbd className="px-1.5 py-0.5 rounded border bg-white">Enter</kbd> to continue,{' '}
        <kbd className="px-1.5 py-0.5 rounded border bg-white">Esc</kbd> to go back.
      </p>

      <footer className="mt-8 flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" onClick={onPrevious} disabled={!canGoPrevious}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button onClick={onNext} disabled={!canGoNext || isProcessingPhotos}>
          {isProcessingPhotos
            ? 'Processing photos…'
            : isLastQuestion
            ? 'View summary'
            : 'Next'}{' '}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </footer>

      <AnimatePresence>
        {isCapturingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            aria-live="polite"
          >
            <div className="bg-white rounded-[12px] px-5 py-4 shadow-xl flex items-center gap-3">
              <Aperture className="h-5 w-5 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--color-ink)]">Capturing photo…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

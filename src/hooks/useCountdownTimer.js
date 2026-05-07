import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useCountdownTimer
 *
 * Provides a countdown timer (in seconds) with start / stop / reset.
 *
 * @param {number} totalSeconds  – initial duration in seconds (default 120 = 2 min)
 * @param {function} onComplete  – called when the timer reaches 0
 * @returns {{ remaining, isRunning, start, stop, reset, formattedTime }}
 */
export default function useCountdownTimer(totalSeconds = 120, onComplete) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref fresh without re-creating the interval
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clear]);

  const stop = useCallback(() => {
    clear();
    setIsRunning(false);
  }, [clear]);

  const reset = useCallback(() => {
    clear();
    setIsRunning(false);
    setRemaining(totalSeconds);
  }, [clear, totalSeconds]);

  // Clean up on unmount
  useEffect(() => () => clear(), [clear]);

  // Format MM:SS
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const formattedTime = `${minutes}:${seconds}`;

  return { remaining, isRunning, start, stop, reset, formattedTime };
}

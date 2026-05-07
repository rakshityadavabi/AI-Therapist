import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useSpeechToText
 *
 * Wraps the Web Speech API (SpeechRecognition) for live transcription.
 * Falls back gracefully if the API is unavailable.
 *
 * @returns {{ transcript, isListening, isSupported, start, stop, resetTranscript }}
 */
export default function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);

  // Feature detection
  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const isSupported = Boolean(SpeechRecognition);

  // Create recognition instance once
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event) => {
      // 'no-speech', 'aborted', and 'network' are expected during normal use
      const benign = ['no-speech', 'aborted', 'network'];
      if (!benign.includes(event.error)) {
        console.warn('SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // The Web Speech API often stops itself (silence, network, browser limits).
      // Auto-restart if the user hasn't explicitly stopped.
      if (shouldBeListeningRef.current) {
        try {
          recognition.start();
          return; // keep isListening true
        } catch {
          // fall through to set isListening false
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Provide a way to reset the accumulated final transcript
    recognitionRef.current._resetFinal = () => {
      finalTranscript = '';
    };

    return () => {
      shouldBeListeningRef.current = false;
      recognition.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      shouldBeListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldBeListeningRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch {
      // Already stopped — ignore
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    if (recognitionRef.current?._resetFinal) {
      recognitionRef.current._resetFinal();
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* noop */ }
      }
    };
  }, []);

  return { transcript, isListening, isSupported, start, stop, resetTranscript };
}

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Web Speech API wrapper for live transcription.
 * Falls back gracefully when the API is unavailable.
 */
export default function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);

  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const isSupported = Boolean(SpeechRecognition);

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
        if (result.isFinal) finalTranscript += result[0].transcript + ' ';
        else interim += result[0].transcript;
      }
      setTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event) => {
      const benign = ['no-speech', 'aborted', 'network'];
      if (!benign.includes(event.error)) {
        console.warn('SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (shouldBeListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* fallthrough */
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognitionRef.current._resetFinal = () => {
      finalTranscript = '';
    };

    return () => {
      shouldBeListeningRef.current = false;
      recognition.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      shouldBeListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldBeListeningRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch {
      /* already stopped */
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    if (recognitionRef.current?._resetFinal) recognitionRef.current._resetFinal();
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return { transcript, isListening, isSupported, start, stop, resetTranscript };
}

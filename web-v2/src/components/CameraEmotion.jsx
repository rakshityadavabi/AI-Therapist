import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera as CameraIcon, RefreshCcw, Sparkles, Aperture } from 'lucide-react';
import { configureTensorFlow } from '@/utils/tensorflowConfig';
import { normalizeEmotionLabel, summarizeEmotionSamples } from '@/utils/emotionAnalysis';
import { useCamera } from '@/hooks/useCamera';
import { Card } from './ui/Card';
import { StatusDot } from './ui/StatusDot';
import { Pill } from './ui/Pill';
import { cn } from '@/lib/utils';

const EMOTION_ICONS = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fearful: '😰',
  disgusted: '🤢',
  surprised: '😲',
  neutral: '😐',
};

export function CameraEmotion({ onEmotionDetected, photoCaptureRef, questionContext, isActive = true }) {
  const {
    videoRef,
    isLoading: cameraLoading,
    isActive: cameraActive,
    error: cameraError,
    deviceInfo,
    startCamera,
    retryCamera,
  } = useCamera();

  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const questionSamplesRef = useRef([]);

  const loadModels = useCallback(async () => {
    try {
      await configureTensorFlow();
      const modelPath = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
      ]);
      setIsModelLoaded(true);
      setModelError(null);
    } catch (error) {
      setModelError(error.message);
      setIsModelLoaded(false);
    }
  }, []);

  const detectEmotions = useCallback(async () => {
    if (!isModelLoaded || !cameraActive || !videoRef.current || !detectionEnabled) return;

    try {
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
        .withFaceExpressions();

      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        const rawDominantEmotion = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );
        const dominantEmotion = normalizeEmotionLabel(rawDominantEmotion);

        if (expressions[rawDominantEmotion] >= 0.15) {
          const emotion = {
            emotion: dominantEmotion,
            confidence: expressions[rawDominantEmotion],
            timestamp: Date.now(),
            allExpressions: expressions,
          };
          questionSamplesRef.current = [...questionSamplesRef.current.slice(-29), emotion];
          setCurrentEmotion(emotion);
          onEmotionDetected?.(emotion);
        }

        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const resized = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawFaceExpressions(canvas, resized);
        }
      }
    } catch {
      /* swallow occasional detection errors */
    }
  }, [isModelLoaded, cameraActive, detectionEnabled, onEmotionDetected, videoRef]);

  useEffect(() => {
    if (isActive) startCamera();
  }, [isActive, startCamera]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (!detectionEnabled || !cameraActive) return;
    const interval = setInterval(detectEmotions, 500);
    return () => clearInterval(interval);
  }, [detectEmotions, detectionEnabled, cameraActive]);

  useEffect(() => {
    questionSamplesRef.current = [];
  }, [questionContext?.questionId]);

  const capturePhoto = useCallback(
    async (questionData = {}) => {
      if (!videoRef.current || !cameraActive || isCapturing) return null;
      try {
        setIsCapturing(true);
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const photoBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        const photoData = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          blob: photoBlob,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          dimensions: { width: canvas.width, height: canvas.height },
          questionData: { ...(questionContext || {}), ...questionData },
          currentEmotion: currentEmotion ? { ...currentEmotion } : null,
          emotionAggregate: summarizeEmotionSamples(questionSamplesRef.current),
        };
        photoData.jsonRepresentation = {
          id: photoData.id,
          timestamp: photoData.timestamp,
          questionData: photoData.questionData,
          dimensions: photoData.dimensions,
          currentEmotion: photoData.currentEmotion,
          emotionAggregate: photoData.emotionAggregate,
        };

        setCapturedPhotos((prev) => {
          const questionNumber = photoData.questionData?.questionNumber;
          if (!questionNumber) return [...prev, photoData];
          return [...prev.filter((p) => p.questionData?.questionNumber !== questionNumber), photoData];
        });
        return photoData;
      } catch {
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [videoRef, cameraActive, isCapturing, currentEmotion, questionContext]
  );

  useEffect(() => {
    if (!photoCaptureRef) return;
    photoCaptureRef.current = {
      ...(photoCaptureRef.current || {}),
      capturePhoto,
    };
  }, [capturePhoto, photoCaptureRef]);

  const processCapturedPhotos = useCallback(async () => {
    if (!isModelLoaded || capturedPhotos.length === 0) return null;
    const analysisResults = [];

    for (const photo of capturedPhotos) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photo.dataUrl;
        });

        const detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        let emotionData;
        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          const rawDominantEmotion = Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
          );
          const dominantEmotion = normalizeEmotionLabel(rawDominantEmotion);
          emotionData = {
            emotion: dominantEmotion,
            confidence: expressions[rawDominantEmotion],
            allExpressions: expressions,
            faceDetected: true,
          };
        } else {
          emotionData = { emotion: 'unknown', confidence: 0, allExpressions: {}, faceDetected: false };
        }

        analysisResults.push({
          ...photo,
          processedEmotion: emotionData,
          processingTimestamp: new Date().toISOString(),
          jsonRepresentation: {
            id: photo.id,
            timestamp: photo.timestamp,
            questionData: photo.questionData,
            dimensions: photo.dimensions,
            currentEmotion: photo.currentEmotion,
            emotionAggregate: photo.emotionAggregate,
            processedEmotion: emotionData,
          },
        });
      } catch (error) {
        const emotionData = {
          emotion: 'error',
          confidence: 0,
          allExpressions: {},
          faceDetected: false,
          error: error.message,
        };
        analysisResults.push({
          ...photo,
          processedEmotion: emotionData,
          processingTimestamp: new Date().toISOString(),
          jsonRepresentation: {
            id: photo.id,
            timestamp: photo.timestamp,
            questionData: photo.questionData,
            dimensions: photo.dimensions,
            currentEmotion: photo.currentEmotion,
            emotionAggregate: photo.emotionAggregate,
            processedEmotion: emotionData,
          },
        });
      }
    }
    return analysisResults;
  }, [isModelLoaded, capturedPhotos]);

  useEffect(() => {
    if (!photoCaptureRef) return;
    photoCaptureRef.current = {
      ...(photoCaptureRef.current || {}),
      processCapturedPhotos,
      getCapturedPhotos: () => capturedPhotos,
    };
  }, [processCapturedPhotos, capturedPhotos, photoCaptureRef]);

  const statusLabel = cameraError
    ? 'Camera error'
    : cameraLoading
    ? 'Starting camera…'
    : !cameraActive
    ? 'Camera inactive'
    : modelError
    ? 'Camera ready · AI offline'
    : !isModelLoaded
    ? 'Loading AI…'
    : 'AI ready';

  const statusTone = cameraError ? 'coral' : !cameraActive || cameraLoading ? 'amber' : 'primary';

  return (
    <Card className="overflow-hidden sticky top-[80px]">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[var(--color-border-soft)]">
        <CameraIcon className="h-4 w-4 text-[var(--color-muted)]" />
        <span className="text-sm font-semibold text-[var(--color-ink)]">Live emotion preview</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-muted)]">
          <StatusDot tone={statusTone} pulse={cameraLoading || (!isModelLoaded && cameraActive)} />
          {statusLabel}
        </span>
      </div>

      <div className="relative bg-[#0e1917] aspect-video overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)', display: cameraActive || cameraLoading ? 'block' : 'none' }}
          aria-label="Webcam video feed for emotion detection"
        />
        {isModelLoaded && cameraActive && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
        {!cameraActive && !cameraLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/85">
            <CameraIcon className="h-7 w-7 opacity-60" />
            <p className="text-sm">{cameraError ? cameraError : 'Camera not started'}</p>
            <button
              onClick={retryCamera}
              className="text-xs uppercase tracking-[0.08em] font-semibold bg-white text-[var(--color-ink)] rounded-full px-4 py-1.5 hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {currentEmotion && cameraActive && isModelLoaded && (
          <div className="absolute top-3 right-3">
            <Pill tone="primary" className="bg-white/95 shadow-sm">
              <span>{EMOTION_ICONS[currentEmotion.emotion] || '·'}</span>
              <span className="capitalize">{currentEmotion.emotion}</span>
              <span className="text-[var(--color-muted)] font-normal normal-case tracking-normal">
                · {Math.round(currentEmotion.confidence * 100)}%
              </span>
            </Pill>
          </div>
        )}

        {capturedPhotos.length > 0 && (
          <div className="absolute bottom-3 left-3">
            <Pill tone="outline" className="bg-white/95 shadow-sm normal-case tracking-normal text-[11px]">
              <Aperture className="h-3 w-3" /> {capturedPhotos.length} photos captured
            </Pill>
          </div>
        )}

        {isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-[12px] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] shadow">
              Capturing photo…
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-3">
        {currentEmotion && cameraActive && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow text-[var(--color-muted)]">Detection confidence</span>
              <span className="text-xs font-semibold text-[var(--color-ink)]">
                {Math.round(currentEmotion.confidence * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(currentEmotion.confidence * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDetectionEnabled((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] px-3 py-1.5 transition-colors border',
              detectionEnabled
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-muted)] border-[var(--color-border)]'
            )}
            aria-pressed={detectionEnabled}
          >
            <Sparkles className="h-3 w-3" />
            AI {detectionEnabled ? 'on' : 'off'}
          </button>
          <button
            onClick={retryCamera}
            disabled={!cameraActive || (deviceInfo && deviceInfo.total < 2)}
            className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] px-3 py-1.5 transition-colors border bg-white text-[var(--color-muted)] border-[var(--color-border)] disabled:opacity-50"
            title="Flip / retry camera"
          >
            <RefreshCcw className="h-3 w-3" /> Flip
          </button>
        </div>

        <p className="text-[11px] text-[var(--color-faint)]">Frames analysed locally; snapshots remain in this browser session.</p>
      </div>
    </Card>
  );
}

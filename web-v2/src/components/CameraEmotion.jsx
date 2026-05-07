import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as faceapi from 'face-api.js';
import { Camera as CameraIcon, RefreshCcw, Sparkles, Aperture, Info } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import {
  loadFaceModels,
  runDetection,
  validateFaceQuality,
  pickDominantEmotion,
  DETECTION_CONFIG,
} from '@/utils/faceDetection';
import { BehavioralTracker } from '@/utils/behavioralAnalysis';
import { Card } from './ui/Card';
import { StatusDot } from './ui/StatusDot';
import { Pill } from './ui/Pill';
import { cn } from '@/lib/utils';

const STATE_TONE = {
  positive: 'primary',
  warn: 'amber',
  negative: 'coral',
  neutral: 'outline',
};

const STATE_ICONS = {
  engaged: '😊',
  sad: '😢',
  mildly_sad: '🙁',
  anxious: '😬',
  stressed: '😰',
  subdued: '😐',
  uneasy: '😕',
  calm: '🙂',
  observing: '·',
};

const SCAN_TIPS = [
  'Use good, even lighting on your face',
  'Face the camera directly',
  'Keep your face centered in the frame',
  'Only one person should be visible',
];

const fmtPct = (v) => `${Math.round(Math.max(0, Math.min(1, v ?? 0)) * 100)}%`;
const fmtRate = (v) => `${Math.round(v ?? 0)}/min`;

export function CameraEmotion({ onEmotionDetected, onPhotoCapture, isActive = true }) {
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
  const trackerRef = useRef(null);
  if (trackerRef.current == null) trackerRef.current = new BehavioralTracker();
  const detectionTimerRef = useRef(null);
  const inFlightRef = useRef(false);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [qualityHint, setQualityHint] = useState(null);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      await loadFaceModels();
      setIsModelLoaded(true);
      setModelError(null);
    } catch (error) {
      setModelError(error.message);
      setIsModelLoaded(false);
    }
  }, []);

  const drawOverlay = useCallback((detections, displaySize) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    faceapi.matchDimensions(canvas, displaySize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detections || detections.length === 0) return;
    const resized = faceapi.resizeResults(detections, displaySize);
    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
  }, []);

  const detectEmotions = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!isModelLoaded || !cameraActive || !videoRef.current || !detectionEnabled) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    inFlightRef.current = true;
    try {
      const detections = await runDetection(video);
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      drawOverlay(detections, displaySize);

      const quality = validateFaceQuality(detections, displaySize.width, displaySize.height);
      if (!quality.ok) {
        setQualityHint(quality.hint);
        trackerRef.current.noteEmptyFrame();
        return;
      }
      setQualityHint(null);

      const live = trackerRef.current.ingest({
        box: quality.face.detection.box,
        landmarks: quality.face.landmarks,
        expressions: quality.face.expressions,
        timestamp: Date.now(),
      });

      setSnapshot(live);

      const payload = {
        emotion: live.composite.state,
        compositeLabel: live.composite.label,
        compositeTone: live.composite.tone,
        confidence: live.composite.confidence,
        timestamp: Date.now(),
        rawDominantEmotion: live.dominantEmotion,
        allExpressions: live.averagedExpressions,
        metrics: {
          blinkRate: live.blinkRate,
          smileFrequency: live.smileFrequency,
          movementScore: live.movementScore,
          expressionVariability: live.expressionVariability,
          gazeStability: live.gazeStability,
          sadnessTrend: live.sadnessTrend,
        },
        qualitative: live.qualitative,
      };
      if (live.composite.state !== 'observing') onEmotionDetected?.(payload);
    } catch {
      /* swallow occasional detection errors */
    } finally {
      inFlightRef.current = false;
    }
  }, [isModelLoaded, cameraActive, detectionEnabled, onEmotionDetected, videoRef, drawOverlay]);

  useEffect(() => {
    if (isActive) startCamera();
  }, [isActive, startCamera]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (!detectionEnabled || !cameraActive || !isModelLoaded) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await detectEmotions();
      if (cancelled) return;
      detectionTimerRef.current = setTimeout(tick, DETECTION_CONFIG.detectionIntervalMs);
    };
    tick();
    return () => {
      cancelled = true;
      if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
    };
  }, [detectEmotions, detectionEnabled, cameraActive, isModelLoaded]);

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

        const photoBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        const behavioral = snapshot
          ? {
              composite: snapshot.composite,
              metrics: {
                blinkRate: snapshot.blinkRate,
                smileFrequency: snapshot.smileFrequency,
                movementScore: snapshot.movementScore,
                expressionVariability: snapshot.expressionVariability,
                gazeStability: snapshot.gazeStability,
                sadnessTrend: snapshot.sadnessTrend,
              },
              qualitative: snapshot.qualitative,
            }
          : null;

        const photoData = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          blob: photoBlob,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          dimensions: { width: canvas.width, height: canvas.height },
          questionData,
          currentEmotion: snapshot
            ? {
                emotion: snapshot.composite.state,
                compositeLabel: snapshot.composite.label,
                confidence: snapshot.composite.confidence,
                rawDominantEmotion: snapshot.dominantEmotion,
                allExpressions: snapshot.averagedExpressions,
              }
            : null,
          behavioral,
        };
        photoData.jsonRepresentation = {
          id: photoData.id,
          timestamp: photoData.timestamp,
          questionData: photoData.questionData,
          dimensions: photoData.dimensions,
          currentEmotion: photoData.currentEmotion,
          behavioral,
          dataUrl: photoData.dataUrl,
        };

        setCapturedPhotos((prev) => [...prev, photoData]);
        onPhotoCapture?.(photoData);
        return photoData;
      } catch {
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [videoRef, cameraActive, isCapturing, snapshot, onPhotoCapture]
  );

  useEffect(() => {
    if (onPhotoCapture) onPhotoCapture.capturePhoto = capturePhoto;
  }, [capturePhoto, onPhotoCapture]);

  const beginQuestion = useCallback((meta) => trackerRef.current.beginQuestion(meta ?? {}), []);
  const endQuestion = useCallback((meta) => trackerRef.current.endQuestion(meta ?? {}), []);
  const getSessionSummary = useCallback(() => trackerRef.current.getSessionSummary(), []);
  const getLiveSnapshot = useCallback(() => trackerRef.current.snapshot(), []);
  const resetSession = useCallback(() => trackerRef.current.reset(), []);

  const processCapturedPhotos = useCallback(async () => {
    if (!isModelLoaded || capturedPhotos.length === 0) return null;
    const analysisResults = [];

    for (const photo of capturedPhotos) {
      let emotionData;
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photo.dataUrl;
        });

        const detections = await runDetection(img);
        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          const dominant = pickDominantEmotion(expressions);
          emotionData = {
            emotion: dominant?.emotion ?? 'unknown',
            confidence: dominant?.score ?? 0,
            allExpressions: expressions,
            faceDetected: true,
          };
        } else {
          emotionData = { emotion: 'unknown', confidence: 0, allExpressions: {}, faceDetected: false };
        }
      } catch (error) {
        emotionData = {
          emotion: 'error',
          confidence: 0,
          allExpressions: {},
          faceDetected: false,
          error: error.message,
        };
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
          processedEmotion: emotionData,
          behavioral: photo.behavioral ?? null,
          dataUrl: photo.dataUrl,
        },
      });
    }
    return analysisResults;
  }, [isModelLoaded, capturedPhotos]);

  useEffect(() => {
    if (!onPhotoCapture) return;
    onPhotoCapture.processCapturedPhotos = processCapturedPhotos;
    onPhotoCapture.getCapturedPhotos = () => capturedPhotos;
    onPhotoCapture.beginQuestion = beginQuestion;
    onPhotoCapture.endQuestion = endQuestion;
    onPhotoCapture.getSessionSummary = getSessionSummary;
    onPhotoCapture.getLiveSnapshot = getLiveSnapshot;
    onPhotoCapture.resetSession = resetSession;
  }, [
    processCapturedPhotos,
    capturedPhotos,
    onPhotoCapture,
    beginQuestion,
    endQuestion,
    getSessionSummary,
    getLiveSnapshot,
    resetSession,
  ]);

  const composite = snapshot?.composite;
  const compositeTone = composite ? STATE_TONE[composite.tone] || 'outline' : 'outline';

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
    : qualityHint
    ? 'Adjusting…'
    : !snapshot || (snapshot.samples ?? 0) < 6
    ? 'Calibrating…'
    : 'Tracking';

  const statusTone = cameraError
    ? 'coral'
    : !cameraActive || cameraLoading || qualityHint
    ? 'amber'
    : 'primary';

  const showTips = !cameraActive || !isModelLoaded || !!qualityHint;

  const metricChips = useMemo(() => {
    if (!snapshot || (snapshot.samples ?? 0) < 4) return [];
    const q = snapshot.qualitative;
    return [
      { label: 'Blink', value: fmtRate(snapshot.blinkRate), qual: q.blink },
      { label: 'Smile', value: fmtPct(snapshot.smileFrequency), qual: q.smile },
      { label: 'Movement', value: fmtPct(snapshot.movementScore), qual: q.movement },
      { label: 'Variability', value: fmtPct(snapshot.expressionVariability), qual: q.variability },
      { label: 'Gaze', value: fmtPct(snapshot.gazeStability), qual: q.gaze },
    ];
  }, [snapshot]);

  return (
    <Card className="overflow-hidden sticky top-[80px]">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-[var(--color-border-soft)]">
        <CameraIcon className="h-4 w-4 text-[var(--color-muted)]" />
        <span className="text-sm font-semibold text-[var(--color-ink)]">Behavioral preview</span>
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

        {qualityHint && cameraActive && isModelLoaded && (
          <div className="absolute inset-x-3 top-3 flex justify-center">
            <Pill tone="amber" className="bg-amber-50/95 shadow-sm normal-case tracking-normal">
              <Info className="h-3 w-3" />
              <span>{qualityHint}</span>
            </Pill>
          </div>
        )}

        {composite && cameraActive && isModelLoaded && !qualityHint && (
          <div className="absolute top-3 right-3">
            <Pill tone={compositeTone} className="bg-white/95 shadow-sm">
              <span>{STATE_ICONS[composite.state] || '·'}</span>
              <span className="capitalize">{composite.label}</span>
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
        {composite && cameraActive && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow text-[var(--color-muted)]">Behavioral state</span>
              <span className="text-xs font-semibold text-[var(--color-ink)]">
                Sadness trend {fmtPct(snapshot.sadnessTrend)}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-[width] duration-300 ease-out"
                style={{ width: fmtPct(snapshot.sadnessTrend) }}
              />
            </div>
          </div>
        )}

        {metricChips.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            {metricChips.map((m) => (
              <div
                key={m.label}
                className="rounded-md border border-[var(--color-border-soft)] bg-white px-2.5 py-1.5"
              >
                <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-[var(--color-muted)]">
                  {m.label}
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <span className="font-semibold text-[var(--color-ink)] tabular-nums">{m.value}</span>
                  <span className="text-[10px] text-[var(--color-faint)] capitalize">{m.qual}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showTips && (
          <ul className="space-y-1 text-[11px] text-[var(--color-faint)]">
            {SCAN_TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-1.5">
                <span aria-hidden className="mt-[3px] h-1 w-1 rounded-full bg-[var(--color-muted)] shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
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

        <p className="text-[11px] text-[var(--color-faint)]">Frames analysed locally · never uploaded.</p>
      </div>
    </Card>
  );
}

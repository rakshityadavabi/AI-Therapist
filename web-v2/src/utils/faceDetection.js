import * as faceapi from 'face-api.js';
import { configureTensorFlow } from './tensorflowConfig';

export const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

export const DETECTION_CONFIG = {
  modelPath: '/models',
  minDetectionConfidence: 0.5,
  minEmotionConfidence: 0.5,
  minFaceSize: 120,
  edgeMargin: 0.04,
  smoothingWindow: 12,
  detectionIntervalMs: 300,
};

let modelsLoaded = false;
let loadPromise = null;

export async function loadFaceModels(modelPath = DETECTION_CONFIG.modelPath) {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await configureTensorFlow();
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
    ]);
    modelsLoaded = true;
    return true;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

export function getDetectorOptions() {
  return new faceapi.SsdMobilenetv1Options({
    minConfidence: DETECTION_CONFIG.minDetectionConfidence,
  });
}

export async function runDetection(input) {
  return faceapi
    .detectAllFaces(input, getDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions();
}

/**
 * Validates the dominant face for size, framing, and uniqueness.
 * Returns { ok, reason, hint, face } — `hint` is user-facing copy.
 */
export function validateFaceQuality(detections, mediaWidth, mediaHeight) {
  if (!detections || detections.length === 0) {
    return { ok: false, reason: 'no_face', hint: 'No face detected — center yourself in the frame.' };
  }
  if (detections.length > 1) {
    return { ok: false, reason: 'multiple_faces', hint: 'Ensure only one face is visible.' };
  }

  const face = detections[0];
  const box = face.detection?.box;
  if (!box) {
    return { ok: false, reason: 'no_box', hint: 'Adjusting — keep your face centered.' };
  }

  if (box.width < DETECTION_CONFIG.minFaceSize || box.height < DETECTION_CONFIG.minFaceSize) {
    return { ok: false, reason: 'too_small', hint: 'Move closer to the camera.', face };
  }

  if (mediaWidth && mediaHeight) {
    const margin = DETECTION_CONFIG.edgeMargin;
    const offLeft = box.x < mediaWidth * margin;
    const offTop = box.y < mediaHeight * margin;
    const offRight = box.x + box.width > mediaWidth * (1 - margin);
    const offBottom = box.y + box.height > mediaHeight * (1 - margin);
    if (offLeft || offRight || offTop || offBottom) {
      return { ok: false, reason: 'cropped', hint: 'Center your face — part of it is out of frame.', face };
    }
  }

  if (face.detection.score !== undefined && face.detection.score < DETECTION_CONFIG.minDetectionConfidence) {
    return { ok: false, reason: 'low_detection_score', hint: 'Improve lighting or hold still.', face };
  }

  return { ok: true, face };
}

/**
 * Picks the dominant emotion with neutral-bias correction.
 * If neutral wins narrowly while another emotion is also strong,
 * prefer the stronger emotional signal.
 */
export function pickDominantEmotion(expressions) {
  if (!expressions) return null;
  const sorted = EMOTIONS
    .map((e) => ({ emotion: e, score: expressions[e] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  let top = sorted[0];
  const second = sorted[1];

  if (top.emotion === 'neutral' && second && top.score < 0.7 && second.score >= 0.4) {
    top = second;
  }

  return top;
}

/**
 * Rolling-window smoother. Averages the last N expression vectors,
 * then applies the same neutral-bias correction.
 */
export function createEmotionSmoother(windowSize = DETECTION_CONFIG.smoothingWindow) {
  const history = [];

  return {
    push(expressions) {
      if (!expressions) return null;
      history.push(expressions);
      if (history.length > windowSize) history.shift();

      const avg = {};
      for (const e of EMOTIONS) {
        let sum = 0;
        for (const frame of history) sum += frame[e] ?? 0;
        avg[e] = sum / history.length;
      }

      const dominant = pickDominantEmotion(avg);
      const samples = history.length;
      const ready = samples >= Math.min(4, windowSize);

      return {
        averaged: avg,
        dominant,
        samples,
        ready,
      };
    },
    reset() {
      history.length = 0;
    },
    size() {
      return history.length;
    },
  };
}

/**
 * Final classifier: applies the confidence threshold to the smoothed result.
 * Returns either a confident emotion or 'uncertain'.
 */
export function classifyEmotion(smoothed, threshold = DETECTION_CONFIG.minEmotionConfidence) {
  if (!smoothed || !smoothed.ready || !smoothed.dominant) {
    return { emotion: 'uncertain', confidence: 0, allExpressions: smoothed?.averaged ?? {} };
  }
  const { emotion, score } = smoothed.dominant;
  if (score < threshold) {
    return { emotion: 'uncertain', confidence: score, allExpressions: smoothed.averaged };
  }
  return { emotion, confidence: score, allExpressions: smoothed.averaged };
}

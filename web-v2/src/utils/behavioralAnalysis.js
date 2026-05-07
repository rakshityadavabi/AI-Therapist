import { EMOTIONS } from './faceDetection';

/**
 * Behavioural analysis layer.
 *
 * Reads per-frame face-api output (box, 68-pt landmarks, expression scores)
 * and derives time-domain signals — blink rate, head jitter, smile activity,
 * expression variability, gaze stability, and a leaky sadness-trend integrator.
 *
 * Stateful pipeline lives in `BehavioralTracker`. All math helpers are pure.
 * No DOM, no React — safe to unit test or run off the main thread later.
 */

// -----------------------------------------------------------------------------
// Tunables
// -----------------------------------------------------------------------------

export const BEHAVIORAL_CONFIG = {
  // EAR thresholds (Soukupová & Čech 2016 — ~0.21 at typical webcam framing).
  earClosedThreshold: 0.21,
  earOpenThreshold: 0.24,
  blinkMinGapMs: 120,

  // Rolling window for the live composite state (~last ~6s at 3.3 Hz).
  liveWindowSize: 20,

  // Long window for session-level metrics. ~5 min at 3.3 Hz.
  sessionWindowMax: 1000,

  // Sadness-trend integrator (per second).
  sadnessTrendTau: 7,

  // Smile activity threshold on `expressions.happy`.
  smileFrameThreshold: 0.35,

  // Expected blinks/minute baseline ranges.
  blinkRateBands: { veryLow: 6, low: 10, elevated: 24, high: 32 },
};

// -----------------------------------------------------------------------------
// Pure math helpers
// -----------------------------------------------------------------------------

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function eyeAspectRatio(eye) {
  if (!eye || eye.length < 6) return 0;
  const horiz = dist(eye[0], eye[3]);
  if (horiz < 1e-6) return 0;
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * horiz);
}

export function avgEAR(landmarks) {
  if (!landmarks) return 0;
  return (eyeAspectRatio(landmarks.getLeftEye()) + eyeAspectRatio(landmarks.getRightEye())) / 2;
}

export function centroid(points) {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

export function boxCenter(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Eye centroid relative to face-box center, normalised by box width/height.
 * Coarse gaze proxy — drift in this offset (after head-motion subtraction)
 * indicates the user looking around vs. looking at the camera.
 */
export function gazeOffset(landmarks, box) {
  if (!landmarks || !box) return { dx: 0, dy: 0 };
  const c = boxCenter(box);
  const lc = centroid(landmarks.getLeftEye());
  const rc = centroid(landmarks.getRightEye());
  const eyeMid = { x: (lc.x + rc.x) / 2, y: (lc.y + rc.y) / 2 };
  return {
    dx: (eyeMid.x - c.x) / box.width,
    dy: (eyeMid.y - c.y) / box.height,
  };
}

/**
 * Landmark-based smile metric: corners of the mouth pulled upward relative
 * to the upper lip center, normalised by face height.
 * `expressions.happy` only fires for visible teeth — this catches closed smiles too.
 */
export function smileSignal(landmarks, box) {
  if (!landmarks || !box) return 0;
  const mouth = landmarks.getMouth();
  if (!mouth || mouth.length < 12) return 0;
  // getMouth() = 20 points (face-api 48..67). Outer corners at indices 0 and 6,
  // upper lip center near index 3.
  const left = mouth[0];
  const right = mouth[6];
  const top = mouth[3];
  const cornerY = (left.y + right.y) / 2;
  return Math.max(0, (top.y - cornerY) / Math.max(1, box.height));
}

export function shannonEntropy(values) {
  let total = 0;
  for (const v of values) total += v;
  if (total <= 0) return 0;
  let h = 0;
  for (const v of values) {
    if (v <= 0) continue;
    const p = v / total;
    h -= p * Math.log(p);
  }
  return h / Math.log(values.length); // normalised to [0, 1]
}

export function stdev(values) {
  if (values.length === 0) return 0;
  let mean = 0;
  for (const v of values) mean += v;
  mean /= values.length;
  let variance = 0;
  for (const v of values) variance += (v - mean) * (v - mean);
  return Math.sqrt(variance / values.length);
}

// -----------------------------------------------------------------------------
// Sadness trend (leaky integrator)
// -----------------------------------------------------------------------------

/**
 * Drives a [0, 1] score upward when expressions look sad-leaning *consistently*
 * over time, even when single-frame `neutral` outscores `sad`. Decays toward
 * the per-frame target with time-constant `tau` seconds.
 *
 * Rationale: face-api's `neutral` is a sink for low-affect frames. Persistent
 * sad signal (sad mid-range + happy absent + low expression energy) is a
 * stronger evidence than any individual frame.
 */
export function sadnessFrameSignal(expressions) {
  const sad = expressions.sad ?? 0;
  const happy = expressions.happy ?? 0;
  const neutral = expressions.neutral ?? 0;
  const fearful = expressions.fearful ?? 0;

  if (happy > 0.4) return 0;
  if (sad >= 0.55) return 1.0;
  if (sad >= 0.35) return 0.85;
  if (sad >= 0.22 && happy < 0.15) return 0.6;
  if (neutral >= 0.5 && sad >= 0.18 && happy < 0.12) return 0.45;
  if (fearful >= 0.3 && sad >= 0.15) return 0.4;
  if (neutral >= 0.7 && sad < 0.1 && happy < 0.05) return 0.15; // emotionally flat → mild lean
  return 0;
}

export function updateSadnessTrend(prev, expressions, dtMs, tau = BEHAVIORAL_CONFIG.sadnessTrendTau) {
  const target = sadnessFrameSignal(expressions);
  const dt = Math.max(0, dtMs) / 1000;
  const alpha = 1 - Math.exp(-dt / Math.max(0.1, tau));
  const next = prev + (target - prev) * alpha;
  return Math.max(0, Math.min(1, next));
}

// -----------------------------------------------------------------------------
// Composite state interpreter
// -----------------------------------------------------------------------------

const QUALITATIVE = {
  blink: (rate) => {
    const b = BEHAVIORAL_CONFIG.blinkRateBands;
    if (rate < b.veryLow) return 'very low';
    if (rate < b.low) return 'low';
    if (rate < b.elevated) return 'normal';
    if (rate < b.high) return 'elevated';
    return 'high';
  },
  smile: (freq) => (freq < 0.05 ? 'low' : freq < 0.2 ? 'occasional' : freq < 0.5 ? 'frequent' : 'high'),
  movement: (score) => (score < 0.15 ? 'low' : score < 0.35 ? 'normal' : score < 0.6 ? 'restless' : 'very restless'),
  variability: (v) => (v < 0.18 ? 'flat' : v < 0.4 ? 'normal' : v < 0.7 ? 'expressive' : 'chaotic'),
  gaze: (s) => (s > 0.75 ? 'stable' : s > 0.5 ? 'moderate' : s > 0.25 ? 'unstable' : 'avoidant'),
};

/**
 * Maps the quantitative behavioural profile to a human-readable composite state.
 * Priority order matters — first match wins. Tunable; thresholds are deliberately
 * conservative so the label stays close to "calm" until the evidence accumulates.
 */
export function deriveCompositeState(metrics) {
  const {
    blinkRate = 0,
    smileFrequency = 0,
    movementScore = 0,
    expressionVariability = 0,
    gazeStability = 1,
    sadnessTrend = 0,
    smileTrendDelta = 0,
    samples = 0,
  } = metrics;

  if (samples < 6) {
    return { state: 'observing', tone: 'neutral', label: 'Observing', confidence: 0.2 };
  }

  if (smileFrequency > 0.35 && sadnessTrend < 0.3) {
    return { state: 'engaged', tone: 'positive', label: 'Emotionally engaged', confidence: 0.7 };
  }

  if (sadnessTrend >= 0.6) {
    return { state: 'sad', tone: 'negative', label: 'Sad', confidence: sadnessTrend };
  }
  if (sadnessTrend >= 0.35) {
    return { state: 'mildly_sad', tone: 'negative', label: 'Mildly sad', confidence: sadnessTrend };
  }

  if (blinkRate > BEHAVIORAL_CONFIG.blinkRateBands.high && (movementScore > 0.4 || gazeStability < 0.4)) {
    return { state: 'anxious', tone: 'warn', label: 'Anxious / restless', confidence: 0.7 };
  }
  if (blinkRate > BEHAVIORAL_CONFIG.blinkRateBands.elevated && movementScore > 0.35) {
    return { state: 'stressed', tone: 'warn', label: 'Stressed', confidence: 0.6 };
  }

  if (
    expressionVariability < 0.18 &&
    smileFrequency < 0.05 &&
    movementScore < 0.2 &&
    smileTrendDelta <= 0
  ) {
    return { state: 'subdued', tone: 'negative', label: 'Emotionally subdued', confidence: 0.55 };
  }

  if (gazeStability < 0.4 && movementScore > 0.25) {
    return { state: 'uneasy', tone: 'warn', label: 'Uneasy', confidence: 0.5 };
  }

  return { state: 'calm', tone: 'neutral', label: 'Calm / neutral', confidence: 0.5 };
}

export const qualitativeLabels = QUALITATIVE;

// -----------------------------------------------------------------------------
// BehavioralTracker
// -----------------------------------------------------------------------------

const empty = () => ({
  blinkCount: 0,
  movementSum: 0,
  movementSamples: 0,
  movementVelocities: [],
  smileFrameCount: 0,
  smileSum: 0,
  expressionsSum: Object.fromEntries(EMOTIONS.map((e) => [e, 0])),
  dominantHistory: [],
  gazeOffsets: [],
  earSamples: [],
  startTime: null,
  endTime: null,
  samples: 0,
  sadnessTrend: 0,
});

function summariseSegment(seg, livePartial = false) {
  if (!seg || seg.samples === 0) {
    return {
      samples: 0,
      durationMs: 0,
      blinkRate: 0,
      smileFrequency: 0,
      movementScore: 0,
      expressionVariability: 0,
      gazeStability: 1,
      sadnessTrend: seg?.sadnessTrend ?? 0,
      averagedExpressions: Object.fromEntries(EMOTIONS.map((e) => [e, 0])),
      dominantEmotion: 'uncertain',
      partial: livePartial,
    };
  }

  const durationMs = (seg.endTime ?? Date.now()) - (seg.startTime ?? Date.now());
  const durationMin = Math.max(1 / 60, durationMs / 60000); // protect against /0

  const movementMean =
    seg.movementSamples > 0 ? seg.movementSum / seg.movementSamples : 0;
  const movementJitter = stdev(seg.movementVelocities);

  const averaged = Object.fromEntries(
    EMOTIONS.map((e) => [e, (seg.expressionsSum[e] ?? 0) / seg.samples])
  );

  // Variability: combine entropy of avg distribution with entropy of dominant history.
  const distEntropy = shannonEntropy(EMOTIONS.map((e) => averaged[e]));
  const dominantCounts = {};
  for (const d of seg.dominantHistory) dominantCounts[d] = (dominantCounts[d] || 0) + 1;
  const dominantEntropy = shannonEntropy(EMOTIONS.map((e) => dominantCounts[e] ?? 0));
  const variability = 0.5 * distEntropy + 0.5 * dominantEntropy;

  // Gaze stability: 1 - normalised stdev of dx/dy
  const gazeStd = (stdev(seg.gazeOffsets.map((g) => g.dx)) + stdev(seg.gazeOffsets.map((g) => g.dy))) / 2;
  const gazeStability = Math.max(0, Math.min(1, 1 - gazeStd * 6));

  let dominantEmotion = 'uncertain';
  let bestScore = -Infinity;
  for (const e of EMOTIONS) {
    if (averaged[e] > bestScore) {
      bestScore = averaged[e];
      dominantEmotion = e;
    }
  }

  return {
    samples: seg.samples,
    durationMs,
    blinkRate: seg.blinkCount / durationMin,
    smileFrequency: seg.smileFrameCount / seg.samples,
    smileMeanIntensity: seg.smileSum / seg.samples,
    movementScore: Math.min(1, movementMean * 4 + movementJitter * 6),
    expressionVariability: variability,
    gazeStability,
    sadnessTrend: seg.sadnessTrend,
    averagedExpressions: averaged,
    dominantEmotion,
    partial: livePartial,
  };
}

export class BehavioralTracker {
  constructor(config = {}) {
    this.config = { ...BEHAVIORAL_CONFIG, ...config };
    this.session = empty();
    this.live = empty(); // rolling tail (live composite)
    this.liveBuffer = []; // holds last N raw frames so we can age them out

    this.eyeOpen = true;
    this.lastBlinkTime = 0;
    this.lastFrameTime = null;
    this.lastBoxCenter = null;
    this.lastBoxWidth = null;

    this.activeSegment = null;
    this.activeQuestion = null;
    this.completedQuestions = [];
  }

  reset() {
    this.session = empty();
    this.live = empty();
    this.liveBuffer = [];
    this.eyeOpen = true;
    this.lastBlinkTime = 0;
    this.lastFrameTime = null;
    this.lastBoxCenter = null;
    this.lastBoxWidth = null;
    this.activeSegment = null;
    this.activeQuestion = null;
    this.completedQuestions = [];
  }

  /**
   * Called when no valid face is in frame. Doesn't reset session totals,
   * just decays the live window so stale signals don't linger.
   */
  noteEmptyFrame() {
    this.lastBoxCenter = null;
    this.lastBoxWidth = null;
    this.eyeOpen = true; // avoid spurious blink on re-acquisition
    if (this.liveBuffer.length > 0) this.liveBuffer.shift();
  }

  /**
   * Ingest one valid detection. Returns the live behavioural snapshot.
   * `expressions` is the raw face-api expression dict.
   */
  ingest({ box, landmarks, expressions, timestamp = Date.now() }) {
    const now = timestamp;
    const dtMs = this.lastFrameTime != null ? now - this.lastFrameTime : 0;
    this.lastFrameTime = now;

    const ear = avgEAR(landmarks);
    const center = boxCenter(box);
    const smile = smileSignal(landmarks, box);
    const gaze = gazeOffset(landmarks, box);

    let dominant = EMOTIONS[0];
    let topScore = -Infinity;
    for (const e of EMOTIONS) {
      const s = expressions[e] ?? 0;
      if (s > topScore) {
        topScore = s;
        dominant = e;
      }
    }

    // Blink edge detection with hysteresis + min-gap.
    if (this.eyeOpen && ear < this.config.earClosedThreshold) {
      this.eyeOpen = false;
      if (now - this.lastBlinkTime >= this.config.blinkMinGapMs) {
        this._registerBlink(now);
      }
    } else if (!this.eyeOpen && ear > this.config.earOpenThreshold) {
      this.eyeOpen = true;
    }

    // Movement (normalised by face width — closer face = larger pixel deltas).
    let movementVel = 0;
    if (this.lastBoxCenter != null && this.lastBoxWidth) {
      const px = dist(center, this.lastBoxCenter);
      movementVel = px / this.lastBoxWidth;
    }
    this.lastBoxCenter = center;
    this.lastBoxWidth = box.width;

    // Sadness trend: integrate against the always-on session integrator.
    const nextSadness = updateSadnessTrend(
      this.session.sadnessTrend,
      expressions,
      dtMs,
      this.config.sadnessTrendTau
    );
    this.session.sadnessTrend = nextSadness;
    this.live.sadnessTrend = nextSadness;

    const frame = {
      t: now,
      ear,
      center,
      boxWidth: box.width,
      movementVel,
      smile,
      gaze,
      dominant,
      expressions: { ...expressions },
    };

    this._recordToSegment(this.session, frame);
    if (this.session.samples > this.config.sessionWindowMax) {
      // hard cap — older rolled-up data still lives in completed question segments.
    }

    this._recordToSegment(this.live, frame);
    this.liveBuffer.push(frame);
    while (this.liveBuffer.length > this.config.liveWindowSize) {
      const dropped = this.liveBuffer.shift();
      this._unrecordFromSegment(this.live, dropped);
    }

    if (this.activeSegment) this._recordToSegment(this.activeSegment, frame);

    return this.snapshot();
  }

  _registerBlink(now) {
    this.lastBlinkTime = now;
    this.session.blinkCount += 1;
    this.live.blinkCount += 1;
    if (this.activeSegment) this.activeSegment.blinkCount += 1;
  }

  _recordToSegment(seg, frame) {
    seg.samples += 1;
    if (seg.startTime == null) seg.startTime = frame.t;
    seg.endTime = frame.t;
    seg.movementSum += frame.movementVel;
    seg.movementSamples += 1;
    seg.movementVelocities.push(frame.movementVel);
    if (seg.movementVelocities.length > 60) seg.movementVelocities.shift();
    seg.smileSum += frame.smile;
    if ((frame.expressions.happy ?? 0) >= this.config.smileFrameThreshold) seg.smileFrameCount += 1;
    for (const e of EMOTIONS) seg.expressionsSum[e] += frame.expressions[e] ?? 0;
    seg.dominantHistory.push(frame.dominant);
    if (seg.dominantHistory.length > 200) seg.dominantHistory.shift();
    seg.gazeOffsets.push(frame.gaze);
    if (seg.gazeOffsets.length > 200) seg.gazeOffsets.shift();
    seg.earSamples.push(frame.ear);
    if (seg.earSamples.length > 200) seg.earSamples.shift();
  }

  _unrecordFromSegment(seg, frame) {
    if (!frame || seg.samples === 0) return;
    seg.samples -= 1;
    seg.movementSum -= frame.movementVel;
    seg.movementSamples = Math.max(0, seg.movementSamples - 1);
    seg.smileSum -= frame.smile;
    if ((frame.expressions.happy ?? 0) >= this.config.smileFrameThreshold) {
      seg.smileFrameCount = Math.max(0, seg.smileFrameCount - 1);
    }
    for (const e of EMOTIONS) seg.expressionsSum[e] = Math.max(0, seg.expressionsSum[e] - (frame.expressions[e] ?? 0));
    if (seg.startTime != null && seg.samples === 0) {
      seg.startTime = null;
      seg.endTime = null;
    } else if (seg.samples > 0 && this.liveBuffer.length > 0) {
      seg.startTime = this.liveBuffer[0].t;
      seg.endTime = this.liveBuffer[this.liveBuffer.length - 1].t;
    }
  }

  // ---------------------------------------------------------------------------
  // Question lifecycle
  // ---------------------------------------------------------------------------

  beginQuestion(meta = {}) {
    if (this.activeQuestion) this.endQuestion();
    const baseline = this.snapshot();
    this.activeSegment = empty();
    this.activeQuestion = {
      meta,
      startedAt: new Date().toISOString(),
      baseline: {
        sadnessTrend: baseline.sadnessTrend,
        smileFrequency: baseline.smileFrequency,
        blinkRate: baseline.blinkRate,
        movementScore: baseline.movementScore,
        gazeStability: baseline.gazeStability,
        expressionVariability: baseline.expressionVariability,
      },
    };
    return this.activeQuestion;
  }

  endQuestion(meta = {}) {
    if (!this.activeQuestion) return null;
    const segSummary = summariseSegment(this.activeSegment, false);
    const baseline = this.activeQuestion.baseline;
    const composite = deriveCompositeState(segSummary);
    const result = {
      ...this.activeQuestion,
      ...meta,
      endedAt: new Date().toISOString(),
      summary: segSummary,
      compositeState: composite,
      shifts: {
        sadnessTrend: segSummary.sadnessTrend - (baseline.sadnessTrend ?? 0),
        smileFrequency: segSummary.smileFrequency - (baseline.smileFrequency ?? 0),
        blinkRate: segSummary.blinkRate - (baseline.blinkRate ?? 0),
        movementScore: segSummary.movementScore - (baseline.movementScore ?? 0),
        gazeStability: segSummary.gazeStability - (baseline.gazeStability ?? 1),
      },
      qualitative: {
        blink: qualitativeLabels.blink(segSummary.blinkRate),
        smile: qualitativeLabels.smile(segSummary.smileFrequency),
        movement: qualitativeLabels.movement(segSummary.movementScore),
        variability: qualitativeLabels.variability(segSummary.expressionVariability),
        gaze: qualitativeLabels.gaze(segSummary.gazeStability),
      },
    };
    this.completedQuestions.push(result);
    this.activeSegment = null;
    this.activeQuestion = null;
    return result;
  }

  // ---------------------------------------------------------------------------
  // Snapshots
  // ---------------------------------------------------------------------------

  /**
   * Live snapshot for the UI: short-window metrics + composite state.
   */
  snapshot() {
    const live = summariseSegment(this.live, true);
    const session = summariseSegment(this.session, true);

    // smileTrend delta: live window vs prior session window
    const smileTrendDelta = live.smileFrequency - session.smileFrequency;

    const composite = deriveCompositeState({ ...live, smileTrendDelta });

    return {
      ...live,
      smileTrendDelta,
      composite,
      qualitative: {
        blink: qualitativeLabels.blink(live.blinkRate),
        smile: qualitativeLabels.smile(live.smileFrequency),
        movement: qualitativeLabels.movement(live.movementScore),
        variability: qualitativeLabels.variability(live.expressionVariability),
        gaze: qualitativeLabels.gaze(live.gazeStability),
      },
    };
  }

  /**
   * Final session-level analytics — the payload to ship to a summary screen.
   */
  getSessionSummary() {
    const session = summariseSegment(this.session, false);
    const composite = deriveCompositeState(session);
    return {
      generatedAt: new Date().toISOString(),
      ...session,
      composite,
      qualitative: {
        blink: qualitativeLabels.blink(session.blinkRate),
        smile: qualitativeLabels.smile(session.smileFrequency),
        movement: qualitativeLabels.movement(session.movementScore),
        variability: qualitativeLabels.variability(session.expressionVariability),
        gaze: qualitativeLabels.gaze(session.gazeStability),
      },
      perQuestion: this.completedQuestions,
      activeQuestion: this.activeQuestion ? { ...this.activeQuestion, partial: true } : null,
    };
  }
}

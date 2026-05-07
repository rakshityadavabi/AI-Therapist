import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

let activeBackend = null;

/**
 * Configure TensorFlow.js backend for face-api.js with WebGL → CPU fallback.
 * Idempotent: subsequent calls return the already-resolved backend.
 */
export const configureTensorFlow = async () => {
  if (activeBackend) return activeBackend;

  try {
    await tf.setBackend('webgl');
    await tf.ready();
    activeBackend = 'webgl';
    return activeBackend;
  } catch {
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      activeBackend = 'cpu';
      return activeBackend;
    } catch {
      const available = Object.keys(tf.engine().registryFactory ?? {});
      if (available.length > 0) {
        await tf.setBackend(available[0]);
        await tf.ready();
        activeBackend = available[0];
        return activeBackend;
      }
      throw new Error('Unable to initialize any TensorFlow.js backend');
    }
  }
};

export const getActiveBackend = () => activeBackend;

export const isTensorFlowReady = () => {
  try {
    return tf.ready() && tf.getBackend() !== null;
  } catch {
    return false;
  }
};

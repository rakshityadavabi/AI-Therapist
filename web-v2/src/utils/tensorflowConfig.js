import * as tf from '@tensorflow/tfjs';

/**
 * Configure TensorFlow.js backend for face-api.js with WebGL → CPU fallback.
 */
export const configureTensorFlow = async () => {
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    return 'webgl';
  } catch {
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      return 'cpu';
    } catch {
      const backends = tf.engine().registryFactory;
      const available = Object.keys(backends);
      if (available.length > 0) {
        await tf.setBackend(available[0]);
        await tf.ready();
        return available[0];
      }
      throw new Error('Unable to initialize any TensorFlow.js backend');
    }
  }
};

export const isTensorFlowReady = () => {
  try {
    return tf.ready() && tf.getBackend() !== null;
  } catch {
    return false;
  }
};

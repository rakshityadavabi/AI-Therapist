import * as tf from '@tensorflow/tfjs';

/**
 * Configure TensorFlow.js backend for face-api.js
 * This helps avoid WebGL errors and provides fallback options
 */
export const configureTensorFlow = async () => {
  try {
    // First, try to set WebGL backend
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('TensorFlow.js WebGL backend initialized successfully');
    return 'webgl';
  } catch (webglError) {
    console.warn('WebGL backend failed, trying CPU backend:', webglError.message);
    
    try {
      // Fallback to CPU backend
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('TensorFlow.js CPU backend initialized successfully');
      return 'cpu';
    } catch (cpuError) {
      console.error('Both WebGL and CPU backends failed:', cpuError.message);
      
      // Final fallback - try to use any available backend
      try {
        const backends = tf.engine().registryFactory;
        const availableBackends = Object.keys(backends);
        console.log('Available backends:', availableBackends);
        
        if (availableBackends.length > 0) {
          await tf.setBackend(availableBackends[0]);
          await tf.ready();
          console.log(`Fallback backend initialized: ${availableBackends[0]}`);
          return availableBackends[0];
        }
      } catch (fallbackError) {
        console.error('All TensorFlow.js backends failed:', fallbackError.message);
        throw new Error('Unable to initialize any TensorFlow.js backend');
      }
    }
  }
};

/**
 * Check if TensorFlow.js is ready and properly configured
 */
export const isTensorFlowReady = () => {
  try {
    return tf.ready() && tf.getBackend() !== null;
  } catch (error) {
    console.error('TensorFlow.js readiness check failed:', error);
    return false;
  }
};

/**
 * Get current backend information
 */
export const getBackendInfo = () => {
  try {
    return {
      backend: tf.getBackend(),
      isReady: tf.ready(),
      memory: tf.memory()
    };
  } catch (error) {
    console.error('Failed to get backend info:', error);
    return null;
  }
};
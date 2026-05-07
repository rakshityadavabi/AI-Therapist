import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for robust camera access with multiple fallback strategies
 * Handles permissions, stream management, and error recovery
 */
export const useCamera = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt'); // 'granted', 'denied', 'prompt'
  const [deviceInfo, setDeviceInfo] = useState(null);

  /**
   * Check camera permissions without requesting access
   */
  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions) {
      console.warn('Permissions API not available');
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'camera' });
      setPermissionState(permission.state);
      return permission.state;
    } catch (error) {
      console.warn('Permission check failed:', error);
      return 'unknown';
    }
  }, []);

  /**
   * Get available camera devices
   */
  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      throw new Error('Media devices enumeration not supported');
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices.length);
      setDeviceInfo({
        total: videoDevices.length,
        devices: videoDevices.map(d => ({ id: d.deviceId, label: d.label }))
      });
      
      return videoDevices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      throw error;
    }
  }, []);

  /**
   * Start camera with progressive fallback strategies
   */
  const startCamera = useCallback(async (preferredDeviceId = null) => {
    setIsLoading(true);
    setError(null);

    console.log('🎥 Starting camera with alternate implementation...');

    // Check if getUserMedia is available
    if (!navigator.mediaDevices?.getUserMedia) {
      const errorMsg = 'Camera access not supported in this browser';
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      return false;
    }

    // Strategy 1: High quality with specific device
    const strategies = [
      {
        name: 'High Quality',
        constraints: {
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 30, min: 15 },
            facingMode: 'user',
            ...(preferredDeviceId && { deviceId: { exact: preferredDeviceId } })
          },
          audio: false
        }
      },
      {
        name: 'Medium Quality',
        constraints: {
          video: {
            width: { ideal: 480, min: 240 },
            height: { ideal: 360, min: 180 },
            frameRate: { ideal: 24, min: 10 },
            facingMode: 'user'
          },
          audio: false
        }
      },
      {
        name: 'Basic Quality',
        constraints: {
          video: {
            width: 320,
            height: 240,
            frameRate: 15,
            facingMode: 'user'
          },
          audio: false
        }
      },
      {
        name: 'Minimal',
        constraints: {
          video: true,
          audio: false
        }
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`Trying camera strategy ${i + 1}: ${strategy.name}`);

      try {
        const stream = await navigator.mediaDevices.getUserMedia(strategy.constraints);
        
        console.log('✅ Camera stream obtained:', {
          strategy: strategy.name,
          tracks: stream.getVideoTracks().length,
          settings: stream.getVideoTracks()[0]?.getSettings()
        });

        // Store stream reference
        streamRef.current = stream;

        // Apply stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          await new Promise((resolve, reject) => {
            const video = videoRef.current;
            
            const onLoadedMetadata = () => {
              console.log('📺 Video metadata loaded:', {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                readyState: video.readyState
              });
              cleanup();
              resolve();
            };

            const onError = (error) => {
              console.error('Video element error:', error);
              cleanup();
              reject(error);
            };

            const onTimeout = () => {
              console.warn('Video loading timeout');
              cleanup();
              reject(new Error('Video loading timeout'));
            };

            const cleanup = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              clearTimeout(timeout);
            };

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            const timeout = setTimeout(onTimeout, 5000);

            // Try to play the video
            video.play().catch(playError => {
              console.warn('Video play failed, but continuing:', playError);
              // Don't reject here - the video might still work
            });
          });
        }

        setIsActive(true);
        setIsLoading(false);
        setPermissionState('granted');
        
        // Try to get device info after successful connection
        try {
          await getDevices();
        } catch (deviceError) {
          console.warn('Could not get device info:', deviceError);
        }

        return true;

      } catch (error) {
        console.warn(`Strategy ${i + 1} (${strategy.name}) failed:`, error.message);
        
        // Update permission state based on error
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionState('denied');
        }

        // If this is the last strategy, set the error
        if (i === strategies.length - 1) {
          setError(error.message);
          setIsLoading(false);
          return false;
        }
      }
    }

    setError('All camera access strategies failed');
    setIsLoading(false);
    return false;
  }, [getDevices]);

  /**
   * Stop camera and cleanup
   */
  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setError(null);
  }, []);

  /**
   * Retry camera access
   */
  const retryCamera = useCallback(async () => {
    console.log('🔄 Retrying camera access...');
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
    return startCamera();
  }, [startCamera, stopCamera]);

  /**
   * Get current stream info
   */
  const getStreamInfo = useCallback(() => {
    if (!streamRef.current) return null;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return null;

    return {
      label: videoTrack.label,
      settings: videoTrack.getSettings(),
      capabilities: videoTrack.getCapabilities?.() || {},
      state: videoTrack.readyState
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    stream: streamRef.current,
    isLoading,
    isActive,
    error,
    permissionState,
    deviceInfo,
    startCamera,
    stopCamera,
    retryCamera,
    checkPermissions,
    getDevices,
    getStreamInfo
  };
};
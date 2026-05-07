import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Robust camera hook with progressive fallback strategies.
 * Returns videoRef, lifecycle state, and start/stop/retry helpers.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const [deviceInfo, setDeviceInfo] = useState(null);

  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions) return 'unknown';
    try {
      const permission = await navigator.permissions.query({ name: 'camera' });
      setPermissionState(permission.state);
      return permission.state;
    } catch {
      return 'unknown';
    }
  }, []);

  const getDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      throw new Error('Media devices enumeration not supported');
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    setDeviceInfo({
      total: videoDevices.length,
      devices: videoDevices.map((d) => ({ id: d.deviceId, label: d.label })),
    });
    return videoDevices;
  }, []);

  const startCamera = useCallback(
    async (preferredDeviceId = null) => {
      setIsLoading(true);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access not supported in this browser');
        setIsLoading(false);
        return false;
      }

      const strategies = [
        {
          name: 'High Quality',
          constraints: {
            video: {
              width: { ideal: 640, min: 320 },
              height: { ideal: 480, min: 240 },
              frameRate: { ideal: 30, min: 15 },
              facingMode: 'user',
              ...(preferredDeviceId && { deviceId: { exact: preferredDeviceId } }),
            },
            audio: false,
          },
        },
        {
          name: 'Medium Quality',
          constraints: {
            video: {
              width: { ideal: 480, min: 240 },
              height: { ideal: 360, min: 180 },
              frameRate: { ideal: 24, min: 10 },
              facingMode: 'user',
            },
            audio: false,
          },
        },
        {
          name: 'Basic Quality',
          constraints: {
            video: { width: 320, height: 240, frameRate: 15, facingMode: 'user' },
            audio: false,
          },
        },
        { name: 'Minimal', constraints: { video: true, audio: false } },
      ];

      for (let i = 0; i < strategies.length; i++) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(strategies[i].constraints);
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await new Promise((resolve, reject) => {
              const video = videoRef.current;
              const onLoaded = () => {
                cleanup();
                resolve();
              };
              const onError = (err) => {
                cleanup();
                reject(err);
              };
              const onTimeout = () => {
                cleanup();
                reject(new Error('Video loading timeout'));
              };
              const cleanup = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                clearTimeout(timeout);
              };
              video.addEventListener('loadedmetadata', onLoaded);
              video.addEventListener('error', onError);
              const timeout = setTimeout(onTimeout, 5000);
              video.play().catch(() => {});
            });
          }

          setIsActive(true);
          setIsLoading(false);
          setPermissionState('granted');

          try {
            await getDevices();
          } catch {
            /* ignore */
          }

          return true;
        } catch (err) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setPermissionState('denied');
          }
          if (i === strategies.length - 1) {
            setError(err.message);
            setIsLoading(false);
            return false;
          }
        }
      }

      setError('All camera access strategies failed');
      setIsLoading(false);
      return false;
    },
    [getDevices]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setError(null);
  }, []);

  const retryCamera = useCallback(async () => {
    stopCamera();
    await new Promise((resolve) => setTimeout(resolve, 500));
    return startCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

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
  };
}

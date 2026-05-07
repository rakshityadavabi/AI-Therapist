import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import styled from 'styled-components';
import { configureTensorFlow, isTensorFlowReady } from '../utils/tensorflowConfig';
import { useCamera } from '../hooks/useCamera';

const CameraContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: #f0f0f0;
`;

const VideoElement = styled.video`
  width: 100%;
  height: auto;
  min-height: 240px;
  max-height: 480px;
  display: block;
  transform: scaleX(-1); /* Mirror effect for natural appearance */
  background: #000;
  border-radius: 8px;
  object-fit: cover;
  visibility: visible;
  opacity: 1;
  
  &::-webkit-media-controls {
    display: none !important;
  }
  
  &::-webkit-media-controls-enclosure {
    display: none !important;
  }
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  transform: scaleX(-1); /* Mirror effect to match video */
`;

const EmotionOverlay = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  z-index: 10;
`;

const ErrorMessage = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  margin: 10px 0;
`;

const CameraPlaceholder = styled.div`
  width: 100%;
  min-height: 240px;
  background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
              linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
              linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 2px dashed #ccc;
  color: #666;
  font-size: 16px;
  text-align: center;
  flex-direction: column;
  gap: 10px;
`;

const CameraStatus = styled.div`
  margin-bottom: 10px;
  padding: 8px 12px;
  background: ${props => props.$status === 'active' ? '#d4edda' : props.$status === 'loading' ? '#fff3cd' : '#f8d7da'};
  color: ${props => props.$status === 'active' ? '#155724' : props.$status === 'loading' ? '#856404' : '#721c24'};
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
`;

/**
 * CameraEmotion Component
 * 
 * Provides real-time facial emotion detection using face-api.js
 * Features:
 * - Webcam access and video stream
 * - Face detection and emotion recognition
 * - Visual overlay showing detected emotions
 * - Callback function to report current emotion
 */
const CameraEmotion = ({ onEmotionDetected, isActive = true }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('');
  const [error, setError] = useState('');
  const [stream, setStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('loading'); // 'loading', 'active', 'error'

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      // First configure TensorFlow.js backend
      console.log('Configuring TensorFlow.js backend...');
      await configureTensorFlow();
      
      // Load required models for face detection and emotion recognition
      console.log('Loading face-api.js models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      ]);
      
      // Verify TensorFlow is ready
      if (!isTensorFlowReady()) {
        throw new Error('TensorFlow.js is not properly initialized');
      }
      
      setIsModelLoaded(true);
      console.log('Face detection models loaded successfully');
    } catch (err) {
      console.error('Error loading face-api models:', err);
      setError('Failed to load face detection models. This may be due to missing models or WebGL support issues. Please check your browser compatibility.');
    }
  }, []); // No dependencies needed since configureTensorFlow and isTensorFlowReady are stable

  // Initialize webcam stream
  const startVideo = useCallback(async () => {
    try {
      console.log('Starting camera initialization...');
      setCameraStatus('loading');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Camera access granted, stream obtained:', mediaStream);
      
      if (videoRef.current && mediaStream) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        setStream(mediaStream);
        setError('');
        
        console.log('Stream assigned to video element');
        
        // Simple approach - just try to play
        try {
          await video.play();
          console.log('Video play() succeeded');
          setCameraStatus('active');
          setIsVideoReady(true);
        } catch (playError) {
          console.warn('Video play() failed, but stream is connected:', playError);
          // Even if play fails, the stream might still work
          setCameraStatus('active');
          setIsVideoReady(true);
        }
      } else {
        console.error('Video ref or stream is null');
        throw new Error('Video element not available');
      }
    } catch (err) {
      console.error('Camera initialization failed:', err);
      setCameraStatus('error');
      setError(`Camera error: ${err.message}. Please check permissions and try refreshing.`);
    }
  }, []);

  // Stop video stream
  const stopVideo = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
    setCameraStatus('loading');
  }, [stream]); // Only depend on stream

  // Detect emotions in real-time
  const detectEmotions = useCallback(async () => {
    if (
      !isModelLoaded || 
      !isVideoReady || 
      !videoRef.current || 
      !canvasRef.current ||
      !isActive
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Ensure video is actually playing
    if (video.readyState !== 4 || video.videoWidth === 0) {
      console.log('Video not ready for emotion detection');
      return;
    }
    
    // Set canvas dimensions to match video
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    faceapi.matchDimensions(canvas, displaySize);

    try {
      // Detect faces with expressions
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections && detections.length > 0) {
        // Clear previous drawings
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get resized detections to match canvas
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        // Find the most confident emotion
        const expressions = resizedDetections[0]?.expressions;
        if (expressions) {
          const emotionEntries = Object.entries(expressions);
          const dominantEmotion = emotionEntries.reduce((prev, current) => 
            prev[1] > current[1] ? prev : current
          );

          const emotion = dominantEmotion[0];
          const confidence = dominantEmotion[1];

          // Only update if confidence is above threshold
          if (confidence > 0.3) {
            const emotionLabel = emotion.charAt(0).toUpperCase() + emotion.slice(1);
            setCurrentEmotion(`${emotionLabel} (${Math.round(confidence * 100)}%)`);
            
            // Report emotion to parent component
            if (onEmotionDetected) {
              onEmotionDetected({
                emotion: emotionLabel,
                confidence,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        // Draw face detection boxes (optional, for debugging)
        // faceapi.draw.drawDetections(canvas, resizedDetections);
      } else {
        setCurrentEmotion('No face detected');
      }
    } catch (err) {
      console.error('Error detecting emotions:', err);
    }
  }, [isModelLoaded, isVideoReady, onEmotionDetected, isActive]);

  // Handle video ready state
  const handleVideoLoad = () => {
    console.log('Video loadeddata event fired');
    console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
    console.log('Video readyState:', videoRef.current?.readyState);
    setIsVideoReady(true);
    setCameraStatus('active');
  };

  const handleVideoError = (event) => {
    console.error('Video error event:', event);
    console.error('Video error details:', event.target?.error);
    setCameraStatus('error');
    setError('Video stream error. Please refresh the page and try again.');
  };

  const handleVideoPlay = () => {
    console.log('Video play event fired');
    console.log('Video paused:', videoRef.current?.paused);
    console.log('Video currentTime:', videoRef.current?.currentTime);
    setIsVideoReady(true);
    setCameraStatus('active');
  };

  const handleVideoLoadedMetadata = () => {
    console.log('Video metadata loaded');
    console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
  };

  // Initialize component
  useEffect(() => {
    let isMounted = true;
    
    const initializeComponent = async () => {
      if (isMounted) {
        await loadModels();
      }
    };
    
    initializeComponent();
    
    return () => {
      isMounted = false;
      stopVideo();
    };
  }, [loadModels, stopVideo]);

  // Start video when component mounts and is active (don't wait for models)
  useEffect(() => {
    if (isActive) {
      console.log('Starting video stream immediately...');
      startVideo();
    } else if (!isActive) {
      console.log('Stopping video stream...');
      stopVideo();
    }
  }, [isActive, startVideo, stopVideo]);

  // Run emotion detection loop (only when models are loaded)
  useEffect(() => {
    if (!isVideoReady || !isActive || !isModelLoaded) return;

    console.log('Starting emotion detection loop...');
    const interval = setInterval(detectEmotions, 200); // Run detection every 200ms
    return () => clearInterval(interval);
  }, [detectEmotions, isVideoReady, isActive, isModelLoaded]);

  // Copy models to public folder (this should be done during build)
  useEffect(() => {
    // Note: In a real app, face-api.js models should be placed in public/models/
    // For now, we'll try to load from CDN if local models fail
    const checkModels = async () => {
      try {
        await fetch('/models/tiny_face_detector_model-weights_manifest.json');
      } catch {
        console.warn('Local models not found. Consider copying face-api.js models to public/models/');
      }
    };
    checkModels();
  }, []);

  if (error) {
    return <ErrorMessage role="alert">{error}</ErrorMessage>;
  }

  return (
    <CameraContainer>
      <CameraStatus $status={cameraStatus}>
        {cameraStatus === 'loading' && '📷 Connecting to camera...'}
        {cameraStatus === 'active' && `📷 Camera active ${!isModelLoaded ? '(Loading AI models...)' : '+ AI ready'}`}
        {cameraStatus === 'error' && '❌ Camera error'}
      </CameraStatus>
      
      {/* Always show video element */}
      <VideoElement
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onLoadedData={handleVideoLoad}
        onLoadedMetadata={handleVideoLoadedMetadata}
        onError={handleVideoError}
        onPlay={handleVideoPlay}
        onCanPlay={() => console.log('Video can play - readyState:', videoRef.current?.readyState)}
        onPlaying={() => console.log('Video is now playing')}
        onTimeUpdate={() => {
          if (videoRef.current && videoRef.current.currentTime > 0) {
            console.log('Video time update - video is actually playing');
          }
        }}
        aria-label="Webcam video feed for emotion detection"
        style={{ 
          display: 'block',
          width: '100%',
          minHeight: '240px',
          backgroundColor: '#000'
        }}
      />
      
      {/* Show placeholder when no video */}
      {!stream && (
        <CameraPlaceholder>
          <div>📷</div>
          <div>
            {cameraStatus === 'loading' && 'Requesting camera access...'}
            {cameraStatus === 'error' && 'Camera not available'}
            {cameraStatus === 'active' && 'Camera ready'}
          </div>
          {cameraStatus === 'error' && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              Please allow camera access and refresh the page
            </div>
          )}
        </CameraPlaceholder>
      )}
      
      <Canvas
        ref={canvasRef}
        aria-hidden="true"
      />
      {currentEmotion && (
        <EmotionOverlay aria-live="polite">
          Detected: {currentEmotion}
        </EmotionOverlay>
      )}
    </CameraContainer>
  );
};

export default CameraEmotion;
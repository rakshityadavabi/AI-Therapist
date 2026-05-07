import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import styled from 'styled-components';
import { configureTensorFlow } from '../utils/tensorflowConfig';
import { useCamera } from '../hooks/useCamera';

const CameraContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  border-radius: 0;
  overflow: hidden;
  background: #000000;
  border: 1px solid #333333;
  transition: border-color 0.2s ease;
  
  &:hover {
    border-color: #666666;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    max-width: 100%;
    margin: 0 8px;
    
    &:hover {
      border-color: #333333;
    }
  }
  
  @media (max-width: 480px) {
    margin: 0 4px;
    border-left: none;
    border-right: none;
  }
`;

const VideoElement = styled.video`
  width: 100%;
  height: auto;
  min-height: 280px;
  max-height: 500px;
  display: block;
  transform: scaleX(-1); /* Mirror effect for natural appearance */
  background: #000000;
  object-fit: cover;
  visibility: visible;
  opacity: 1;
  transition: opacity 0.2s ease;
  
  &::-webkit-media-controls {
    display: none !important;
  }
  
  &::-webkit-media-controls-enclosure {
    display: none !important;
  }
  
  &.loading {
    opacity: 0.8;
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
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  color: #000000;
  padding: 8px 12px;
  border: 1px solid #000000;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease;
  
  .emotion-main {
    font-size: 13px;
    margin-bottom: 2px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .emotion-confidence {
    font-size: 10px;
    opacity: 0.6;
    font-weight: 500;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    top: 12px;
    right: 12px;
    padding: 6px 10px;
    font-size: 11px;
    
    .emotion-main {
      font-size: 12px;
    }
    
    .emotion-confidence {
      font-size: 9px;
    }
  }
  
  @media (max-width: 480px) {
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    font-size: 10px;
    
    .emotion-main {
      font-size: 11px;
      gap: 4px;
    }
    
    .emotion-confidence {
      font-size: 8px;
    }
  }
`;

const CameraPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 32px 20px;
  text-align: center;
  color: #ffffff;
  background: #000000;
  
  .camera-icon {
    width: 48px;
    height: 48px;
    border: 2px solid #ffffff;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #ffffff;
    background: transparent;
  }
  
  .status-text {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #ffffff;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  
  .status-subtext {
    font-size: 12px;
    color: #cccccc;
    margin-bottom: 16px;
    max-width: 280px;
    line-height: 1.4;
    font-weight: 400;
  }
`;

const RetryButton = styled.button`
  margin-top: 16px;
  padding: 10px 20px;
  background: #ffffff;
  color: #000000;
  border: 1px solid #ffffff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #000000;
    color: #ffffff;
    border-color: #ffffff;
  }
  
  &:active {
    background: #333333;
  }

  &:disabled {
    background: #666666;
    color: #cccccc;
    border-color: #666666;
    cursor: not-allowed;
  }
  
  &:disabled:hover {
    background: #666666;
    color: #cccccc;
    border-color: #666666;
  }
`;

const CameraStatus = styled.div`
  margin: 0 16px 0 16px;
  padding: 8px 12px;
  background: ${props => {
    switch(props.$status) {
      case 'success': return '#ffffff';
      case 'loading': return '#f8f8f8';
      case 'warning': return '#f0f0f0';
      case 'error': return '#ffffff';
      default: return '#ffffff';
    }
  }};
  color: ${props => {
    switch(props.$status) {
      case 'success': return '#000000';
      case 'loading': return '#666666'; 
      case 'warning': return '#333333';
      case 'error': return '#000000';
      default: return '#333333';
    }
  }};
  border-bottom: 1px solid #e5e5e5;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  .status-icon {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      switch(props.$status) {
        case 'success': return '#000000';
        case 'loading': return '#666666';
        case 'warning': return '#999999';
        case 'error': return '#000000';
        default: return '#cccccc';
      }
    }};
    animation: ${props => props.$status === 'loading' ? 'pulse 1.5s infinite' : 'none'};
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const CameraControls = styled.div`
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 10;
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    bottom: 12px;
    left: 12px;
    right: 12px;
    gap: 6px;
  }
  
  @media (max-width: 480px) {
    bottom: 8px;
    left: 8px;
    right: 8px;
    gap: 4px;
  }
`;

const ControlButton = styled.button`
  padding: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.4);
  }
  
  &:active {
    background: rgba(0, 0, 0, 1);
  }
  
  &.active {
    background: #ffffff;
    color: #000000;
    border-color: #000000;
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  /* Mobile touch-friendly sizing */
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 16px;
    
    &:hover {
      background: rgba(0, 0, 0, 0.8);
      border-color: rgba(255, 255, 255, 0.2);
    }
  }
  
  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    font-size: 14px;
    padding: 6px;
  }
`;

const ConfidenceMeter = styled.div`
  position: absolute;
  bottom: 60px;
  left: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  transform: ${props => props.$visible ? 'translateY(0)' : 'translateY(100%)'};
  opacity: ${props => props.$visible ? 1 : 0};
  transition: all 0.2s ease;
  
  .confidence-label {
    font-size: 9px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 4px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .confidence-bar {
    height: 2px;
    background: #e5e5e5;
    overflow: hidden;
    position: relative;
    
    .confidence-fill {
      height: 100%;
      background: #000000;
      transition: width 0.2s ease;
    }
  }
`;

const CaptureIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  
  .capture-text {
    background: #000000;
    color: #ffffff;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

/**
 * CameraEmotion Component with Robust Camera Implementation
 * 
 * Provides real-time facial emotion detection using face-api.js
 * Features:
 * - Independent camera initialization with multiple fallback strategies
 * - Graceful handling when AI models fail to load
 * - Real-time emotion detection when models are available
 * - Clear user feedback for all states
 */
const CameraEmotion = ({ onEmotionDetected, onPhotoCapture, isActive = true }) => {
  // Use the robust camera hook
  const {
    videoRef,
    isLoading: cameraLoading,
    isActive: cameraActive,
    error: cameraError,
    permissionState,
    deviceInfo,
    startCamera,
    retryCamera
  } = useCamera();

  // AI/Model states (separate from camera)
  const canvasRef = useRef();
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [detectionEnabled, setDetectionEnabled] = useState(false);
  
  // Camera control states
  
  // Photo capture states
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);

  /**
   * Load face-api.js models independently of camera
   */
  const loadModels = useCallback(async () => {
    try {
      console.log('🤖 Loading face-api.js models...');
      
      // Configure TensorFlow backend first
      await configureTensorFlow();
      
      // Always serve models from the app root `/models` so paths work on Vercel
      const modelPath = '/models';

      // Load models in parallel
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
      ]);

      console.log('✅ Face-api.js models loaded successfully');
      setIsModelLoaded(true);
      setModelError(null);
      setDetectionEnabled(true);
      
    } catch (error) {
      console.error('❌ Failed to load face-api.js models:', error);
      setModelError(error.message);
      setIsModelLoaded(false);
      // Don't prevent camera from working
      console.log('📷 Camera will work without AI detection');
    }
  }, []);

  /**
   * Detect emotions in video frame
   */
  const detectEmotions = useCallback(async () => {
    if (!isModelLoaded || !cameraActive || !videoRef.current || !detectionEnabled) {
      return;
    }

    try {
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return; // Video not ready
      }

      // Detect faces with expressions using more sensitive options
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.3  // Lower threshold for better sensitivity
        }))
        .withFaceExpressions();

      if (detections.length > 0) {
        const expressions = detections[0].expressions;
        
        // Find dominant emotion with improved sensitivity
        const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
          expressions[a] > expressions[b] ? a : b
        );

        // Only accept emotions with minimum confidence to reduce noise
        const minConfidence = 0.15; // Lower threshold for better sensitivity
        if (expressions[dominantEmotion] >= minConfidence) {
          const emotion = {
            emotion: dominantEmotion,
            confidence: expressions[dominantEmotion],
            timestamp: Date.now(),
            allExpressions: expressions
          };

          setCurrentEmotion(emotion);
          
          // Report to parent component
          if (onEmotionDetected) {
            onEmotionDetected(emotion);
          }
        }

        // Draw overlay if canvas exists (removed blue detection box)
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          // Removed: faceapi.draw.drawDetections(canvas, resizedDetections); // This draws the blue box
          // Only draw expression labels, not the detection box
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        }
      }
    } catch (error) {
      console.warn('Emotion detection error:', error);
      // Don't disable detection for occasional errors
    }
  }, [isModelLoaded, cameraActive, detectionEnabled, onEmotionDetected, videoRef]);

  // Start camera immediately on mount
  useEffect(() => {
    if (isActive) {
      console.log('🚀 CameraEmotion component mounted, starting camera...');
      startCamera();
    }
  }, [isActive, startCamera]);

  // Load models in parallel (doesn't block camera)
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Run emotion detection loop
  useEffect(() => {
    if (!detectionEnabled || !cameraActive) return;

    const interval = setInterval(() => {
      detectEmotions();
    }, 500); // Detect every 500ms

    return () => clearInterval(interval);
  }, [detectEmotions, detectionEnabled, cameraActive]);

  // Handle camera retry
  const handleRetryCamera = async () => {
    console.log('🔄 User requested camera retry');
    await retryCamera();
  };

  // Handle model retry
  const handleRetryModels = async () => {
    console.log('🔄 User requested model retry');
    setModelError(null);
    await loadModels();
  };

  // Get status information
  const getStatusInfo = () => {
    if (cameraError) {
      return {
        type: 'error',
        title: 'Camera Error',
        message: cameraError,
        action: 'retry-camera'
      };
    }
    
    if (cameraLoading) {
      return {
        type: 'loading',
        title: 'Starting Camera',
        message: 'Requesting camera access...'
      };
    }
    
    if (!cameraActive) {
      return {
        type: 'warning',
        title: 'Camera Inactive',
        message: 'Camera not started'
      };
    }
    
    if (modelError) {
      return {
        type: 'warning',
        title: 'AI Detection Unavailable',
        message: 'Camera works, but emotion detection failed',
        action: 'retry-models'
      };
    }
    
    if (!isModelLoaded) {
      return {
        type: 'loading',
        title: 'Loading AI Models',
        message: 'Camera active, loading emotion detection...'
      };
    }
    
    return {
      type: 'success',
      title: 'Camera & AI Ready',
      message: currentEmotion ? `Detected: ${currentEmotion.emotion}` : 'Ready for detection'
    };
  };

  // Helper function to get emotion icon (minimal symbols)
  const getEmotionIcon = (emotion) => {
    const iconMap = {
      happy: '▲',
      sad: '▼',
      angry: '■',
      fearful: '●',
      disgusted: '◆',
      surprised: '○',
      neutral: '—'
    };
    return iconMap[emotion] || '—';
  };

  // Handle camera flip (simplified to just retry camera)
  const handleFlipCamera = useCallback(() => {
    // Just retry camera to switch between available cameras
    if (cameraActive) {
      retryCamera();
    }
  }, [cameraActive, retryCamera]);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(async (questionData = {}) => {
    if (!videoRef.current || !cameraActive || isCapturing) {
      console.warn('Cannot capture photo: camera not ready or already capturing');
      return null;
    }

    try {
      setIsCapturing(true);
      const video = videoRef.current;
      
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      const photoBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      // Create photo data object
      const photoData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        blob: photoBlob,
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        dimensions: {
          width: canvas.width,
          height: canvas.height
        },
        questionData,
        currentEmotion: currentEmotion ? { ...currentEmotion } : null
      };
      // JSON-friendly representation for exporting / sending to AI
      photoData.jsonRepresentation = {
        id: photoData.id,
        timestamp: photoData.timestamp,
        questionData: photoData.questionData || null,
        dimensions: photoData.dimensions || null,
        currentEmotion: photoData.currentEmotion || null,
        dataUrl: photoData.dataUrl || null
      };
      
      // Store photo
      setCapturedPhotos(prev => [...prev, photoData]);
      
      console.log('📸 Photo captured successfully:', {
        id: photoData.id,
        question: questionData.questionNumber,
        answer: questionData.answer,
        emotion: photoData.currentEmotion?.emotion
      });
      
      // Notify parent component
      if (onPhotoCapture) {
        onPhotoCapture(photoData);
      }
      
      return photoData;
      
    } catch (error) {
      console.error('Failed to capture photo:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [videoRef, cameraActive, isCapturing, currentEmotion, onPhotoCapture]);

  // Expose capturePhoto function to parent component
  useEffect(() => {
    if (onPhotoCapture) {
      // Add capturePhoto to the callback so parent can trigger it
      onPhotoCapture.capturePhoto = capturePhoto;
    }
  }, [capturePhoto, onPhotoCapture]);

  /**
   * Batch process all captured photos for comprehensive emotion analysis
   */
  const processCapturedPhotos = useCallback(async () => {
    if (!isModelLoaded || capturedPhotos.length === 0) {
      console.warn('Cannot process photos: models not loaded or no photos captured');
      return null;
    }

    console.log('🔄 Starting batch emotion analysis for', capturedPhotos.length, 'photos...');
    
    const analysisResults = [];
    
    for (const photo of capturedPhotos) {
      try {
        // Create image element from data URL
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photo.dataUrl;
        });
        
        // Analyze with face-api.js
        const detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        
        let emotionData = null;
        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
          );
          
          emotionData = {
            emotion: dominantEmotion,
            confidence: expressions[dominantEmotion],
            allExpressions: expressions,
            faceDetected: true
          };
        } else {
          emotionData = {
            emotion: 'unknown',
            confidence: 0,
            allExpressions: {},
            faceDetected: false
          };
        }
        
        const jsonRepresentation = {
          id: photo.id,
          timestamp: photo.timestamp,
          questionData: photo.questionData || null,
          dimensions: photo.dimensions || null,
          processedEmotion: emotionData,
          dataUrl: photo.dataUrl || null
        };

        analysisResults.push({
          ...photo,
          processedEmotion: emotionData,
          processingTimestamp: new Date().toISOString(),
          jsonRepresentation
        });
        
        console.log('✅ Processed photo', photo.id, '- Emotion:', emotionData.emotion);
        
      } catch (error) {
        console.error('❌ Failed to process photo', photo.id, ':', error);
        const jsonRepresentation = {
          id: photo.id,
          timestamp: photo.timestamp,
          questionData: photo.questionData || null,
          dimensions: photo.dimensions || null,
          processedEmotion: {
            emotion: 'error',
            confidence: 0,
            allExpressions: {},
            faceDetected: false,
            error: error.message
          },
          dataUrl: photo.dataUrl || null
        };

        analysisResults.push({
          ...photo,
          processedEmotion: {
            emotion: 'error',
            confidence: 0,
            allExpressions: {},
            faceDetected: false,
            error: error.message
          },
          processingTimestamp: new Date().toISOString(),
          jsonRepresentation
        });
      }
    }
    
    console.log('🎉 Batch analysis complete:', analysisResults.length, 'photos processed');
    return analysisResults;
  }, [isModelLoaded, capturedPhotos]);

  // Expose batch processing function
  useEffect(() => {
    if (onPhotoCapture) {
      onPhotoCapture.processCapturedPhotos = processCapturedPhotos;
      onPhotoCapture.getCapturedPhotos = () => capturedPhotos;
    }
  }, [processCapturedPhotos, capturedPhotos, onPhotoCapture]);

  const status = getStatusInfo();

  return (
    <CameraContainer>
      <CameraStatus $status={status.type}>
        <div className="status-icon"></div>
        {status.title}
        {status.message && (
          <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.6, fontWeight: 400 }}>
            {status.message}
          </div>
        )}
      </CameraStatus>
      
      {/* Camera Video Feed */}
      <VideoElement
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ 
          display: (cameraActive || cameraLoading) ? 'block' : 'none'
        }}
        aria-label="Webcam video feed for emotion detection"
      />
      
      {/* Photo Capture Indicator */}
      <CaptureIndicator $visible={isCapturing}>
        <div className="capture-text">Capturing...</div>
      </CaptureIndicator>
      
      {/* Emotion Detection Overlay */}
      {isModelLoaded && cameraActive && (
        <Canvas
          ref={canvasRef}
          style={{
            width: videoRef.current?.clientWidth || '100%',
            height: videoRef.current?.clientHeight || 'auto'
          }}
        />
      )}
      
      {/* Camera Placeholder */}
      {!cameraActive && !cameraLoading && (
        <CameraPlaceholder>
          <div className="camera-icon">□</div>
          <div className="status-text">
            {status.title}
          </div>
          {status.message && (
            <div className="status-subtext">
              {status.message}
            </div>
          )}
          {status.action === 'retry-camera' && (
            <RetryButton onClick={handleRetryCamera}>
              Try Camera Again
            </RetryButton>
          )}
          {status.action === 'retry-models' && (
            <RetryButton onClick={handleRetryModels}>
              Retry AI Models
            </RetryButton>
          )}
        </CameraPlaceholder>
      )}

      {/* Current Emotion Display */}
      {currentEmotion && isModelLoaded && (
        <EmotionOverlay>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {currentEmotion.emotion}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>
            {Math.round(currentEmotion.confidence * 100)}% confident
          </div>
        </EmotionOverlay>
      )}

      {/* Enhanced Emotion Overlay */}
      {currentEmotion && cameraActive && (
        <EmotionOverlay $visible={true}>
          <div className="emotion-main">
            {getEmotionIcon(currentEmotion.emotion)} {currentEmotion.emotion}
          </div>
          <div className="emotion-confidence">
            {Math.round(currentEmotion.confidence * 100)}% confident
          </div>
        </EmotionOverlay>
      )}
      
      {/* Confidence Meter */}
      {currentEmotion && cameraActive && detectionEnabled && (
        <ConfidenceMeter $visible={true}>
          <div className="confidence-label">
            Detection Confidence
          </div>
          <div className="confidence-bar">
            <div 
              className="confidence-fill"
              style={{ width: `${Math.round(currentEmotion.confidence * 100)}%` }}
            />
          </div>
        </ConfidenceMeter>
      )}
      
      {/* Camera Controls */}
      {cameraActive && (
        <CameraControls>
          <ControlButton
            onClick={() => setDetectionEnabled(!detectionEnabled)}
            className={detectionEnabled ? 'active' : ''}
            title={detectionEnabled ? 'Turn off emotion detection' : 'Turn on emotion detection'}
          >
            AI
          </ControlButton>
          
          <ControlButton
            onClick={handleFlipCamera}
            title="Flip camera"
            disabled={!deviceInfo || deviceInfo.total < 2}
          >
            ↻
          </ControlButton>
          
          {capturedPhotos.length > 0 && (
            <ControlButton
              className="photo-count"
              title={`${capturedPhotos.length} photos captured`}
              style={{ 
                fontSize: '10px', 
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#000000',
                border: '1px solid #000000'
              }}
            >
              {capturedPhotos.length}
            </ControlButton>
          )}
        </CameraControls>
      )}
      
      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'absolute', 
          bottom: '-60px', 
          left: 0, 
          right: 0, 
          fontSize: '10px', 
          color: '#666',
          background: 'rgba(255,255,255,0.8)',
          padding: '4px',
          borderRadius: '4px'
        }}>
          Camera: {cameraActive ? 'Active' : 'Inactive'} | 
          Models: {isModelLoaded ? 'Loaded' : 'Loading'} | 
          Permission: {permissionState} |
          Devices: {deviceInfo?.total || 0}
        </div>
      )}
    </CameraContainer>
  );
};

export default CameraEmotion;
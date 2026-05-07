import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  padding: 40px;
  text-align: center;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 12px;
  margin: 20px;
  max-width: 600px;
  margin: 20px auto;
`;

const ErrorTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 15px 0;
  color: #721c24;
`;

const ErrorMessage = styled.p`
  font-size: 16px;
  line-height: 1.5;
  margin: 0 0 20px 0;
  color: #721c24;
`;

const ErrorDetails = styled.details`
  margin: 20px 0;
  text-align: left;
  background: #ffffff;
  border-radius: 6px;
  padding: 15px;
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  font-weight: 500;
  color: #721c24;
  margin-bottom: 10px;
`;

const ErrorStack = styled.pre`
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #495057;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin: 0 10px;
  transition: background-color 0.2s ease;

  &:hover {
    background: #c82333;
  }

  &:focus {
    outline: 2px solid #dc3545;
    outline-offset: 2px;
  }
`;

const InfoBox = styled.div`
  background: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0;
  font-size: 14px;
  line-height: 1.5;
`;

/**
 * Error Boundary Component
 * 
 * Provides comprehensive error handling and user-friendly error messages
 * Features:
 * - Detailed error information for developers
 * - User-friendly error messages
 * - Recovery options
 * - Browser compatibility information
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRestart = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    if (this.props.onRestart) {
      this.props.onRestart();
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      // Determine error type and provide specific guidance
      const isWebGLError = error?.message?.includes('WebGL') || 
                          error?.message?.includes('backend') ||
                          error?.stack?.includes('webgl');
      
      const isCameraError = error?.message?.includes('camera') ||
                           error?.message?.includes('getUserMedia') ||
                           error?.message?.includes('MediaDevices');

      return (
        <ErrorContainer role="alert">
          <ErrorTitle>
            {isWebGLError ? '⚙️ Graphics Processing Error' : 
             isCameraError ? '📷 Camera Access Error' : 
             '❌ Application Error'}
          </ErrorTitle>
          
          <ErrorMessage>
            {isWebGLError ? 
              'The application encountered an issue with graphics processing (WebGL). This is common on some devices or browsers.' :
             isCameraError ?
              'Unable to access your camera. Please check camera permissions and ensure no other applications are using it.' :
              'An unexpected error occurred while running the application.'}
          </ErrorMessage>

          {isWebGLError && (
            <InfoBox>
              <strong>WebGL Solutions:</strong>
              <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                <li>Try refreshing the page - the app will fallback to CPU processing</li>
                <li>Update your browser to the latest version</li>
                <li>Enable hardware acceleration in browser settings</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
              </ul>
            </InfoBox>
          )}

          {isCameraError && (
            <InfoBox>
              <strong>Camera Solutions:</strong>
              <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                <li>Click "Allow" when prompted for camera access</li>
                <li>Check browser permissions for this site</li>
                <li>Close other apps that might be using the camera</li>
                <li>Try refreshing the page and allowing camera access again</li>
              </ul>
            </InfoBox>
          )}

          <div>
            <ActionButton onClick={this.handleReload}>
              Refresh Page
            </ActionButton>
            <ActionButton onClick={this.handleRestart}>
              Try Again
            </ActionButton>
          </div>

          <ErrorDetails>
            <ErrorSummary>Technical Details (for developers)</ErrorSummary>
            <div>
              <strong>Error:</strong> {error?.toString()}
            </div>
            {error?.stack && (
              <div style={{ marginTop: '10px' }}>
                <strong>Stack Trace:</strong>
                <ErrorStack>{error.stack}</ErrorStack>
              </div>
            )}
            {errorInfo?.componentStack && (
              <div style={{ marginTop: '10px' }}>
                <strong>Component Stack:</strong>
                <ErrorStack>{errorInfo.componentStack}</ErrorStack>
              </div>
            )}
          </ErrorDetails>

          <div style={{ 
            marginTop: '20px', 
            fontSize: '12px', 
            color: '#6c757d' 
          }}>
            Browser: {navigator.userAgent}
          </div>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
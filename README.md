# Mental Health Screening Demo

This React application demonstrates an AI-powered mental health screening tool that combines clinical interview questions with real-time facial emotion detection.

## Features

- **Clinical Interview**: 18 questions based on MINI (Mini International Neuropsychiatric Interview) protocol
- **Real-time Emotion Detection**: Uses face-api.js for webcam-based facial emotion recognition
- **Accessible Design**: ARIA labels, keyboard navigation, mobile-responsive interface
- **Privacy-First**: All processing happens locally in the browser
- **Comprehensive Results**: Timeline charts and detailed summary of responses and emotions

## Technologies Used

- React.js with Hooks
- face-api.js for emotion detection
- styled-components for styling
- Chart.js for data visualization
- Local webcam access via MediaDevices API

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Face Detection Models**
   
   The application requires face-api.js models for emotion detection. You have two options:

   **Option A: Download models manually**
   ```bash
   # Create models directory (already created)
   # Download the following files to public/models/:
   # - tiny_face_detector_model-weights_manifest.json
   # - tiny_face_detector_model-shard1
   # - face_expression_model-weights_manifest.json  
   # - face_expression_model-shard1
   # - face_landmark_68_model-weights_manifest.json
   # - face_landmark_68_model-shard1
   ```

   You can download these from the face-api.js GitHub repository:
   https://github.com/justadudewhohacks/face-api.js/tree/master/weights

   **Option B: Use CDN (fallback)**
   
   The app will attempt to load models from CDN if local models are not found.

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Open Application**
   
   Navigate to `http://localhost:3000` in your browser.

## Usage Instructions

### 1. Consent Screen
- Read through the privacy and consent information
- Check the consent checkbox to proceed
- Click "Start Screening" to begin

### 2. Clinical Interview
- Answer each question using the Yes/No/Unsure buttons
- Your webcam will detect facial emotions in real-time
- Navigate using "Previous" and "Next" buttons
- Keyboard shortcuts: 1-3 for answers, Enter to continue, Escape to go back

### 3. Results Summary
- View comprehensive results including:
  - Answer transcript with detected emotions
  - Emotion timeline chart
  - Statistical summary
  - Export functionality for results

## Accessibility Features

- **Screen Reader Support**: ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects prefers-reduced-motion
- **Mobile Responsive**: Touch-friendly interface
- **Skip Links**: Skip to main content functionality

## Privacy & Security

- **Local Processing**: All emotion detection runs in your browser
- **No Data Transmission**: No video or response data sent to servers
- **Temporary Storage**: Session data deleted when browser closes
- **Camera Permissions**: Standard browser camera access controls

## Browser Compatibility

- **Recommended**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Requirements**: 
  - WebRTC support for camera access
  - ES6+ JavaScript support
  - Canvas API support

## Development

### Project Structure
```
src/
├── components/
│   ├── CameraEmotion.js    # Webcam emotion detection
│   ├── ConsentScreen.js    # Privacy consent interface
│   ├── QuestionForm.js     # Question display and interaction
│   └── Summary.js          # Results visualization
├── data/
│   └── questions.json      # MINI protocol questions
├── App.js                  # Main application logic
└── index.js               # Application entry point
```

### Key Components

**CameraEmotion**: Handles webcam access and real-time emotion detection
- Face detection using TinyFaceDetector
- Emotion recognition with confidence scores
- Visual overlay of detected emotions
- Callback system for emotion reporting

**QuestionForm**: Manages individual question presentation
- Accessible radio button interface
- Integration with emotion detection
- Progress tracking and navigation
- Keyboard shortcuts

**Summary**: Displays comprehensive results
- Chart.js integration for data visualization
- Emotion timeline and frequency charts
- Exportable results in JSON format
- Responsive design for mobile devices

### Build and Deploy

```bash
# Create production build
npm run build

# Deploy to static hosting
# The build/ folder contains all static files
```

## Medical Disclaimer

**Important**: This application is for demonstration and educational purposes only. It is not a medical diagnostic tool and should not be used for clinical decision-making. If you're experiencing mental health concerns, please consult with qualified healthcare professionals.

## License

This project is provided as-is for educational purposes. Please ensure compliance with relevant healthcare regulations if adapting for clinical use.

## Support

For technical issues:
1. Check browser console for errors
2. Verify camera permissions are granted
3. Ensure stable internet connection for model loading
4. Try refreshing the page if emotion detection fails

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

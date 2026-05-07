import { render, screen } from '@testing-library/react';
import App from './App';

// Mock MediaDevices for testing environment
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  },
  writable: true
});

// Mock face-api.js for testing
jest.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: jest.fn().mockResolvedValue(true) },
    faceExpressionNet: { loadFromUri: jest.fn().mockResolvedValue(true) },
    faceLandmark68Net: { loadFromUri: jest.fn().mockResolvedValue(true) }
  },
  TinyFaceDetectorOptions: jest.fn(),
  detectAllFaces: jest.fn().mockResolvedValue([]),
  matchDimensions: jest.fn(),
  resizeResults: jest.fn()
}));

test('renders consent screen on initial load', () => {
  render(<App />);
  const consentTitle = screen.getByText(/Mental Health Screening/i);
  expect(consentTitle).toBeInTheDocument();
});

test('displays consent form elements', () => {
  render(<App />);
  
  // Check for consent checkbox
  const consentCheckbox = screen.getByRole('checkbox');
  expect(consentCheckbox).toBeInTheDocument();
  
  // Check for start button (should be disabled initially)
  const startButton = screen.getByText(/Start Screening/i);
  expect(startButton).toBeInTheDocument();
  expect(startButton).toBeDisabled();
});

test('application has proper accessibility structure', () => {
  render(<App />);
  
  // Check for skip link
  const skipLink = screen.getByText(/Skip to main content/i);
  expect(skipLink).toBeInTheDocument();
  
  // Check for main landmark
  const mainContent = screen.getByRole('main');
  expect(mainContent).toBeInTheDocument();
  
  // Check for progress bar
  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toBeInTheDocument();
});

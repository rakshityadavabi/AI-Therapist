import { fireEvent, render, screen } from '@testing-library/react';
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

test('renders intro screen on initial load', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /Mental Health Screening/i })).toBeInTheDocument();
  expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
});

test('displays consent form after intro', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Get Started/i));
  
  // Check for consent checkbox
  const consentCheckbox = screen.getByRole('checkbox');
  expect(consentCheckbox).toBeInTheDocument();
  
  // Check for start button (should be disabled initially)
  const startButton = screen.getByText(/Start Screening/i);
  expect(startButton).toBeInTheDocument();
  expect(startButton).toBeDisabled();
});

test('moves to optional UHID screen after consent', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Get Started/i));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText(/Start Screening/i));

  expect(screen.getByText(/Patient Identifier/i)).toBeInTheDocument();
  expect(screen.getByText(/Skip UHID/i)).toBeInTheDocument();
});

test('skipping voice sections reaches camera-backed questions', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Get Started/i));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText(/Start Screening/i));
  fireEvent.click(screen.getByText(/Skip UHID/i));
  fireEvent.click(screen.getByText(/Skip to Questionnaire/i));
  fireEvent.click(screen.getByRole('button', { name: /Skip structured symptom assessment/i }));

  expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
  expect(screen.getByText(/Photo Capture Status/i)).toBeInTheDocument();
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

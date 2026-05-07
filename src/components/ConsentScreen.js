import React from 'react';
import styled from 'styled-components';

const ConsentContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  background: white;
  border: 2px solid #000000;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000000;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #666666;
  margin: 0;
  font-weight: 500;
`;

const ContentSection = styled.div`
  margin-bottom: 30px;
  padding: 25px;
  background: #ffffff;
  border: 1px solid #000000;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Icon = styled.span`
  font-size: 24px;
`;

const Text = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: #495057;
  margin: 0 0 15px 0;

  &:last-child {
    margin-bottom: 0;
  }
`;

const BulletList = styled.ul`
  padding-left: 20px;
  margin: 0;
`;

const BulletItem = styled.li`
  font-size: 16px;
  line-height: 1.6;
  color: #495057;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ImportantNote = styled.div`
  background: #fff3cd;
  color: #856404;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
  margin: 30px 0;
  text-align: center;
`;

const ConsentCheckbox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 30px 0;
  padding: 20px;
  background: #e7f3ff;
  border-radius: 8px;
  border: 1px solid #b8daff;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 16px;
  line-height: 1.5;
  color: #495057;
  cursor: pointer;
  flex: 1;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 40px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: center;
  }
`;

const Button = styled.button`
  padding: 12px 30px;
  border: 2px solid #000000;
  background: ${props => props.$primary ? '#000000' : '#ffffff'};
  color: ${props => props.$primary ? '#ffffff' : '#000000'};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover {
    background: ${props => props.$primary ? '#333333' : '#f0f0f0'};
  }

  &:focus {
    outline: 2px solid #000000;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/**
 * ConsentScreen Component
 * 
 * Displays informed consent information and privacy notice
 * Features:
 * - Clear explanation of the screening process
 * - Privacy and data usage information
 * - Camera permission notice
 * - Mandatory consent checkbox
 * - Accessibility considerations
 */
const ConsentScreen = ({ onConsent, onDecline }) => {
  const [hasConsented, setHasConsented] = React.useState(false);

  const handleConsentChange = (event) => {
    setHasConsented(event.target.checked);
  };

  const handleStartClick = () => {
    if (hasConsented) {
      onConsent();
    }
  };

  return (
    <ConsentContainer>
      <Header>
        <Title>Mental Health Screening</Title>
        <Subtitle>AI-Powered Clinical Interview Demo</Subtitle>
      </Header>

      <ContentSection>
        <SectionTitle>
          <Icon>ℹ️</Icon>
          About This Screening
        </SectionTitle>
        <Text>
          This is a demonstration of an AI-powered mental health screening tool that combines 
          clinical interview questions with real-time facial emotion detection. The screening 
          is based on the MINI (Mini International Neuropsychiatric Interview) protocol for 
          anxiety and depression assessment.
        </Text>
        <Text>
          <strong>Duration:</strong> Approximately 5-10 minutes<br />
          <strong>Questions:</strong> 18 clinical questions<br />
          <strong>Technology:</strong> Webcam-based emotion detection
        </Text>
      </ContentSection>

      <ContentSection>
        <SectionTitle>
          <Icon>🔒</Icon>
          Privacy & Data Security
        </SectionTitle>
        <Text>
          Your privacy and data security are our top priorities:
        </Text>
        <BulletList>
          <BulletItem>All data processing occurs locally in your browser</BulletItem>
          <BulletItem>No video data or responses are transmitted to external servers</BulletItem>
          <BulletItem>Emotion detection runs entirely on your device</BulletItem>
          <BulletItem>Session data is stored temporarily and deleted when you close the browser</BulletItem>
          <BulletItem>No personal identifying information is collected or stored</BulletItem>
        </BulletList>
      </ContentSection>

      <ContentSection>
        <SectionTitle>
          <Icon>📷</Icon>
          Camera Access & Emotion Detection
        </SectionTitle>
        <Text>
          This application requires access to your device's camera for facial emotion detection:
        </Text>
        <BulletList>
          <BulletItem>Your camera feed is processed locally using face-api.js technology</BulletItem>
          <BulletItem>Emotions are detected in real-time and correlated with your responses</BulletItem>
          <BulletItem>No video recordings are made or stored</BulletItem>
          <BulletItem>You can stop the session at any time</BulletItem>
          <BulletItem>Camera access can be revoked through your browser settings</BulletItem>
        </BulletList>
      </ContentSection>

      <ContentSection>
        <SectionTitle>
          <Icon>⚠️</Icon>
          Important Limitations
        </SectionTitle>
        <Text>
          Please understand the following limitations of this screening tool:
        </Text>
        <BulletList>
          <BulletItem>This is a demonstration tool, not a clinical diagnostic instrument</BulletItem>
          <BulletItem>Results should not be used for medical decision-making</BulletItem>
          <BulletItem>Emotion detection accuracy may vary based on lighting and camera quality</BulletItem>
          <BulletItem>This tool cannot replace professional mental health evaluation</BulletItem>
          <BulletItem>If you're experiencing mental health concerns, please consult a healthcare provider</BulletItem>
        </BulletList>
      </ContentSection>

      <ImportantNote>
        <strong>Medical Disclaimer:</strong> This screening tool is for educational and demonstration 
        purposes only. It is not intended to diagnose, treat, cure, or prevent any medical condition. 
        Always seek the advice of qualified healthcare providers with questions about your mental health.
      </ImportantNote>

      <ConsentCheckbox>
        <Checkbox
          type="checkbox"
          id="consent-checkbox"
          checked={hasConsented}
          onChange={handleConsentChange}
          aria-describedby="consent-description"
        />
        <CheckboxLabel htmlFor="consent-checkbox" id="consent-description">
          I have read and understood the information above. I consent to participate in this 
          mental health screening demonstration. I understand that this is not a medical 
          diagnostic tool and that camera access is required for emotion detection. I acknowledge 
          that all data processing occurs locally and no information is transmitted externally.
        </CheckboxLabel>
      </ConsentCheckbox>

      <ButtonContainer>
        <Button onClick={onDecline}>
          Decline
        </Button>
        <Button 
          $primary 
          onClick={handleStartClick}
          disabled={!hasConsented}
          aria-describedby={!hasConsented ? "consent-required" : undefined}
        >
          Start Screening
        </Button>
      </ButtonContainer>

      {!hasConsented && (
        <div 
          id="consent-required" 
          style={{ 
            textAlign: 'center', 
            color: '#6c757d', 
            fontSize: '14px', 
            marginTop: '10px' 
          }}
        >
          Please read and accept the consent form to proceed
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#f8f9fa', 
        borderRadius: '6px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <strong>Need Help?</strong> If you're experiencing a mental health emergency, 
        please contact your local emergency services or call a mental health crisis hotline immediately.
      </div>
    </ConsentContainer>
  );
};

export default ConsentScreen;
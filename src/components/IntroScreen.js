import React from 'react';
import styled from 'styled-components';

/* ───────── styled-components ───────── */

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 60px 20px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 640px) {
    font-size: 26px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #666666;
  margin: 0 0 40px 0;
  font-weight: 500;
`;

const InfoSection = styled.div`
  text-align: left;
  margin-bottom: 36px;
  padding: 25px;
  border: 1px solid #000000;
  background: #ffffff;
`;

const SectionHeading = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 14px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const BulletList = styled.ul`
  padding-left: 22px;
  margin: 0;
`;

const BulletItem = styled.li`
  font-size: 16px;
  line-height: 1.7;
  color: #495057;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Disclaimer = styled.div`
  background: #fff3cd;
  color: #856404;
  padding: 18px 24px;
  border: 1px solid #ffeaa7;
  margin-bottom: 36px;
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
`;

const StartButton = styled.button`
  padding: 14px 48px;
  border: 2px solid #000000;
  background: #000000;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s ease;

  &:hover {
    background: #333333;
  }

  &:focus {
    outline: 2px solid #000000;
    outline-offset: 4px;
  }
`;

/* ───────── component ───────── */

/**
 * IntroScreen
 *
 * First page the user sees. Explains what the demo does,
 * lists the signal types collected, and provides a non-diagnostic
 * disclaimer. No camera or microphone access is requested here.
 */
const IntroScreen = ({ onGetStarted }) => {
  return (
    <Container role="region" aria-label="Introduction">
      <Title>Mental Health Screening – Demo</Title>
      <Subtitle>AI-Powered Multi-Signal Analysis</Subtitle>

      <InfoSection>
        <SectionHeading>
          <span role="img" aria-label="info">ℹ️</span>
          What This Demo Does
        </SectionHeading>
        <BulletList>
          <BulletItem>
            <strong>Free Speech Analysis</strong> — Speak freely in response to an
            open-ended prompt. Your speech is transcribed and analysed locally for
            word count, pace, and basic sentiment.
          </BulletItem>
          <BulletItem>
            <strong>Facial Emotion Detection</strong> — During a structured
            questionnaire your webcam captures facial expressions in real time
            using on-device AI models.
          </BulletItem>
          <BulletItem>
            <strong>Clinical-Style Questionnaire</strong> — Answer 18 questions
            modelled after the MINI (Mini International Neuropsychiatric Interview).
          </BulletItem>
          <BulletItem>
            <strong>Combined Summary</strong> — At the end you receive a unified
            report covering all three signal types.
          </BulletItem>
        </BulletList>
      </InfoSection>

      <InfoSection>
        <SectionHeading>
          <span role="img" aria-label="lock">🔒</span>
          Privacy
        </SectionHeading>
        <BulletList>
          <BulletItem>Camera emotion detection runs locally in your browser.</BulletItem>
          <BulletItem>No patient record is stored by this demo.</BulletItem>
          <BulletItem>If Gemini AI is configured, text responses and derived summaries may be sent to Gemini for report generation.</BulletItem>
          <BulletItem>Session data is cleared when the page is closed or refreshed unless you export the report.</BulletItem>
        </BulletList>
      </InfoSection>

      <Disclaimer>
        <strong>Disclaimer:</strong> This application is for educational and
        research demonstration purposes only. It is <em>not</em> a medical
        diagnostic tool and should not be used for clinical decision-making. If
        you have mental health concerns, please consult a qualified healthcare
        professional.
      </Disclaimer>

      <StartButton
        onClick={onGetStarted}
        aria-label="Get started with the screening demo"
      >
        Get Started
      </StartButton>
    </Container>
  );
};

export default IntroScreen;

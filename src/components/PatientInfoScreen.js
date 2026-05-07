import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000000;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #555555;
  margin: 0;
`;

const FieldGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  border: 2px solid #000000;
  padding: 14px 16px;
  font-size: 17px;
  font-family: inherit;
  color: #111111;
  background: #ffffff;

  &:focus {
    outline: 2px solid #000000;
    outline-offset: 3px;
  }
`;

const HelpText = styled.div`
  font-size: 13px;
  color: #666666;
  line-height: 1.6;
  margin-top: 10px;
`;

const Notice = styled.div`
  border: 1px solid #000000;
  padding: 16px;
  margin-bottom: 28px;
  font-size: 14px;
  color: #333333;
  line-height: 1.7;
  background: #fafafa;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 12px 28px;
  border: 2px solid #000000;
  background: ${props => props.$primary ? '#000000' : '#ffffff'};
  color: ${props => props.$primary ? '#ffffff' : '#000000'};
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;

  &:hover {
    background: ${props => props.$primary ? '#333333' : '#f2f2f2'};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const PatientInfoScreen = ({ onComplete }) => {
  const [uhid, setUhid] = useState('');
  const normalizedUhid = uhid.trim();

  const complete = (payload) => {
    onComplete({
      ...payload,
      capturedAt: new Date().toISOString(),
      storage: 'local-session-only',
    });
  };

  return (
    <Container role="region" aria-label="Patient identifier">
      <Header>
        <Title>Patient Identifier</Title>
        <Subtitle>Optional UHID entry for this local screening report</Subtitle>
      </Header>

      <Notice>
        UHID is optional. This demo does not connect to a hospital system and does not store patient records.
        If entered, the UHID is held only in this browser session and included in the local report/export.
      </Notice>

      <FieldGroup>
        <Label htmlFor="uhid-input">UHID</Label>
        <Input
          id="uhid-input"
          value={uhid}
          onChange={event => setUhid(event.target.value)}
          placeholder="Enter UHID, or skip"
          autoComplete="off"
          aria-describedby="uhid-help"
        />
        <HelpText id="uhid-help">
          Skip this step if UHID integration is unavailable or the screening should remain unidentified.
        </HelpText>
      </FieldGroup>

      <ButtonRow>
        <Button
          $primary
          disabled={!normalizedUhid}
          onClick={() => complete({ uhid: normalizedUhid, uhidSkipped: false })}
        >
          Continue With UHID
        </Button>
        <Button onClick={() => complete({ uhid: null, uhidSkipped: true })}>
          Skip UHID
        </Button>
      </ButtonRow>
    </Container>
  );
};

export default PatientInfoScreen;

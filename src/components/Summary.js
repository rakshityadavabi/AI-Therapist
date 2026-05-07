import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2'; // eslint-disable-line no-unused-vars
import { generateEmotionAnalysis } from '../services/geminiApi';
import { computeIntegratedRisk, DSM_COLORS } from '../utils/symptomScoring';
import { normalizeEmotionLabel, summarizeFacialSignals, toDisplayEmotion } from '../utils/emotionAnalysis';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

const SummaryContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  color: #000000;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  padding: 20px 0;
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

const Section = styled.div`
  background: #ffffff;
  padding: 30px;
  border: 2px solid #000000;
  border-radius: 0;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Icon = styled.span`
  font-size: 24px;
`;

const AnswersGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const AnswerItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  align-items: center;
  font-size: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: center;
  }
`;

const QuestionText = styled.div`
  font-weight: 500;
  color: #212529;
`;

const AnswerText = styled.div`
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  text-align: center;
  background: ${props => {
    switch (props.answer) {
      case 'Yes': return '#ffffff';
      case 'No': return '#eeeeee';
      case 'Unsure': return '#f5f5f5';
      default: return '#fafafa';
    }
  }};
  color: ${props => {
    switch (props.answer) {
      case 'Yes': return '#000000';
      case 'No': return '#000000';
      case 'Unsure': return '#000000';
      default: return '#000000';
    }
  }};
  border: 1px solid #000000;
`;

const EmotionBadge = styled.div`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #ffffff;
  color: #000000;
  text-align: center;
  border: 2px solid #000000;
`;

const StatCard = styled.div`
  background: #ffffff;
  color: #000000;
  padding: 20px;
  border: 2px solid #000000;
  text-align: center;
  margin-bottom: 20px;
`;

const StatNumber = styled.div`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  opacity: 0.9;
`;

const FullWidthSection = styled(Section)`
  grid-column: 1 / -1;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: center;
  }
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  border: 2px solid ${props => props.$primary ? '#000000' : '#6c757d'};
  background: ${props => props.$primary ? '#000000' : 'white'};
  color: ${props => props.$primary ? 'white' : '#6c757d'};
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#333333' : '#f8f9fa'};
    border-color: ${props => props.$primary ? '#333333' : '#495057'};
  }

  &:focus {
    outline: 2px solid #000000;
    outline-offset: 2px;
  }
`;

const PhotoAnalysisSection = styled(Section)`
  grid-column: 1 / -1;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const PhotoCard = styled.div`
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  
  .photo-header {
    padding: 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-size: 12px;
    font-weight: 500;
    color: #495057;
  }
  
  .photo-image {
    width: 100%;
    height: 120px;
    object-fit: cover;
    background: #f8f9fa;
  }
  
  .photo-details {
    padding: 12px;
    font-size: 11px;
    
    .emotion-result {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      
      .emotion-icon {
        font-size: 16px;
      }
      
      .emotion-name {
        font-weight: 500;
        text-transform: capitalize;
      }
      
      .emotion-confidence {
        color: #6c757d;
      }
    }
    
    .question-info {
      color: #6c757d;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e9ecef;
    }
  }
`;

const AnalysisStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
  
  .stat-card {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
    
    .stat-number {
      font-size: 24px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`;

const AnalysisSection = styled.div`
  background: #000000;
  color: #ffffff;
  padding: 24px;
  margin-bottom: 30px;
  border: 1px solid #333333;
`;

const AnalysisContent = styled.div`
  .analysis-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .analysis-text {
    font-size: 16px;
    line-height: 1.8;
    margin-bottom: 16px;
    white-space: pre-wrap;
    
    /* Format paragraphs properly */
    p {
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  .loading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-style: italic;
    color: #cccccc;
    padding: 20px 0;
  }
`;

// ─── Risk Assessment Styled Components ──────────────────────────────────────

const RiskBanner = styled.div`
  grid-column: 1 / -1;
  border: 3px solid ${p => p.$color};
  background: ${p => p.$bg};
  padding: 28px 32px;
  margin-bottom: 8px;
`;

const RiskHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const RiskLevelBadge = styled.div`
  background: ${p => p.$color};
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  padding: 6px 18px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const RiskScore = styled.div`
  font-size: 40px;
  font-weight: 900;
  color: ${p => p.$color};
  line-height: 1;
`;

const RiskTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #000;
`;

const RiskMeter = styled.div`
  width: 100%;
  height: 12px;
  background: #eee;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const RiskMeterFill = styled.div`
  height: 100%;
  width: ${p => p.$pct}%;
  background: ${p => p.$color};
  border-radius: 6px;
  transition: width 0.5s ease;
`;

const RiskRationaleList = styled.ul`
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
  color: #444;
  line-height: 1.8;
`;

const SafetyOverrideAlert = styled.div`
  background: #c0392b;
  color: #fff;
  padding: 18px 24px;
  margin-top: 16px;
  border-radius: 2px;
`;

const SafetyOverrideTitle = styled.div`
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SafetyOverrideBody = styled.div`
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.95;

  ul { padding-left: 20px; margin: 8px 0 0; }
  li { margin-bottom: 4px; }
`;

// ─── Symptom Scores Styled Components ──────────────────────────────────────

const SymptomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 8px;
`;

const SymptomCard = styled.div`
  border: 2px solid ${p => p.$color};
  background: #fff;
  overflow: hidden;
`;

const SymptomCardHeader = styled.div`
  background: ${p => p.$color};
  color: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SymptomCardIcon = styled.span`
  font-size: 18px;
`;

const SymptomCardLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SymptomCardBody = styled.div`
  padding: 16px;
`;

const SymptomScoreRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
`;

const SymptomScoreNum = styled.div`
  font-size: 36px;
  font-weight: 900;
  color: ${p => p.$color};
  line-height: 1;
`;

const SymptomScoreLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #222;
`;

const SymptomBar = styled.div`
  display: flex;
  gap: 3px;
  margin-bottom: 10px;
`;

const SymptomSeg = styled.div`
  flex: 1;
  height: 6px;
  background: ${p => (p.$filled ? p.$color : '#eee')};
  border-radius: 2px;
`;

const SymptomTranscript = styled.div`
  font-size: 12px;
  color: #666;
  font-style: italic;
  line-height: 1.5;
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
  max-height: 80px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #ccc; }
`;

const SymptomReasoning = styled.div`
  font-size: 11px;
  color: #888;
  margin-top: 6px;
  line-height: 1.5;
`;

// ─── Doctor Insights Styled Components ──────────────────────────────────────

const InsightsSection = styled.div`
  grid-column: 1 / -1;
  border: 2px solid #000;
  padding: 28px 32px;
  background: #fafafa;
`;

const InsightsTitle = styled.h2`
  font-size: 20px;
  font-weight: 800;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const InsightsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
`;

const InsightItem = styled.div`
  background: #fff;
  border: 1px solid #e0e0e0;
  border-left: 4px solid ${p => p.$color || '#000'};
  padding: 14px 16px;
`;

const InsightLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 6px;
`;

const InsightValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111;
  line-height: 1.5;
`;

const DisclaimerBox = styled.div`
  margin-top: 40px;
  padding: 20px 24px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  text-align: center;
  font-size: 13px;
  color: #6c757d;
  line-height: 1.6;
`;

/**
 * Summary Component
 * 
 * Displays comprehensive results including:
 * - Integrated risk assessment (voice symptoms + free speech + emotions)
 * - Structured symptom scores (DSM 0-4)
 * - Answer transcript with emotions
 * - Doctor-friendly clinical insights
 * - Statistical summary
 * - Action buttons for next steps
 */
const Summary = ({ answers, photoAnalysisResults, freeSpeechResults, voiceSymptomResults, patientMeta, finalReportText, onRestart, onExport }) => {
  // Gemini AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  
  // Get API key from environment
  const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Summary Component Data:', {
      answers: answers?.length || 0,
      photoAnalysisResults: photoAnalysisResults?.length || 0,
      answersData: answers,
      photoData: photoAnalysisResults
    });
  }

  // Emotion icon mapping
  const getEmotionIcon = (emotion) => {
    const normalized = normalizeEmotionLabel(emotion);
    const icons = {
      'Happy': '😊',
      'Sad': '😢',
      'Angry': '😠',
      'Fearful': '😰',
      'Disgusted': '🤢',
      'Surprised': '😲',
      'Neutral': '😐'
    };
    return icons[emotion] || icons[toDisplayEmotion(normalized)] || icons.Neutral || 'Neutral';
  };

  // Generate AI analysis automatically (unless parent provided finalReportText)
  const generateAnalysis = async () => {
    if (finalReportText) {
      setAiAnalysis(finalReportText);
      return;
    }

    if (!geminiApiKey) {
      console.warn('Gemini API key not found in environment variables');
      setAiAnalysis("Analysis unavailable: API key not configured. Please check your environment setup.");
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      const analysis = await generateEmotionAnalysis(
        answers,
        photoAnalysisResults,
        freeSpeechResults,
        geminiApiKey,
        voiceSymptomResults,
        patientMeta,
        summarizeFacialSignals(answers, photoAnalysisResults)
      );
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setAiAnalysis("Analysis temporarily unavailable. The system detected your emotional responses and captured photos for review. Consider speaking with a mental health professional for personalized guidance.");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  // Auto-generate analysis when component mounts or data changes
  React.useEffect(() => {
    if (answers.length > 0) {
      generateAnalysis();
    }
  }, [answers, photoAnalysisResults, freeSpeechResults, voiceSymptomResults, patientMeta, finalReportText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process photo analysis data
  const photoAnalysisData = useMemo(() => {
    if (!photoAnalysisResults || photoAnalysisResults.length === 0) {
      return {
        totalPhotos: 0,
        successfulAnalysis: 0,
        averageConfidence: 0,
        emotionAccuracy: 0,
        photos: []
      };
    }

    const successfulPhotos = photoAnalysisResults.filter(photo => 
      photo.processedEmotion && photo.processedEmotion.faceDetected
    );

    const averageConfidence = successfulPhotos.length > 0 
      ? successfulPhotos.reduce((sum, photo) => sum + photo.processedEmotion.confidence, 0) / successfulPhotos.length
      : 0;

    // Calculate emotion accuracy (comparing real-time vs processed)
    const accurateEmotions = successfulPhotos.filter(photo => {
      const realtimeEmotion = photo.currentEmotion?.emotion;
      const processedEmotion = photo.processedEmotion?.emotion;
      return realtimeEmotion && processedEmotion && realtimeEmotion === processedEmotion;
    }).length;

    const emotionAccuracy = successfulPhotos.length > 0 
      ? (accurateEmotions / successfulPhotos.length) * 100 
      : 0;

    return {
      totalPhotos: photoAnalysisResults.length,
      successfulAnalysis: successfulPhotos.length,
      averageConfidence,
      emotionAccuracy,
      photos: photoAnalysisResults
    };
  }, [photoAnalysisResults]);

  // ── Integrated Risk Assessment ──────────────────────────────────────────────
  const integratedRisk = useMemo(() => {
    return computeIntegratedRisk({ voiceSymptomResults, freeSpeechResults, answers, photoAnalysisResults });
  }, [voiceSymptomResults, freeSpeechResults, answers, photoAnalysisResults]);

  // Risk level → color mapping
  const riskColors = { Low: '#27ae60', Moderate: '#e67e22', Elevated: '#e74c3c', High: '#8e1d1d' };
  const riskBgColors = { Low: '#eafaf1', Moderate: '#fef9ef', Elevated: '#fdf0ed', High: '#f9e8e8' };

  // ── Clinical insights (doctor-friendly) ─────────────────────────────────────
  const clinicalInsights = useMemo(() => {
    const insights = [];

    // Speech insights
    if (freeSpeechResults) {
      const wpm = freeSpeechResults.wordsPerMinute ?? 0;
      if (wpm > 0 && wpm < 90) insights.push({ label: 'Speech Rate', value: `${wpm} WPM (below avg) — may indicate psychomotor slowing or low energy`, color: '#e67e22' });
      else if (wpm > 180) insights.push({ label: 'Speech Rate', value: `${wpm} WPM (elevated) — possible anxiety or flight of ideas`, color: '#e67e22' });
      const sentScore = freeSpeechResults.sentiment?.score ?? 0;
      if (sentScore < -0.3) insights.push({ label: 'Speech Sentiment', value: `Negative (${freeSpeechResults.sentiment?.label}) — corroborates depressive or distress markers`, color: '#e74c3c' });
      else if (sentScore > 0.3) insights.push({ label: 'Speech Sentiment', value: `Positive (${freeSpeechResults.sentiment?.label}) — patient expressed optimistic language`, color: '#27ae60' });
    }

    // Symptom score insights
    if (voiceSymptomResults?.length) {
      voiceSymptomResults.forEach(r => {
        if (r.score >= 3) insights.push({ label: `${r.label} Severity`, value: `Score ${r.score}/4 (${r.dsmLabel}) — clinically significant level, warrants focused assessment`, color: DSM_COLORS[r.score] });
        else if (r.score === 2) insights.push({ label: `${r.label} Severity`, value: `Score ${r.score}/4 (${r.dsmLabel}) — mild-moderate; monitor and reassess`, color: DSM_COLORS[r.score] });
      });
      const safetyEntry = voiceSymptomResults.find(r => r.domain === 'safety');
      if (safetyEntry?.safetyFlag) {
        insights.push({ label: 'Safety Risk', value: `Self-harm ideation keywords detected in verbal response. Immediate safety assessment recommended.`, color: '#8e1d1d' });
      }
    }

    // Questionnaire insights
    if (answers?.length) {
      const yesRatio = answers.filter(a => a.answer === 'Yes').length / answers.length;
      if (yesRatio > 0.6) insights.push({ label: 'Symptom Endorsement', value: `${Math.round(yesRatio * 100)}% Yes responses — high symptom endorsement across MINI items`, color: '#e74c3c' });
      const unsureRatio = answers.filter(a => a.answer === 'Unsure').length / answers.length;
      if (unsureRatio > 0.3) insights.push({ label: 'Response Uncertainty', value: `${Math.round(unsureRatio * 100)}% Unsure responses — patient may benefit from guided clarification`, color: '#e67e22' });
    }

    // Emotion insights
    if (answers?.length) {
      const facialSummary = summarizeFacialSignals(answers, photoAnalysisResults);
      const fearfulCount = answers.filter(a => normalizeEmotionLabel(a.emotionSnapshot?.predominantEmotion) === 'fearful').length;
      const sadCount = answers.filter(a => normalizeEmotionLabel(a.emotionSnapshot?.predominantEmotion) === 'sad').length;
      if (facialSummary.available && facialSummary.negativeAffectRatio > 0.35) insights.push({ label: 'Facial Affect', value: `${Math.round(facialSummary.negativeAffectRatio * 100)}% confidence-weighted negative affect across ${facialSummary.sampleCount} samples`, color: '#e74c3c' });
      if (fearfulCount > answers.length * 0.3) insights.push({ label: 'Facial Affect — Fear', value: `Fearful expression detected in ${fearfulCount}/${answers.length} responses — consistent with anxiety presentation`, color: '#e74c3c' });
      if (sadCount > answers.length * 0.3) insights.push({ label: 'Facial Affect — Sadness', value: `Sad affect in ${sadCount}/${answers.length} responses — congruent with depressed mood endorsement`, color: '#3498db' });
    }

    if (insights.length === 0) {
      insights.push({ label: 'Overall Pattern', value: 'No clinically significant markers detected across available modalities.', color: '#27ae60' });
    }
    return insights;
  }, [voiceSymptomResults, freeSpeechResults, answers, photoAnalysisResults]);

  return (
    <SummaryContainer>
      <Header>
        <Title>Mental Health Screening Report</Title>
        <Subtitle>
          Generated {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} &nbsp;·&nbsp; Multi-modal clinical screening summary
        </Subtitle>
      </Header>

      {/* ══ INTEGRATED RISK ASSESSMENT ══════════════════════════════════════ */}
      <FullWidthSection role="region" aria-label="Patient identifier">
        <SectionTitle><Icon>ID</Icon> Patient Identifier</SectionTitle>
        <div style={{ fontSize: '15px', color: '#333', lineHeight: 1.7 }}>
          <strong>UHID:</strong>{' '}
          {patientMeta?.uhid ? patientMeta.uhid : 'Skipped / not provided'}
          <br />
          <strong>Storage:</strong> Local browser session only. No patient record is stored by this demo.
        </div>
      </FullWidthSection>

      <RiskBanner
        $color={riskColors[integratedRisk.level]}
        $bg={riskBgColors[integratedRisk.level]}
        role="region"
        aria-label="Integrated risk assessment"
      >
        <RiskHeader>
          <RiskScore $color={riskColors[integratedRisk.level]}>{integratedRisk.score}</RiskScore>
          <div>
            <RiskTitle>Integrated Risk Score</RiskTitle>
            <RiskLevelBadge $color={riskColors[integratedRisk.level]}>
              {integratedRisk.level} Risk
            </RiskLevelBadge>
          </div>
        </RiskHeader>
        <RiskMeter role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={integratedRisk.score}>
          <RiskMeterFill $pct={integratedRisk.score} $color={riskColors[integratedRisk.level]} />
        </RiskMeter>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          Contributing Factors
        </div>
        <RiskRationaleList>
          {integratedRisk.rationale.map((r, i) => <li key={i}>{r}</li>)}
        </RiskRationaleList>

        {/* Safety override */}
        {integratedRisk.safetyOverride && (
          <SafetyOverrideAlert role="alert" aria-live="assertive">
            <SafetyOverrideTitle><span>🚨</span> Safety Override — Elevated Risk</SafetyOverrideTitle>
            <SafetyOverrideBody>
              Self-harm or suicidal ideation indicators were detected in the patient's verbal response. 
              Overall risk has been automatically elevated regardless of other scores.
              <ul>
                <li><strong>Immediate action:</strong> Conduct a thorough safety assessment.</li>
                <li><strong>Crisis Resources (US):</strong> 988 Suicide &amp; Crisis Lifeline — call or text 988</li>
                <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
              </ul>
            </SafetyOverrideBody>
          </SafetyOverrideAlert>
        )}
      </RiskBanner>

      {/* ══ CLINICAL INSIGHTS ═══════════════════════════════════════════════ */}
      <InsightsSection role="region" aria-label="Clinical insights">
        <InsightsTitle><span>🩺</span> Clinical Insights for Clinician Review</InsightsTitle>
        <InsightsList>
          {clinicalInsights.map((ins, i) => (
            <InsightItem key={i} $color={ins.color}>
              <InsightLabel>{ins.label}</InsightLabel>
              <InsightValue>{ins.value}</InsightValue>
            </InsightItem>
          ))}
        </InsightsList>
      </InsightsSection>

      {/* ══ STRUCTURED SYMPTOM SCORES ═══════════════════════════════════════ */}
      {voiceSymptomResults && voiceSymptomResults.length > 0 && (
        <FullWidthSection role="region" aria-label="Structured symptom scores">
          <SectionTitle><Icon>🎙️</Icon> Structured Voice Symptom Assessment (DSM-5 0–4)</SectionTitle>
          <SymptomGrid>
            {voiceSymptomResults.map(r => {
              const col = DSM_COLORS[r.score];
              return (
                <SymptomCard key={r.domain} $color={col}>
                  <SymptomCardHeader $color={col}>
                    <SymptomCardIcon>{r.icon}</SymptomCardIcon>
                    <SymptomCardLabel>{r.label}</SymptomCardLabel>
                    {r.safetyFlag && <span style={{ marginLeft: 'auto', fontSize: 16 }} aria-label="Safety flag">🚨</span>}
                  </SymptomCardHeader>
                  <SymptomCardBody>
                    <SymptomScoreRow>
                      <SymptomScoreNum $color={col}>{r.score}</SymptomScoreNum>
                      <SymptomScoreLabel>{r.dsmLabel}</SymptomScoreLabel>
                    </SymptomScoreRow>
                    <SymptomBar>
                      {[0,1,2,3,4].map(i => (
                        <SymptomSeg key={i} $filled={i <= r.score} $color={col} />
                      ))}
                    </SymptomBar>
                    <SymptomTranscript>
                      "{r.transcript || '(no speech recorded)'}"
                    </SymptomTranscript>
                    <SymptomReasoning>{r.reasoning}</SymptomReasoning>
                    {r.safetyFlag && (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#c0392b', fontWeight: 600 }}>
                        ⚠ Self-harm indicators detected in response
                      </div>
                    )}
                  </SymptomCardBody>
                </SymptomCard>
              );
            })}
          </SymptomGrid>
        </FullWidthSection>
      )}

      {voiceSymptomResults === null && (
        <FullWidthSection>
          <SectionTitle><Icon>🎙️</Icon> Structured Voice Symptom Assessment</SectionTitle>
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#666' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>⏭️</div>
            <p style={{ margin: 0, fontSize: '15px' }}>Structured symptom assessment was skipped.</p>
          </div>
        </FullWidthSection>
      )}

      {/* ══ AI ANALYSIS ═════════════════════════════════════════════════════ */}
      <AnalysisSection>
        <AnalysisContent>
          <div className="analysis-title">
            <span>🤖</span>
            AI-Powered Emotional Analysis
          </div>
          {isGeneratingAnalysis ? (
            <div className="loading">
              <span>🤖</span>
              <span>Generating your personalized analysis...</span>
            </div>
          ) : aiAnalysis ? (
            <div className="analysis-text">{aiAnalysis}</div>
          ) : (
            <div className="analysis-text">
              Your comprehensive emotional analysis is being prepared. This AI-powered insight will provide 
              personalized feedback about your emotional patterns and supportive guidance for your wellbeing.
            </div>
          )}
        </AnalysisContent>
      </AnalysisSection>

      {/* Photo Analysis Results */}
      {photoAnalysisData.totalPhotos > 0 && (
        <PhotoAnalysisSection>
          <SectionTitle>
            <Icon>📸</Icon>
            Facial Expression Analysis
          </SectionTitle>

          <AnalysisStats>
            <div className="stat-card">
              <div className="stat-number">{photoAnalysisData.totalPhotos}</div>
              <div className="stat-label">Photos Captured</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{photoAnalysisData.successfulAnalysis}</div>
              <div className="stat-label">Successful Analysis</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{Math.round(photoAnalysisData.averageConfidence * 100)}%</div>
              <div className="stat-label">Avg Confidence</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{Math.round(photoAnalysisData.emotionAccuracy)}%</div>
              <div className="stat-label">Detection Accuracy</div>
            </div>
          </AnalysisStats>

          <PhotoGrid>
            {photoAnalysisData.photos.map((photo, index) => (
              <PhotoCard key={photo.id}>
                <div className="photo-header">
                  Question {photo.questionData?.questionNumber} - {photo.questionData?.answer}
                </div>
                <img 
                  src={photo.dataUrl} 
                  alt={`Captured during Q${photo.questionData?.questionNumber}`}
                  className="photo-image"
                />
                <div className="photo-details">
                  {photo.processedEmotion?.faceDetected ? (
                    <div className="emotion-result">
                      <span className="emotion-icon">
                        {getEmotionIcon(photo.processedEmotion.emotion)}
                      </span>
                      <span className="emotion-name">
                        {toDisplayEmotion(photo.processedEmotion.emotion)}
                      </span>
                      <span className="emotion-confidence">
                        ({Math.round(photo.processedEmotion.confidence * 100)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="emotion-result">
                      <span className="emotion-icon">❓</span>
                      <span className="emotion-name">No face detected</span>
                    </div>
                  )}
                  <div className="question-info">
                    Captured: {new Date(photo.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </PhotoCard>
            ))}
          </PhotoGrid>
        </PhotoAnalysisSection>
      )}

      {photoAnalysisData.totalPhotos === 0 && (
        <PhotoAnalysisSection>
          <SectionTitle>
            <Icon>📸</Icon>
            Facial Expression Analysis
          </SectionTitle>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666666' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📷</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#000000' }}>No Photos Captured</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Photo capture was not available during this session. 
              Emotion analysis is based on real-time detection only.
            </p>
          </div>
        </PhotoAnalysisSection>
      )}

      {answers?.length > 0 && (
      <FullWidthSection>
        <SectionTitle>
          <Icon>📝</Icon>
          Answer Transcript
        </SectionTitle>
        <AnswersGrid>
          {answers.map((answer, index) => (
            <AnswerItem key={answer.questionId}>
              <QuestionText>
                Q{index + 1}: {answer.questionText}
              </QuestionText>
              <AnswerText answer={answer.answer}>
                {answer.answer}
              </AnswerText>
              <EmotionBadge>
                {getEmotionIcon(answer.emotionAggregate?.dominantEmotion || answer.emotionSnapshot?.predominantEmotion || 'neutral')} {toDisplayEmotion(answer.emotionAggregate?.dominantEmotion || answer.emotionSnapshot?.predominantEmotion || 'neutral')}
              </EmotionBadge>
            </AnswerItem>
          ))}
        </AnswersGrid>
      </FullWidthSection>

      )}

      {/* ── Free Speech Analysis Summary ── */}
      <FullWidthSection>
        <SectionTitle>
          <Icon>🎙️</Icon>
          Free Speech Analysis Summary
        </SectionTitle>

        {freeSpeechResults === null || freeSpeechResults === undefined ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#666' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>⏭️</div>
            <p style={{ margin: 0, fontSize: '15px' }}>
              Free speech section was skipped by the user.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px', padding: '16px', background: '#fafafa', border: '1px solid #e9ecef', fontSize: '14px', lineHeight: 1.7 }}>
              <strong>Prompt:</strong>{' '}
              {freeSpeechResults.prompt || 'Tell me about yourself — how have you been feeling lately?'}
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '8px' }}>Transcribed Text</div>
              <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#222', whiteSpace: 'pre-wrap' }}>
                {freeSpeechResults.transcribedText || '(no speech detected)'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <StatCard>
                <StatNumber>{freeSpeechResults.wordCount ?? '—'}</StatNumber>
                <StatLabel>Words</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{freeSpeechResults.sentenceCount ?? '—'}</StatNumber>
                <StatLabel>Sentences</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{freeSpeechResults.speakingDurationSec ?? '—'}s</StatNumber>
                <StatLabel>Duration</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{freeSpeechResults.wordsPerMinute ?? '—'}</StatNumber>
                <StatLabel>Words / min</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{freeSpeechResults.sentiment?.label ?? '—'}</StatNumber>
                <StatLabel>
                  Sentiment ({freeSpeechResults.sentiment?.score ?? 0})
                  {freeSpeechResults.sentiment?.source === 'ai' && (
                    <span style={{ display: 'block', fontSize: '10px', color: '#666666', marginTop: '4px' }}>
                      ✦ AI-powered
                    </span>
                  )}
                  {freeSpeechResults.sentiment?.source === 'local' && (
                    <span style={{ display: 'block', fontSize: '10px', color: '#666666', marginTop: '4px' }}>
                      ⚠ Local fallback
                    </span>
                  )}
                </StatLabel>
              </StatCard>
            </div>
          </>
        )}
      </FullWidthSection>

      <ActionButtons>
        <ActionButton onClick={onRestart}>
          Start New Session
        </ActionButton>
        <ActionButton $primary onClick={onExport}>
          Export Full Report
        </ActionButton>
      </ActionButtons>

      <DisclaimerBox>
        <strong>Medical Disclaimer:</strong> This is a screening demo for educational and research prototyping purposes only.
        It is <em>not</em> a diagnostic or medical device. No patient record is stored by this demo.
        If Gemini AI is configured, text responses and derived analysis summaries may be sent to Gemini for report generation.
        If you have mental health concerns, please consult a qualified healthcare professional immediately.
        <br /><br />
        <strong>For clinicians:</strong> This report aggregates multi-modal signals (voice, facial expression, self-report) and should be 
        used as a supplementary, non-validated reference only — not as a primary clinical assessment tool.
      </DisclaimerBox>
    </SummaryContainer>
  );
};

export default Summary;

import React, { useState, useEffect } from 'react';
import PresentationEvaluationForm from '../Components/PresentationEvaluationForm';
import PresentationPrint from '../Components/PresentationPrint';
import ProjectReportEvaluationForm from '../Components/ProjectReportEvaluationForm';
import MeetingLogMarksForm from '../Components/MeetingLogMarksForm';
import AwardListTemplate from '../Components/AwardListTemplate';
import { evaluationAPI } from '../utils/api';
import { toast } from 'react-toastify';
import './GroupMarksPage.css';

const GroupMarksPage = ({ group, onBack }) => {
  const [view, setView] = useState('main');
  const [evalLinks, setEvalLinks] = useState([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [sessionalMarks, setSessionalMarks] = useState({});
  const [loadingSessional, setLoadingSessional] = useState(true);
  const [meetingLogMarks, setMeetingLogMarks] = useState(null);
  const [loadingMeetingLog, setLoadingMeetingLog] = useState(true);
  const [presentationData, setPresentationData] = useState(null);
  const [loadingPresentation, setLoadingPresentation] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintable, setShowPrintable] = useState(false);
  const [selectedEvalIdx, setSelectedEvalIdx] = useState(0);

  if (!group) return null;

  useEffect(() => {
    const fetchSessionalMarks = async () => {
      if (!group?.id) {
        setLoadingSessional(false);
        return;
      }
      try {
        const response = await evaluationAPI.getSessionalByGroup(group.id);
        const evaluations = response.data;
        const marksMap = {};
        
        if (evaluations && evaluations.length > 0) {
          evaluations.forEach((evalRecord) => {
            if (evalRecord.student && evalRecord.final_marks !== undefined) {
              marksMap[evalRecord.student] = evalRecord.final_marks;
            }
          });
        }
        setSessionalMarks(marksMap);
      } catch (err) {
        console.error(' Error fetching sessional marks:', err);
      } finally {
        setLoadingSessional(false);
      }
    };

    fetchSessionalMarks();
  }, [group?.id]);

  useEffect(() => {
    const fetchPresentationMarks = async () => {
      if (!group?.id) {
        setLoadingPresentation(false);
        return;
      }
      try {
        const response = await evaluationAPI.getPresentationByGroup(group.id);
        setPresentationData(response.data);
      } catch (err) {
        console.error('Error fetching presentation marks:', err);
        setPresentationData(null);
      } finally {
        setLoadingPresentation(false);
      }
    };

    fetchPresentationMarks();
  }, [group?.id]);

  useEffect(() => {
    const fetchMeetingLogMarks = async () => {
      if (!group?.id) {
        setLoadingMeetingLog(false);
        return;
      }
      try {
        const response = await evaluationAPI.getMeetingLogByGroup(group.id);
        const evaluations = response.data;
        if (evaluations && evaluations.length > 0) {
          setMeetingLogMarks(evaluations[0]);
        } else {
          setMeetingLogMarks(null);
        }
      } catch (err) {
        console.error('Error fetching meeting log marks:', err);
        setMeetingLogMarks(null);
      } finally {
        setLoadingMeetingLog(false);
      }
    };

    fetchMeetingLogMarks();
  }, [group?.id]);

  const generateEvalLink = async () => {
    setGeneratingLink(true);
    try {
      const response = await evaluationAPI.generatePresentationToken(group.id);
      const { token, link } = response.data;
      
      setEvalLinks(prev => [
        ...prev,
        { token, link, generated_at: new Date().toLocaleString(), status: 'active' }
      ]);
      
      navigator.clipboard?.writeText(link);
      toast.success('Evaluation link generated and copied!');
    } catch (err) {
      console.error('Error generating link:', err);
      toast.error('Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  if (view === 'report') {
    return (
      <div className="gmp-container">
        <button className="gmp-back-btn" onClick={() => setView('main')}>
          &larr; Back to Group
        </button>
        <div style={{ margin: '-24px' }}>
          <ProjectReportEvaluationForm
            group={group}
            onClose={() => setView('main')}
          />
        </div>
      </div>
    );
  }

  if (view === 'presentation') {
    return (
      <div className="gmp-container">
        <button className="gmp-back-btn" onClick={() => setView('main')}>
          &larr; Back to Group
        </button>

        <div className="gmp-card" style={{ marginBottom: '20px' }}>
          <div className="gmp-card-body" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#1e3a8a' }}>
              Committee Evaluation Links
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
              Generate unique links for committee members. Each link can be used once and is shared via WhatsApp or Email.
            </p>
            <button className="gmp-evaluate-btn" onClick={generateEvalLink} disabled={generatingLink}>
              {generatingLink ? 'Generating...' : 'Generate New Link'}
            </button>

            {evalLinks.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {evalLinks.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                    background: '#f0f9ff', borderLeft: '3px solid #3b82f6', borderRadius: '6px', padding: '10px 14px'
                  }}>
                    <code style={{ flex: 1, fontSize: '12px', color: '#1e3a8a', wordBreak: 'break-all', minWidth: '200px' }}>
                      {item.link}
                    </code>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                      background: '#fef9c3', color: '#854d0e', whiteSpace: 'nowrap'
                    }}>
                      {item.status}
                    </span>
                    <button
                      onClick={() => copyLink(item.link)}
                      style={{
                        background: 'white', border: '1px solid #bfdbfe', color: '#1e3a8a',
                        padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                        cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <PresentationEvaluationForm
          group={group}
          onClose={() => setView('main')}
          isPublicLink={false}
        />
      </div>
    );
  }

  if (view === 'meetingLog') {
    return (
      <div className="gmp-container">
        <button className="gmp-back-btn" onClick={() => setView('main')}>
          &larr; Back to Group
        </button>
        <div style={{ margin: '-24px' }}>
          <MeetingLogMarksForm
            group={group}
            onClose={() => setView('main')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="gmp-container">
      <div className="gmp-header">
        <button className="gmp-back-btn" onClick={onBack}>
          &larr; Back to Groups
        </button>
        <h1 className="gmp-title">{group.title || group.project}</h1>
        <p className="gmp-subtitle">{group.group} &middot; {group.supervisor}</p>
      </div>

      <div className="gmp-sections">
        {/* Sessional */}
        <div className="gmp-card">
          <div className="gmp-card-header">
            <div>
              <h3>Progress Report (Sessional)</h3>
              <p className="gmp-card-sub">Weightage: 20 marks &middot; Submitted by Supervisor</p>
            </div>
            <span className={`gmp-status-badge ${Object.keys(sessionalMarks).length > 0 ? 'gmp-status-done' : ''}`}>
              {loadingSessional ? 'Loading...' : Object.keys(sessionalMarks).length > 0 ? 'Submitted' : 'Pending'}
            </span>
          </div>
          <div className="gmp-card-body">
            <table className="gmp-readonly-table">
              <tbody>
                {(group.members || []).map((m, idx) => {
                  const marks = sessionalMarks[m.id];
                  return (
                    <tr key={idx}>
                      <td>{m.name}</td>
                      <td className="gmp-right">
                        {loadingSessional ? '...' : marks !== undefined ? `${marks}/20` : '— pending —'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Report */}
        <div className="gmp-card">
          <div className="gmp-card-header">
            <div>
              <h3>Project Report</h3>
              <p className="gmp-card-sub">Weightage: 30 marks &middot; Committee Evaluation</p>
            </div>
            <button className="gmp-evaluate-btn" onClick={() => setView('report')}>
              Evaluate
            </button>
          </div>
        </div>

        {/* Presentation - UPDATED */}
        <div className="gmp-card">
          <div className="gmp-card-header">
            <div>
              <h3>Presentation</h3>
              <p className="gmp-card-sub">Weightage: 40 marks &middot; Committee Evaluation</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {presentationData && presentationData.count > 0 && (
                <button 
                  className="gmp-evaluate-btn" 
                  onClick={() => setShowDetailsModal(true)}
                  style={{ background: '#059669' }}
                >
                  View Details
                </button>
              )}
              <button className="gmp-evaluate-btn" onClick={() => setView('presentation')}>
                Evaluate
              </button>
            </div>
          </div>
          
        </div>

        {/* Meeting Log */}
        <div className="gmp-card">
          <div className="gmp-card-header">
            <div>
              <h3>Meeting Log</h3>
              <p className="gmp-card-sub">Weightage: 10 marks &middot; Based on Supervisor Meetings</p>
            </div>
            <button className="gmp-evaluate-btn" onClick={() => setView('meetingLog')}>
              Evaluate
            </button>
          </div>
        </div>
      </div>

      {/* Award List */}
      <div className="gmp-award-section">
        <AwardListTemplate group={group} />
      </div>

      {/* Presentation Details Modal */}
      {showDetailsModal && presentationData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1e3a8a' }}>Presentation Evaluation Details</h2>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {/* Evaluator-wise Details */}
            <h3 style={{ color: '#1e3a8a', marginBottom: '16px' }}>Evaluator-wise Breakdown</h3>
            {presentationData.results.map((evaluation, idx) => (
              <div key={evaluation.id} style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: '#1e3a8a' }}>
                    Evaluator {idx + 1}: {evaluation.evaluator_name || 'Unknown'}
                  </h4>
                  <button
                    onClick={() => { setSelectedEvalIdx(idx); setShowPrintable(true); }}
                    style={{
                      background: '#fff',
                      color: '#1e3a8a',
                      border: '2px solid #1e3a8a',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Print
                  </button>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#64748b' }}>Presentation (Group):</strong> 
                  <span style={{ marginLeft: '8px', color: '#1e293b' }}>
                    {evaluation.presentation_raw_total}/50
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#64748b' }}>Viva (Student-wise):</strong>
                  <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
                    {Object.entries(evaluation.viva_marks).map(([studentId, marks]) => {
                      const student = group.members.find(m => m.id === parseInt(studentId));
                      return (
                        <div key={studentId} style={{ marginBottom: '4px' }}>
                          {student?.name || `Student ${studentId}`}: {marks}/5
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Per-Student Scaled Marks */}
            <h3 style={{ color: '#1e3a8a', marginBottom: '16px', marginTop: '24px' }}>Final Scaled Marks (Per Student)</h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'white',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: '#1e3a8a', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Raw Total</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Max Possible</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Scaled Marks (/40)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(presentationData.per_student_marks).map(([studentId, data]) => (
                  <tr key={studentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{data.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{data.student_id}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{data.raw_total}/{data.max_possible}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{data.max_possible}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#059669' }}>
                      {data.scaled_marks}/40
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PresentationPrint
        open={showPrintable}
        onClose={() => setShowPrintable(false)}
        group={group}
        presentationMarks={presentationData?.results?.[selectedEvalIdx]?.presentation_criteria_marks || {}}
        vivaMarks={(() => {
          const ev = presentationData?.results?.[selectedEvalIdx];
          if (!ev?.viva_marks) return {};
          const converted = {};
          (group?.members || []).forEach((m, i) => {
            if (ev.viva_marks[m.id] !== undefined) converted[i] = String(ev.viva_marks[m.id]);
          });
          return converted;
        })()}
        comments={presentationData?.results?.[selectedEvalIdx]?.comments || ''}
        evaluatorName={presentationData?.results?.[selectedEvalIdx]?.evaluator_name || ''}
      />
    </div>
  );
};

export default GroupMarksPage;
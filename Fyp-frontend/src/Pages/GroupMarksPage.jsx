import React, { useState, useEffect } from 'react';
import PresentationEvaluationForm from '../Components/PresentationEvaluationForm';
import ProjectReportEvaluationForm from '../Components/ProjectReportEvaluationForm';
import MeetingLogMarksForm from '../Components/MeetingLogMarksForm';
import AwardListTemplate from '../Components/AwardListTemplate';
import { evaluationAPI } from '../utils/api';
import './GroupMarksPage.css';

// view: 'main' | 'report' | 'presentation' | 'meetingLog'
const GroupMarksPage = ({ group, onBack }) => {
  const [view, setView] = useState('main');
  const [evalLinks, setEvalLinks] = useState([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  // Sessional marks database se store karne ke liye
  const [sessionalMarks, setSessionalMarks] = useState({});
  const [loadingSessional, setLoadingSessional] = useState(true);
  // Meeting log marks database se store karne ke liye
  const [meetingLogMarks, setMeetingLogMarks] = useState(null);
  const [loadingMeetingLog, setLoadingMeetingLog] = useState(true);
  // Presentation marks database se store karne ke liye
  const [presentationMarks, setPresentationMarks] = useState(null);
  const [loadingPresentation, setLoadingPresentation] = useState(true);


  if (!group) return null;

  // Group khulte hi real sessional marks fetch karein
  useEffect(() => {
    const fetchSessionalMarks = async () => {
      if (!group?.id) {
        setLoadingSessional(false);
        return;
      }
      try {
        const response = await evaluationAPI.getSessionalByGroup(group.id);
        const evaluations = response.data;


        // Student ID (GroupMember.id) ke against marks ka map banayein
        const marksMap = {};
        
        if (evaluations && evaluations.length > 0) {
          evaluations.forEach((evalRecord, index) => {
            
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


  // Presentation marks fetch karein
  useEffect(() => {
  const fetchPresentationMarks = async () => {
    if (!group?.id) {
      setLoadingPresentation(false);
      return;
    }
    try {
      const response = await evaluationAPI.getPresentationByGroup(group.id);
      setPresentationMarks(response.data.summary);
    } catch (err) {
      console.error('Error fetching presentation marks:', err);
      setPresentationMarks(null);
    } finally {
      setLoadingPresentation(false);
    }
  };

  fetchPresentationMarks();
}, [group?.id]);


   // Meeting log marks fetch karein
  useEffect(() => {
    const fetchMeetingLogMarks = async () => {
      if (!group?.id) {
        setLoadingMeetingLog(false);
        return;
      }
      try {
        const response = await evaluationAPI.getMeetingLogByGroup(group.id);
        const evaluations = response.data;
        

        // Latest evaluation lein (agar multiple hain)
        if (evaluations && evaluations.length > 0) {
          setMeetingLogMarks(evaluations[0]); // First/latest evaluation
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
    
    alert(`Evaluation link generated!\n\n${link}\n\nShare via WhatsApp or Email`);
  } catch (err) {
    console.error('Error generating link:', err);
    alert('Failed to generate link');
  } finally {
    setGeneratingLink(false);
  }
};

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    alert('Link copied!');
  };

  // ---- Sub-pages (navigate, not overlay) ----
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

        {/* Committee Links Section - same as before */}
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

        {/* Admin's own evaluation form - same component as before, untouched */}
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

  // ---- Main consolidated page ----
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

        {/* Sessional / Progress Report — read-only from supervisor */}
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
                        {loadingSessional
                          ? '...'
                          : marks !== undefined
                            ? `${marks}/20`
                            : '— pending —'}
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

        <div className="gmp-card">
          <div className="gmp-card-header">
            <div>
              <h3>Presentation</h3>
              <p className="gmp-card-sub">Weightage: 40 marks &middot; Committee Evaluation</p>
            </div>
            <button className="gmp-evaluate-btn" onClick={() => setView('presentation')}>
              Evaluate
            </button>
          </div>
          
          {/* Scaled marks dikhao */}
          {loadingPresentation ? (
            <p>Loading...</p>
          ) : presentationMarks ? (
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px', marginTop: '12px' }}>
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#065f46' }}>
                <strong>Evaluators:</strong> {presentationMarks.total_evaluators}
              </p>
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#065f46' }}>
                <strong>Scaled Marks:</strong> {presentationMarks.scaled_marks}/40
              </p>
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#047857' }}>
                Total: {presentationMarks.total_obtained}/{presentationMarks.max_possible}
              </p>
            </div>
          ) : (
            <p style={{ padding: '12px', color: '#64748b' }}>Not evaluated yet</p>
          )}
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

      {/* Award List — directly below, not a separate click */}
      <div className="gmp-award-section">
        <AwardListTemplate group={group} />
      </div>

    </div>
  );
};

export default GroupMarksPage;

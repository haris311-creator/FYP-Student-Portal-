import React, { useState } from 'react';
import PresentationEvaluationForm from '../Components/PresentationEvaluationForm';
import ProjectReportEvaluationForm from '../Components/ProjectReportEvaluationForm';
import MeetingLogMarksForm from '../Components/MeetingLogMarksForm';
import AwardListTemplate from '../Components/AwardListTemplate';
import './GroupMarksPage.css';

// view: 'main' | 'report' | 'presentation' | 'meetingLog'
const GroupMarksPage = ({ group, onBack }) => {
  const [view, setView] = useState('main');
  const [evalLinks, setEvalLinks] = useState([]);
  const [generatingLink, setGeneratingLink] = useState(false);

  if (!group) return null;

  const generateEvalLink = async () => {
    setGeneratingLink(true);
    try {
      // Backend API call hogi baad mein:
      // const res = await adminAPI.generateEvalLink(group.id);
      // const token = res.data.token;

      const token = `eval_${group.id}_${Date.now()}`;
      const link = `${window.location.origin}/evaluate/${token}`;

      setEvalLinks(prev => [
        ...prev,
        { token, link, generated_at: new Date().toLocaleString(), status: 'pending' }
      ]);
    } catch (err) {
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
            <span className="gmp-status-badge gmp-status-done">Submitted</span>
          </div>
          <div className="gmp-card-body">
            <table className="gmp-readonly-table">
              <tbody>
                {(group.members || []).map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.name}</td>
                    <td className="gmp-right">
                      {m.sessional_marks !== undefined ? `${m.sessional_marks}/20` : '— pending —'}
                    </td>
                  </tr>
                ))}
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

        {/* Presentation */}
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

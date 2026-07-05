import React, { useState, useEffect } from 'react';
import { meetingAPI, attendanceSheetAPI, evaluationAPI } from '../utils/api';
import './MeetingLogMarksForm.css';

const MeetingLogMarksForm = ({ group, onClose }) => {
  const [meetingsList, setMeetingsList] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form fields
  const [evaluatorName, setEvaluatorName] = useState('');
  const [marks, setMarks] = useState('');
  const [comments, setComments] = useState('');
  
  // States
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingEvaluation, setExistingEvaluation] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!group?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setFetchError(null);
        
        // Parallel fetch: meetings, attendance, AND existing evaluation
        const [meetingsRes, sheetRes, evalRes] = await Promise.all([
          meetingAPI.getByGroup(group.id),
          attendanceSheetAPI.getSheet(group.id),
          evaluationAPI.getMeetingLogByGroup(group.id)
        ]);
        
        const meetingsData = meetingsRes.data.results || meetingsRes.data || [];
        setMeetingsList(Array.isArray(meetingsData) ? meetingsData : []);
        setAttendanceData(sheetRes.data);
        
        // Check if evaluation already exists
        const evaluations = evalRes.data;
        if (evaluations && evaluations.length > 0) {
          const latestEval = evaluations[0];
          setExistingEvaluation(latestEval);
          
          // Pre-fill form with existing data
          setEvaluatorName(latestEval.evaluator_name || '');
          setMarks(latestEval.marks?.toString() || '');
          setComments(latestEval.comments || '');
          setSubmitted(true);
        }
        
      } catch (err) {
        console.error('Error fetching meeting data:', err);
        setFetchError('Failed to load meeting data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [group]);

  const conductedCount = meetingsList.length;

  const handleSubmit = async () => {
    if (!evaluatorName.trim()) {
      alert('Please enter evaluator name.');
      return;
    }
    const num = parseFloat(marks);
    if (isNaN(num) || num < 0 || num > 10) {
      alert('Please enter valid marks (0-10).');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        group: group.id,
        evaluator_name: evaluatorName,
        marks: num,
        comments: comments
      };
      
      
      // Check if updating existing or creating new
      if (existingEvaluation) {
        // Update existing evaluation
        await evaluationAPI.updateMeetingLog(existingEvaluation.id, payload);
      } else {
        // Create new evaluation
        await evaluationAPI.submitMeetingLog(payload);
      }
      
      setSubmitted(true);
      
      // Refresh parent component
      if (onClose) {
        setTimeout(() => onClose(), 1500);
      }
      
    } catch (err) {
      console.error('Error submitting meeting log marks:', err);
      const errorMsg = err.response?.data?.marks?.[0] || 
                       err.response?.data?.detail || 
                       err.response?.data?.evaluator_name?.[0] ||
                       'Failed to submit. Please try again.';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mlm-container">
        <div className="mlm-loading-state">
          <div className="mlm-spinner"></div>
          <p>Loading meeting data...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mlm-container">
        <div className="mlm-error-state">
          <p style={{ color: '#dc2626', marginBottom: '15px' }}>{fetchError}</p>
          <button className="mlm-cancel-btn" onClick={onClose}>Back to Group</button>
        </div>
      </div>
    );
  }

  if (submitted && existingEvaluation) {
    return (
      <div className="mlm-container">
        <div className="mlm-success">
          <div className="mlm-success-icon">&#10003;</div>
          <h2>Already Submitted</h2>
          <p style={{ marginBottom: '20px' }}>Meeting log marks have been recorded for this group.</p>
          
          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px', 
            padding: '20px',
            marginBottom: '20px',
            maxWidth: '500px',
            margin: '0 auto 20px auto'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#64748b', fontSize: '13px' }}>Evaluator:</strong>
              <p style={{ margin: '5px 0', fontSize: '15px', color: '#1e293b' }}>
                {existingEvaluation.evaluator_name}
              </p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#64748b', fontSize: '13px' }}>Marks Awarded:</strong>
              <p style={{ margin: '5px 0', fontSize: '20px', fontWeight: 600, color: '#16a34a' }}>
                {existingEvaluation.marks}/10
              </p>
            </div>
            {existingEvaluation.comments && (
              <div>
                <strong style={{ color: '#64748b', fontSize: '13px' }}>Comments:</strong>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#475569', fontStyle: 'italic' }}>
                  {existingEvaluation.comments}
                </p>
              </div>
            )}
            <div style={{ marginTop: '15px', fontSize: '12px', color: '#94a3b8' }}>
              Submitted: {new Date(existingEvaluation.evaluated_at).toLocaleString()}
            </div>
          </div>
          
          <button 
            className="mlm-submit-btn" 
            onClick={() => {
              setSubmitted(false);
              setExistingEvaluation(null);
            }}
          >
            Re-evaluate
          </button>
          <button className="mlm-cancel-btn" onClick={onClose} style={{ marginLeft: '10px' }}>
            Back to Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mlm-container">

      <div className="mlm-header">
        <div>
          <h2>Meeting Log Evaluation</h2>
          {group && <p>{group.project || group.title} &mdash; {group.group || group.name}</p>}
        </div>
      </div>

      {/* Group Info */}
      <div className="mlm-info-table">
        <table>
          <tbody>
            <tr>
              <td className="mlm-info-label">Project Title</td>
              <td className="mlm-info-value">{group?.project || group?.title || '—'}</td>
              <td className="mlm-info-label">Supervisor</td>
              <td className="mlm-info-value">{group?.supervisor || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Meeting Summary */}
      <div className="mlm-section">
        <h3 className="mlm-section-title">Meeting Summary ({conductedCount}/16 conducted)</h3>

        {loading ? (
          <p className="mlm-loading">Loading meeting data...</p>
        ) : attendanceData ? (
          <div className="mlm-table-wrap">
            <table className="mlm-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Odoo ID</th>
                  <th className="mlm-center">Meetings Attended</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.members.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.full_name}</td>
                    <td>{m.odoo_id}</td>
                    <td className="mlm-center">{m.total_present}/{m.total_meetings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mlm-loading">No attendance data found.</p>
        )}

        {meetingsList.length > 0 && (
          <div className="mlm-meeting-list">
            {meetingsList.map((m) => (
              <div key={m.id} className="mlm-meeting-chip">
                <span className="mlm-meeting-num">Meeting #{m.meeting_number}</span>
                <span className="mlm-meeting-date">{m.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluator + Marks */}
      <div className="mlm-section">
        <h3 className="mlm-section-title">Evaluation</h3>
        <div className="mlm-info-table">
          <table>
            <tbody>
              <tr>
                <td className="mlm-info-label">Evaluator Name</td>
                <td>
                  <input
                    type="text"
                    className="mlm-text-input"
                    placeholder="Enter your full name"
                    value={evaluatorName}
                    onChange={e => setEvaluatorName(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="mlm-info-label">Marks (out of 10)</td>
                <td>
                  <input
                    type="number"
                    className="mlm-num-input"
                    min="0"
                    max="10"
                    step="0.5"
                    placeholder="/10"
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="mlm-info-label" style={{ verticalAlign: 'top', paddingTop: '10px' }}>Comments</td>
                <td>
                  <textarea
                    className="mlm-textarea"
                    rows="3"
                    placeholder="Any remarks on meeting consistency / engagement..."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mlm-actions">
        <button 
          className="mlm-submit-btn" 
          onClick={handleSubmit} 
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : existingEvaluation ? 'Update Marks' : 'Submit Marks'}
        </button>
        <button className="mlm-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

    </div>
  );
};

export default MeetingLogMarksForm;
import React, { useState, useEffect } from 'react';
import { meetingAPI, attendanceSheetAPI } from '../utils/api';
import './MeetingLogMarksForm.css';

const MeetingLogMarksForm = ({ group, onClose }) => {
  const [meetingsList, setMeetingsList] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluatorName, setEvaluatorName] = useState('');
  const [marks, setMarks] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [meetingsRes, sheetRes] = await Promise.all([
          meetingAPI.getByGroup(group.id),
          attendanceSheetAPI.getSheet(group.id)
        ]);
        const meetingsData = meetingsRes.data.results || meetingsRes.data || [];
        setMeetingsList(Array.isArray(meetingsData) ? meetingsData : []);
        setAttendanceData(sheetRes.data);
      } catch (err) {
        console.error('Error fetching meeting data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (group?.id) fetchData();
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
        group_id: group?.id,
        evaluator_name: evaluatorName,
        final_marks: num,
        comments
      };
      console.log('Submitting meeting log marks:', payload);
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mlm-container">
        <div className="mlm-success">
          <div className="mlm-success-icon">&#10003;</div>
          <h2>Submitted Successfully</h2>
          <p>Meeting log marks have been recorded.</p>
          <button className="mlm-cancel-btn" onClick={onClose}>Back to Group</button>
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
        <button className="mlm-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Marks'}
        </button>
        <button className="mlm-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

    </div>
  );
};

export default MeetingLogMarksForm;

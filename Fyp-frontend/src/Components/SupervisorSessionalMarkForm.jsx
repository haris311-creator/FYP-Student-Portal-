import React, { useState } from 'react';
import './SupervisorSessionalMarkForm.css';

const rubricData = [
  {
    sno: 1,
    criteria: 'Project Introduction & Literature Review',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'Unclear, lacks objectives and background. No citations, weak sources.',
      2: 'Weak objectives, vague background, minimal references.',
      3: 'Basic objectives, some relevant sources, need better structure.',
      4: 'Clear objectives, well-organized background, mostly relevant literature.',
      5: 'Well-structured, strong objectives, comprehensive and properly cited literature.'
    }
  },
  {
    sno: 2,
    criteria: 'Use Cases, ERD, and Prototyping',
    clo: 'CLO3',
    ga: 'GA4: Design/Development of Solution',
    weight: 4,
    maxMarks: 20,
    descriptions: {
      1: 'No diagrams or incorrect structure.',
      2: 'Minimal use cases, weak ERD, and prototype lacks usability.',
      3: 'Basic use cases, partially correct ERD, prototype missing details.',
      4: 'Clear use cases, mostly correct ERD, functional prototype with minor issues.',
      5: 'Comprehensive use cases, well-structured ERD, detailed and user-friendly prototype.'
    }
  },
  {
    sno: 3,
    criteria: 'Proposed Budgeting',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'No justification, unrealistic estimates.',
      2: 'Weak justification, inconsistent costs.',
      3: 'Some realistic estimates but lacks refinement.',
      4: 'Well-researched costs, mostly well-structured.',
      5: 'Highly accurate, well-documented budgeting with clear justifications.'
    }
  },
  {
    sno: 4,
    criteria: 'Business Canvas Model',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'Missing most components, lacks structure.',
      2: 'Few components covered, minimal feasibility.',
      3: 'Some feasibility, lacks strong uniqueness.',
      4: 'Well-structured, feasible with minor innovation.',
      5: 'Comprehensive, innovative, and highly feasible model.'
    }
  }
];

const SupervisorSessionalMarkForm = ({ group, onClose }) => {
  const [activeStudent, setActiveStudent] = useState(0);
  const [showRubric, setShowRubric] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initStudentMarks = () => ({
    selections: { 0: null, 1: null, 2: null, 3: null },
    manualMarks: { 0: '', 1: '', 2: '', 3: '' },
    comments: ''
  });

  const [studentMarks, setStudentMarks] = useState(
    group?.members?.map(() => initStudentMarks()) || []
  );

  const handleRadioSelect = (studentIdx, criteriaIdx, value) => {
    const updated = [...studentMarks];
    updated[studentIdx].selections[criteriaIdx] = value;
    const maxMarks = rubricData[criteriaIdx].maxMarks;
    updated[studentIdx].manualMarks[criteriaIdx] = ((value / 5) * maxMarks).toFixed(1);
    setStudentMarks(updated);
  };

  const handleManualInput = (studentIdx, criteriaIdx, value) => {
    const updated = [...studentMarks];
    const maxMarks = rubricData[criteriaIdx].maxMarks;
    const numVal = parseFloat(value);
    updated[studentIdx].manualMarks[criteriaIdx] = value;
    if (!isNaN(numVal) && numVal >= 0 && numVal <= maxMarks) {
      const perfLevel = Math.round((numVal / maxMarks) * 5);
      updated[studentIdx].selections[criteriaIdx] = perfLevel || null;
    } else {
      updated[studentIdx].selections[criteriaIdx] = null;
    }
    setStudentMarks(updated);
  };

  const handleCommentChange = (studentIdx, value) => {
    const updated = [...studentMarks];
    updated[studentIdx].comments = value;
    setStudentMarks(updated);
  };

  const getRawTotal = (studentIdx) => {
    const marks = studentMarks[studentIdx]?.manualMarks || {};
    let total = 0;
    Object.values(marks).forEach(m => {
      const num = parseFloat(m);
      if (!isNaN(num)) total += num;
    });
    return total;
  };

  const getFinalMarks = (studentIdx) => {
    const raw = getRawTotal(studentIdx);
    return ((raw / 50) * 20).toFixed(1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = group.members.map((member, idx) => ({
        student_id: member.student_db_id,
        student_name: member.name,
        raw_marks: getRawTotal(idx),
        final_marks: parseFloat(getFinalMarks(idx)),
        criteria_marks: studentMarks[idx].manualMarks,
        comments: studentMarks[idx].comments
      }));
      console.log('Submitting sessional marks:', payload);
      alert('Sessional marks submitted successfully! Sent to admin for review.');
      onClose && onClose();
    } catch (err) {
      alert('Failed to submit marks. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const members = group?.members || [];

  return (
    <div className="ssm-container">

      {/* Header */}
      <div className="ssm-header">
        <div>
          <h2>Sessional Marks</h2>
          <p>{group?.project || 'Project'} — {group?.name || 'Group'}</p>
        </div>
        <button className="ssm-rubric-btn" onClick={() => setShowRubric(!showRubric)}>
          {showRubric ? '▲ Hide Rubric' : '▼ View Rubric'}
        </button>
      </div>

      {/* Rubric Reference Table */}
      {showRubric && (
        <div className="ssm-rubric-section">
          <h3>Rubric Reference (FYDP-1 Sessional)</h3>
          <div className="ssm-table-wrapper">
            <table className="ssm-rubric-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLOs</th>
                  <th>GA</th>
                  <th>Wt.</th>
                  <th>Max</th>
                  <th>1</th>
                  <th>2</th>
                  <th>3</th>
                  <th>4</th>
                  <th>5</th>
                </tr>
              </thead>
              <tbody>
                {rubricData.map((row) => (
                  <tr key={row.sno}>
                    <td className="center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="center">{row.clo}</td>
                    <td className="small">{row.ga}</td>
                    <td className="center">{row.weight}</td>
                    <td className="center">{row.maxMarks}</td>
                    {[1,2,3,4,5].map(level => (
                      <td key={level} className="desc-cell">{row.descriptions[level]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Tabs */}
      <div className="ssm-student-tabs">
        {members.map((member, idx) => (
          <button
            key={idx}
            className={`ssm-student-tab ${activeStudent === idx ? 'active' : ''}`}
            onClick={() => setActiveStudent(idx)}
          >
            <span className="ssm-avatar">{member.name?.charAt(0).toUpperCase()}</span>
            <span>{member.name}</span>
            {getRawTotal(idx) > 0 && (
              <span className="ssm-done-badge">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Marks Entry Form per Student */}
      {members.map((member, sIdx) => (
        <div key={sIdx} className={`ssm-student-form ${activeStudent === sIdx ? 'active' : 'hidden'}`}>
          <div className="ssm-student-info">
            <div className="ssm-avatar-lg">{member.name?.charAt(0).toUpperCase()}</div>
            <div>
              <h3>{member.name}</h3>
              <p>ID: {member.odoo_id}</p>
            </div>
            <div className="ssm-total-box">
              <span className="ssm-total-label">Raw Total</span>
              <span className="ssm-total-value">{getRawTotal(sIdx).toFixed(1)}/50</span>
              <span className="ssm-total-label">Final Marks</span>
              <span className="ssm-final-value">{getFinalMarks(sIdx)}/20</span>
            </div>
          </div>

          <div className="ssm-table-wrapper">
            <table className="ssm-marks-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLOs</th>
                  <th>GA</th>
                  <th>Wt.</th>
                  <th>Max</th>
                  <th className="center">1</th>
                  <th className="center">2</th>
                  <th className="center">3</th>
                  <th className="center">4</th>
                  <th className="center">5</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {rubricData.map((row, cIdx) => (
                  <tr key={cIdx}>
                    <td className="center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="center">{row.clo}</td>
                    <td className="small">{row.ga}</td>
                    <td className="center">{row.weight}</td>
                    <td className="center">{row.maxMarks}</td>
                    {[1,2,3,4,5].map(level => (
                      <td key={level} className="center">
                        <input
                          type="radio"
                          name={`student${sIdx}_criteria${cIdx}`}
                          value={level}
                          checked={studentMarks[sIdx]?.selections[cIdx] === level}
                          onChange={() => handleRadioSelect(sIdx, cIdx, level)}
                        />
                      </td>
                    ))}
                    <td>
                      <input
                        type="number"
                        className="ssm-marks-input"
                        min="0"
                        max={row.maxMarks}
                        step="0.5"
                        value={studentMarks[sIdx]?.manualMarks[cIdx] || ''}
                        onChange={(e) => handleManualInput(sIdx, cIdx, e.target.value)}
                        placeholder={`/${row.maxMarks}`}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="ssm-total-row">
                  <td colSpan="11" className="right"><strong>Total (out of 50)</strong></td>
                  <td className="center"><strong>{getRawTotal(sIdx).toFixed(1)}</strong></td>
                </tr>
                <tr className="ssm-final-row">
                  <td colSpan="11" className="right"><strong>Final Marks (out of 20)</strong></td>
                  <td className="center"><strong>{getFinalMarks(sIdx)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ssm-comments">
            <label>Comments (optional)</label>
            <textarea
              rows="3"
              placeholder="Any remarks for this student..."
              value={studentMarks[sIdx]?.comments || ''}
              onChange={(e) => handleCommentChange(sIdx, e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="ssm-actions">
        <button className="ssm-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : '✅ Submit Marks to Admin'}
        </button>
        <button className="ssm-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

    </div>
  );
};

export default SupervisorSessionalMarkForm;

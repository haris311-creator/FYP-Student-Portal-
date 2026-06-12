import React, { useState, useEffect } from 'react';
import './SupervisorSessionalMarkForm.css';

const SupervisorSessionalMarkForm = ({ group, onClose }) => {
  const [groupId, setGroupId] = useState('');
  const [semester, setSemester] = useState('7');
  const [evaluations, setEvaluations] = useState({
    student1: {
      name: '',
      regNo: '',
      scores: {
        literatureReview: 0,    // 4% policy → proportional
        useCasesERD: 0,         // 8% policy → proportional
        budgeting: 0,           // 4% policy → proportional
        businessCanvas: 0,      // 4% policy → proportional
      }
    },
    student2: {
      name: '',
      regNo: '',
      scores: {
        literatureReview: 0,
        useCasesERD: 0,
        budgeting: 0,
        businessCanvas: 0,
      }
    },
    student3: {
      name: '',
      regNo: '',
      scores: {
        literatureReview: 0,
        useCasesERD: 0,
        budgeting: 0,
        businessCanvas: 0,
      }
    },
  });

  // Policy: 30 marks per component in original policy
  // Miss S weightage: 20 marks for Sessional
  // Conversion: (20/30) × component marks
  const sessionialComponents = [
    {
      key: 'literatureReview',
      label: 'Project Introduction & Literature Review',
      policyMarks: 30,
      policyWeight: 4,
      actualWeight: 5, // (5/30) × 30 = 5 marks in 20
      maxMarks: 5,
      description: 'Quality of literature review and project introduction clarity'
    },
    {
      key: 'useCasesERD',
      label: 'Use Cases, ERD, and Prototyping',
      policyMarks: 30,
      policyWeight: 8,
      actualWeight: 5, // (5/30) × 30 = 5 marks in 20
      maxMarks: 5,
      description: 'Completeness of use cases, ER diagrams, and prototype quality'
    },
    {
      key: 'budgeting',
      label: 'Proposed Budgeting',
      policyMarks: 30,
      policyWeight: 4,
      actualWeight: 5, // (5/30) × 30 = 5 marks in 20
      maxMarks: 5,
      description: 'Accuracy and justification of project budget'
    },
    {
      key: 'businessCanvas',
      label: 'Business Canvas Model',
      policyMarks: 30,
      policyWeight: 4,
      actualWeight: 5, // (5/30) × 30 = 5 marks in 20
      maxMarks: 5,
      description: 'Feasibility and innovation in business model'
    },
  ];

  const handleStudentChange = (studentKey, field, value) => {
    setEvaluations(prev => ({
      ...prev,
      [studentKey]: {
        ...prev[studentKey],
        [field]: value
      }
    }));
  };

  useEffect(() => {
    if (!group) return;

    setGroupId(group.group_number?.toString() || '');
    if (group.phase === 'FYP-1') {
      setSemester('7');
    } else if (group.phase === 'FYP-2') {
      setSemester('8');
    }

    if (group.members?.length) {
      setEvaluations(prev => {
        const updated = { ...prev };
        group.members.slice(0, 3).forEach((member, index) => {
          const key = `student${index + 1}`;
          if (updated[key]) {
            updated[key] = {
              ...updated[key],
              name: member.name || updated[key].name,
              regNo: member.odoo_id || updated[key].regNo
            };
          }
        });
        return updated;
      });
    }
  }, [group]);

  if (!group) {
    return <div className="sessional-form-container"><p>No group selected.</p></div>;
  }

  const handleScoreChange = (studentKey, componentKey, value) => {
    const numValue = Math.min(Math.max(parseFloat(value) || 0, 0), 5);
    setEvaluations(prev => ({
      ...prev,
      [studentKey]: {
        ...prev[studentKey],
        scores: {
          ...prev[studentKey].scores,
          [componentKey]: numValue
        }
      }
    }));
  };

  const calculateTotal = (studentKey) => {
    const scores = Object.values(evaluations[studentKey].scores);
    return scores.reduce((a, b) => a + b, 0).toFixed(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Sessional Marks Submission:', evaluations);
    alert('Sessional marks submitted successfully!');
  };

  return (
    <div className="sessional-form-container">
      <div className="form-header">
        <h1>📋 Sessional Marks Entry Form</h1>
        <p className="subtitle">FYDP-{semester} | Group Evaluation | Total Marks: 20</p>
      </div>

      <form onSubmit={handleSubmit} className="evaluation-form">
        {/* Group & Semester Section */}
        <div className="form-section group-section">
          <h2>Group Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Group ID</label>
              <input
                type="text"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="Enter group ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="7">7th Semester (FYDP-1)</option>
                <option value="8">8th Semester (FYDP-2)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Evaluation Rubric Info */}
        <div className="rubric-info">
          <h3>📊 Sessional Components (Total: 20 marks)</h3>
          <div className="rubric-grid">
            {sessionialComponents.map((comp, idx) => (
              <div key={comp.key} className="rubric-item">
                <span className="comp-name">{comp.label}</span>
                <span className="comp-marks">{comp.actualWeight} marks</span>
              </div>
            ))}
          </div>
        </div>

        {/* Students Evaluation */}
        <div className="students-section">
          {Object.entries(evaluations).map((entry, idx) => {
            const [studentKey, studentData] = entry;
            return (
              <div key={studentKey} className="student-card">
                <div className="student-header">
                  <h3>Student {idx + 1}</h3>
                  <span className={`total-marks ${parseFloat(calculateTotal(studentKey)) >= 10 ? 'good' : 'warning'}`}>
                    Total: {calculateTotal(studentKey)}/20
                  </span>
                </div>

                <div className="student-info">
                  <div className="info-group">
                    <label>Student Name</label>
                    <input
                      type="text"
                      value={studentData.name}
                      onChange={(e) => handleStudentChange(studentKey, 'name', e.target.value)}
                      placeholder="Enter student name"
                    />
                  </div>
                  <div className="info-group">
                    <label>Registration No.</label>
                    <input
                      type="text"
                      value={studentData.regNo}
                      onChange={(e) => handleStudentChange(studentKey, 'regNo', e.target.value)}
                      placeholder="e.g., CS-2021-123"
                    />
                  </div>
                </div>

                {/* Component Scores */}
                <div className="scores-grid">
                  {sessionialComponents.map((comp) => (
                    <div key={comp.key} className="score-input">
                      <label>{comp.label}</label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          min="0"
                          max={comp.maxMarks}
                          step="0.5"
                          value={studentData.scores[comp.key]}
                          onChange={(e) => handleScoreChange(studentKey, comp.key, e.target.value)}
                        />
                        <span className="max-marks">/{comp.maxMarks}</span>
                      </div>
                      <p className="description">{comp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Policy Reference */}
        <div className="policy-reference">
          <h4>📖 FEST Policy Reference</h4>
          <p>
            <strong>Policy Weightage (FYDP-1 Sessional = 30 marks):</strong><br/>
            • Literature Review: 4% → Adjusted to 5 marks<br/>
            • Use Cases, ERD, Prototype: 8% → Adjusted to 5 marks<br/>
            • Budgeting: 4% → Adjusted to 5 marks<br/>
            • Business Canvas: 4% → Adjusted to 5 marks<br/>
            <strong>Miss S Weightage: 20 marks total for Sessional</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button type="submit" className="btn-submit">
            ✅ Submit Sessional Marks
          </button>
          <button type="reset" className="btn-reset">
            🔄 Reset Form
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            ← Back to Group
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupervisorSessionalMarkForm;

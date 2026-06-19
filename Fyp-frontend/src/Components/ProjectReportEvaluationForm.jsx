import React, { useState } from 'react';
import './ProjectReportEvaluationForm.css';

const reportCriteria = [
  {
    sno: 1,
    criteria: 'Problem Definition and Objectives',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Not written.',
      2: 'The problem statement is somewhat vague, with limited justification. Objectives may lack clarity.',
      3: 'Provides a reasonable problem definition with some justification. Objectives are mostly aligned.',
      4: 'Defines the problem well with adequate justification. Objectives are mostly clear and structured.',
      5: 'Defines the problem with strong justification. Objectives are well-structured and aligned with the problem statement.'
    }
  },
  {
    sno: 2,
    criteria: 'Literature Review',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Minimal or no relevant literature review, lacks coherence.',
      2: 'Some references included but lacks depth in analysis.',
      3: 'Covers relevant literature with minor gaps in analysis.',
      4: 'Good coverage of relevant literature with only minor areas for improvement.',
      5: 'Comprehensive review of relevant literature, demonstrating a clear understanding of existing research and gaps.'
    }
  },
  {
    sno: 3,
    criteria: 'Prototype',
    clo: 'CLO3',
    ga: 'GA4: Design/Development of Solution',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Prototype does not align with project requirements or objectives.',
      2: 'Prototype partially meets project requirements but lacks some key components.',
      3: 'Prototype meets most project requirements, with major deviations or improvements needed.',
      4: 'Prototype meets most project requirements, with minor deviations or improvements needed.',
      5: 'Prototype fully meets or exceeds all project requirements and objectives.'
    }
  },
  {
    sno: 4,
    criteria: 'Project Plan',
    clo: 'CLO10',
    ga: 'GA7: Project Management',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Weak or missing project plan with vague steps and no clear timeline.',
      2: 'Project plan is present but lacks detailed steps, timeline, and feasibility analysis.',
      3: 'Feasibility and project plan are demonstrated but with minor gaps in structure or execution.',
      4: 'Well-structured project plan with clear steps and minor details missing.',
      5: 'Realistic and well-structured project plan with achievable milestones, detailed tasks, and a well-defined timeline.'
    }
  },
  {
    sno: 5,
    criteria: 'Budget and Business Canvas Model',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Budget is unclear or missing, and the business canvas model lacks detail or coherence.',
      2: 'Basic budget provided with some justification, and a business canvas model with gaps in explanation.',
      3: 'Budget and business canvas models are present but may lack minor details or clarity in some aspects.',
      4: 'Clear and structured budget with a detailed business canvas model.',
      5: 'Well-defined budget with clear justification, and a comprehensive business canvas model outlining key partners, activities, value propositions, customer relationships, channels, cost structure, and revenue streams.'
    }
  },
  {
    sno: 6,
    criteria: 'Report Structure and Presentation',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Poorly organized, difficult to understand, many grammatical errors.',
      2: 'Some organizational issues and moderate grammatical errors.',
      3: 'Well-structured with minor inconsistencies.',
      4: 'Well-structured and formatted with few errors.',
      5: 'Well-organized, clear writing follows the given template, minimal grammatical errors.'
    }
  },
  {
    sno: 7,
    criteria: 'References and Citation',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'References are inadequate or missing.',
      2: 'Some references missing or improperly formatted.',
      3: 'Mostly correct citation style with minor errors.',
      4: 'Well-referenced with minor citation issues.',
      5: 'Properly formatted references in the required style, all sources cited correctly.'
    }
  }
];

const ProjectReportEvaluationForm = ({ group, onClose }) => {
  const [showRubric, setShowRubric] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [comments, setComments] = useState('');

  const [selections, setSelections] = useState(
    Object.fromEntries(reportCriteria.map((_, i) => [i, null]))
  );
  const [marks, setMarks] = useState(
    Object.fromEntries(reportCriteria.map((_, i) => [i, '']))
  );

  const handleRadio = (cIdx, value) => {
    setSelections(prev => ({ ...prev, [cIdx]: value }));
    setMarks(prev => ({
      ...prev,
      [cIdx]: ((value / 5) * reportCriteria[cIdx].maxMarks).toFixed(1)
    }));
  };

  const handleManual = (cIdx, value) => {
    setMarks(prev => ({ ...prev, [cIdx]: value }));
    const max = reportCriteria[cIdx].maxMarks;
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= max) {
      setSelections(prev => ({ ...prev, [cIdx]: Math.round((num / max) * 5) || null }));
    }
  };

  const getRawTotal = () => {
    return Object.values(marks).reduce((sum, m) => sum + (parseFloat(m) || 0), 0);
  };

  const getFinalMarks = () => {
    // Raw total out of 35 (7 criteria x 5) -> Final out of 30
    const raw = getRawTotal();
    return ((raw / 35) * 30).toFixed(1);
  };

  const handleSubmit = async () => {
    if (!evaluatorName.trim()) {
      alert('Please enter evaluator name.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        group_id: group?.id,
        evaluator_name: evaluatorName,
        criteria_marks: marks,
        raw_total: getRawTotal(),
        final_marks: getFinalMarks(),
        comments
      };
      console.log('Submitting report evaluation:', payload);
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pref-container">
        <div className="pref-success">
          <div className="pref-success-icon">&#10003;</div>
          <h2>Submitted Successfully</h2>
          <p>Project report marks have been recorded.</p>
          <button className="pref-cancel-btn" onClick={onClose}>Back to Group</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pref-container">

      <div className="pref-header">
        <div>
          <h2>Rubrics for Evaluation of FYDP-1 Report</h2>
          {group && <p>{group.project || group.title} &mdash; {group.group || group.name}</p>}
        </div>
        <button className="pref-rubric-btn" onClick={() => setShowRubric(!showRubric)}>
          {showRubric ? 'Hide Rubric Reference' : 'View Rubric Reference'}
        </button>
      </div>

      {/* Group Info */}
      <div className="pref-info-table">
        <table>
          <tbody>
            <tr>
              <td className="pref-info-label">Project Title</td>
              <td className="pref-info-value">{group?.project || group?.title || '—'}</td>
              <td className="pref-info-label">Student Names</td>
              <td className="pref-info-value">{group?.members?.map(m => m.name).join(', ') || '—'}</td>
            </tr>
            <tr>
              <td className="pref-info-label">Supervisor</td>
              <td className="pref-info-value">{group?.supervisor || '—'}</td>
              <td className="pref-info-label">Semester</td>
              <td className="pref-info-value">{group?.phase || 'FYP-1'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rubric Reference */}
      {showRubric && (
        <div className="pref-section">
          <h3 className="pref-section-title">Rubric Reference</h3>
          <div className="pref-table-wrap">
            <table className="pref-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLO</th>
                  <th>GA</th>
                  <th>1 (Worst)</th>
                  <th>2 (Below Average)</th>
                  <th>3 (Satisfactory)</th>
                  <th>4 (Good)</th>
                  <th>5 (Excellent)</th>
                </tr>
              </thead>
              <tbody>
                {reportCriteria.map((row) => (
                  <tr key={row.sno}>
                    <td className="pref-center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="pref-center">{row.clo}</td>
                    <td className="pref-small">{row.ga}</td>
                    {[1, 2, 3, 4, 5].map(l => (
                      <td key={l} className="pref-desc">{row.descriptions[l]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evaluator Name */}
      <div className="pref-section">
        <h3 className="pref-section-title">Evaluator Information</h3>
        <div className="pref-info-table">
          <table>
            <tbody>
              <tr>
                <td className="pref-info-label">Evaluator Name</td>
                <td>
                  <input
                    type="text"
                    className="pref-text-input"
                    placeholder="Enter your full name"
                    value={evaluatorName}
                    onChange={e => setEvaluatorName(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Marks Entry */}
      <div className="pref-section">
        <h3 className="pref-section-title">Report Evaluation</h3>
        <div className="pref-table-wrap">
          <table className="pref-table pref-marks-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Criteria</th>
                <th>CLO</th>
                <th>GA</th>
                <th className="pref-center">Wt.</th>
                <th className="pref-center">1</th>
                <th className="pref-center">2</th>
                <th className="pref-center">3</th>
                <th className="pref-center">4</th>
                <th className="pref-center">5</th>
                <th className="pref-center">Marks</th>
              </tr>
            </thead>
            <tbody>
              {reportCriteria.map((row, cIdx) => (
                <tr key={cIdx}>
                  <td className="pref-center">{row.sno}</td>
                  <td><strong>{row.criteria}</strong></td>
                  <td className="pref-center">{row.clo}</td>
                  <td className="pref-small">{row.ga}</td>
                  <td className="pref-center">{row.weight}</td>
                  {[1, 2, 3, 4, 5].map(level => (
                    <td key={level} className="pref-center">
                      <input
                        type="radio"
                        name={`report_${cIdx}`}
                        value={level}
                        checked={selections[cIdx] === level}
                        onChange={() => handleRadio(cIdx, level)}
                      />
                    </td>
                  ))}
                  <td className="pref-center">
                    <input
                      type="number"
                      className="pref-num-input"
                      min="0"
                      max={row.maxMarks}
                      step="0.5"
                      value={marks[cIdx]}
                      onChange={e => handleManual(cIdx, e.target.value)}
                      placeholder={`/${row.maxMarks}`}
                    />
                  </td>
                </tr>
              ))}
              <tr className="pref-total-row">
                <td colSpan="10" className="pref-right"><strong>Raw Total (out of 35)</strong></td>
                <td className="pref-center"><strong>{getRawTotal().toFixed(1)}</strong></td>
              </tr>
              <tr className="pref-final-row">
                <td colSpan="10" className="pref-right"><strong>Final Marks (out of 30)</strong></td>
                <td className="pref-center"><strong>{getFinalMarks()}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments */}
      <div className="pref-section">
        <div className="pref-info-table">
          <table>
            <tbody>
              <tr>
                <td className="pref-info-label" style={{ verticalAlign: 'top', paddingTop: '10px' }}>Comments</td>
                <td>
                  <textarea
                    className="pref-textarea"
                    rows="3"
                    placeholder="Any additional remarks..."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="pref-actions">
        <button className="pref-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Evaluation'}
        </button>
        <button className="pref-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

    </div>
  );
};

export default ProjectReportEvaluationForm;

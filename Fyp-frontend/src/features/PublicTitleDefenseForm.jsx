import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { evaluationAPI } from '../utils/api';
import { titleDefenseCriteria } from '../data/titleDefenseRubricData';
import './TitleDefenseEvaluationForm.css';

const PublicTitleDefenseForm = ({ group, token }) => {
  const [showRubric, setShowRubric] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [evaluatorName, setEvaluatorName] = useState('');
  const [selections, setSelections] = useState(
    Object.fromEntries(titleDefenseCriteria.map((_, i) => [i, null]))
  );
  const [marks, setMarks] = useState(
    Object.fromEntries(titleDefenseCriteria.map((_, i) => [i, '']))
  );
  const [comments, setComments] = useState('');

  const handleRadio = (cIdx, value) => {
    setSelections((prev) => ({ ...prev, [cIdx]: value }));
    setMarks((prev) => ({
      ...prev,
      [cIdx]: ((value / 5) * titleDefenseCriteria[cIdx].maxMarks).toFixed(1)
    }));
  };

  const handleManual = (cIdx, value) => {
    const max = titleDefenseCriteria[cIdx].maxMarks;
    const num = parseFloat(value);
    const newSelections = { ...selections };
    if (!isNaN(num) && num >= 0 && num <= max) {
      newSelections[cIdx] = Math.round((num / max) * 5) || null;
    } else {
      newSelections[cIdx] = null;
    }
    setSelections(newSelections);
    setMarks((prev) => ({ ...prev, [cIdx]: value }));
  };

  const rawTotal = Object.values(marks).reduce((sum, m) => sum + (parseFloat(m) || 0), 0);
  const convertedMarks = ((rawTotal / 40) * 5).toFixed(1);

  const handleSubmit = async () => {
    if (!evaluatorName.trim()) {
      toast.warning('Please enter your name.');
      return;
    }
    setSubmitting(true);
    try {
      await evaluationAPI.submitPublicTitleDefense(token, {
        evaluator_name: evaluatorName,
        criteria_marks: marks,
        raw_total: rawTotal,
        converted_marks: parseFloat(convertedMarks),
        comments
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="tdf-container">
        <div className="tdf-success">
          <div className="tdf-success-icon">&#10003;</div>
          <h2>Submitted Successfully</h2>
          <p>Your Title Defense evaluation has been recorded. Thank you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tdf-container">

      <div className="tdf-header">
        <div>
          <h2>Title Defense Evaluation</h2>
          {group && <p>{group.project || group.title} &mdash; {group.name || group.group}</p>}
        </div>
        <button className="tdf-rubric-btn" onClick={() => setShowRubric(!showRubric)}>
          {showRubric ? 'Hide Rubric Reference' : 'View Rubric Reference'}
        </button>
      </div>

      <div className="tdf-info-table">
        <table>
          <tbody>
            <tr>
              <td className="tdf-info-label">Project Title</td>
              <td className="tdf-info-value">{group?.project || '—'}</td>
              <td className="tdf-info-label">Student Names</td>
              <td className="tdf-info-value">{group?.members?.map((m) => m.name).join(', ') || '—'}</td>
            </tr>
            <tr>
              <td className="tdf-info-label">Supervisor</td>
              <td className="tdf-info-value">{group?.supervisor || '—'}</td>
              <td className="tdf-info-label">Semester</td>
              <td className="tdf-info-value">{group?.phase || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {showRubric && (
        <div className="tdf-section">
          <h3 className="tdf-section-title">Rubric Reference</h3>
          <div className="tdf-table-wrap">
            <table className="tdf-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLOs</th>
                  <th>GAs</th>
                  <th>1 (Worst)</th>
                  <th>2 (Below Average)</th>
                  <th>3 (Satisfactory)</th>
                  <th>4 (Good)</th>
                  <th>5 (Excellent)</th>
                </tr>
              </thead>
              <tbody>
                {titleDefenseCriteria.map((row) => (
                  <tr key={row.sno}>
                    <td className="tdf-center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="tdf-center">{row.clo}</td>
                    <td className="tdf-small">{row.ga}</td>
                    {[1, 2, 3, 4, 5].map((l) => (
                      <td key={l} className="tdf-desc">{row.descriptions[l]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="tdf-section">
        <h3 className="tdf-section-title">Evaluation Committee (5%)</h3>
        <div className="tdf-info-table">
          <table>
            <tbody>
              <tr>
                <td className="tdf-info-label">Evaluator Name</td>
                <td>
                  <input
                    type="text"
                    className="tdf-text-input"
                    placeholder="Enter your full name"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="tdf-section">
        <div className="tdf-table-wrap">
          <table className="tdf-table tdf-marks-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Criteria</th>
                <th>CLOs</th>
                <th>GAs</th>
                <th className="tdf-center">Wt.</th>
                <th className="tdf-center">1</th>
                <th className="tdf-center">2</th>
                <th className="tdf-center">3</th>
                <th className="tdf-center">4</th>
                <th className="tdf-center">5</th>
                <th className="tdf-center">Marks</th>
              </tr>
            </thead>
            <tbody>
              {titleDefenseCriteria.map((row, cIdx) => (
                <tr key={cIdx}>
                  <td className="tdf-center">{row.sno}</td>
                  <td><strong>{row.criteria}</strong></td>
                  <td className="tdf-center">{row.clo}</td>
                  <td className="tdf-small">{row.ga}</td>
                  <td className="tdf-center">{row.weight}</td>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <td key={level} className="tdf-center">
                      <input
                        type="radio"
                        name={`ec_c${cIdx}`}
                        value={level}
                        checked={selections[cIdx] === level}
                        onChange={() => handleRadio(cIdx, level)}
                      />
                    </td>
                  ))}
                  <td className="tdf-center">
                    <input
                      type="number"
                      className="tdf-num-input"
                      min="0"
                      max={row.maxMarks}
                      step="0.5"
                      value={marks[cIdx]}
                      onChange={(e) => handleManual(cIdx, e.target.value)}
                      placeholder={`/${row.maxMarks}`}
                    />
                  </td>
                </tr>
              ))}
              <tr className="tdf-total-row">
                <td colSpan="10" className="tdf-right"><strong>Raw Total (out of 40)</strong></td>
                <td className="tdf-center"><strong>{rawTotal.toFixed(1)}</strong></td>
              </tr>
              <tr className="tdf-final-row">
                <td colSpan="10" className="tdf-right"><strong>Converted Marks (5%, out of 5)</strong></td>
                <td className="tdf-center"><strong>{convertedMarks}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="tdf-section">
        <div className="tdf-info-table">
          <table>
            <tbody>
              <tr>
                <td className="tdf-info-label" style={{ verticalAlign: 'top', paddingTop: '10px' }}>Comments</td>
                <td>
                  <textarea
                    className="tdf-textarea"
                    rows="3"
                    placeholder="Any additional remarks..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="tdf-actions">
        <button className="tdf-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Evaluation'}
        </button>
      </div>

    </div>
  );
};

export default PublicTitleDefenseForm;

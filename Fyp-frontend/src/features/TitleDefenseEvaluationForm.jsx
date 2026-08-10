import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { titleDefenseCriteria } from '../data/titleDefenseRubricData';
import TitleDefenseRubricsPrint from '../prints/TitleDefenseRubricsPrint';
import './TitleDefenseEvaluationForm.css';

const EVALUATORS = [
  { key: 'evaluationCommittee', label: 'Evaluation Committee', percent: '5%' },
  { key: 'projectCommittee', label: 'Project Committee', percent: '5%' }
];

const initEvaluatorState = () => ({
  evaluatorName: '',
  selections: Object.fromEntries(titleDefenseCriteria.map((_, i) => [i, null])),
  marks: Object.fromEntries(titleDefenseCriteria.map((_, i) => [i, ''])),
  comments: ''
});

const TitleDefenseEvaluationForm = ({ group, onClose }) => {
  const [showRubric, setShowRubric] = useState(false);
  const [activeEvaluator, setActiveEvaluator] = useState(EVALUATORS[0].key);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const [evaluatorData, setEvaluatorData] = useState(
    Object.fromEntries(EVALUATORS.map((e) => [e.key, initEvaluatorState()]))
  );

  const current = evaluatorData[activeEvaluator];

  const updateCurrent = (patch) => {
    setEvaluatorData((prev) => ({
      ...prev,
      [activeEvaluator]: { ...prev[activeEvaluator], ...patch }
    }));
  };

  const handleRadio = (cIdx, value) => {
    updateCurrent({
      selections: { ...current.selections, [cIdx]: value },
      marks: {
        ...current.marks,
        [cIdx]: ((value / 5) * titleDefenseCriteria[cIdx].maxMarks).toFixed(1)
      }
    });
  };

  const handleManual = (cIdx, value) => {
    const max = titleDefenseCriteria[cIdx].maxMarks;
    const num = parseFloat(value);
    const newSelections = { ...current.selections };
    if (!isNaN(num) && num >= 0 && num <= max) {
      newSelections[cIdx] = Math.round((num / max) * 5) || null;
    } else {
      newSelections[cIdx] = null;
    }
    updateCurrent({
      marks: { ...current.marks, [cIdx]: value },
      selections: newSelections
    });
  };

  const getRawTotal = (evaluatorKey) => {
    const marks = evaluatorData[evaluatorKey].marks;
    return Object.values(marks).reduce((sum, m) => sum + (parseFloat(m) || 0), 0);
  };

  // Raw total is out of 40 (8 criteria x 5). Converted to 5% (5 marks) per evaluator.
  const getConvertedMarks = (evaluatorKey) => {
    const raw = getRawTotal(evaluatorKey);
    return ((raw / 40) * 5).toFixed(1);
  };

  const getGrandTotal = () => {
    const total = EVALUATORS.reduce(
      (sum, e) => sum + parseFloat(getConvertedMarks(e.key) || 0),
      0
    );
    return total.toFixed(1);
  };

  const handleSubmit = async () => {
    const missingName = EVALUATORS.find((e) => !evaluatorData[e.key].evaluatorName.trim());
    if (missingName) {
      toast.warning(`Please enter the evaluator name for ${missingName.label}.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        group_id: group?.id,
        evaluators: EVALUATORS.map((e) => ({
          role: e.key,
          evaluator_name: evaluatorData[e.key].evaluatorName,
          criteria_marks: evaluatorData[e.key].marks,
          raw_total: getRawTotal(e.key),
          converted_marks: getConvertedMarks(e.key),
          comments: evaluatorData[e.key].comments
        })),
        total_marks: getGrandTotal()
      };
      console.log('Submitting title defense evaluation:', payload);
      setSubmitted(true);
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
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
          <p>Title Defense evaluation has been recorded for both committees.</p>
          <div className="tdf-success-actions">
            <button className="tdf-print-btn" onClick={() => setPrintOpen(true)}>
              View / Download Printable Rubrics
            </button>
            <button className="tdf-cancel-btn" onClick={onClose}>Back to Group</button>
          </div>
        </div>

        <TitleDefenseRubricsPrint
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          group={group}
          criteria={titleDefenseCriteria}
          evaluators={EVALUATORS}
          evaluatorData={evaluatorData}
        />
      </div>
    );
  }

  return (
    <div className="tdf-container">

      <div className="tdf-header">
        <div>
          <h2>Rubrics for FYDP Title Defense Presentation</h2>
          {group && <p>{group.project || group.title} &mdash; {group.group || group.name}</p>}
        </div>
        <button className="tdf-rubric-btn" onClick={() => setShowRubric(!showRubric)}>
          {showRubric ? 'Hide Rubric Reference' : 'View Rubric Reference'}
        </button>
      </div>

      {/* Group Info */}
      <div className="tdf-info-table">
        <table>
          <tbody>
            <tr>
              <td className="tdf-info-label">Project Title</td>
              <td className="tdf-info-value">{group?.project || group?.title || '—'}</td>
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

      {/* Rubric Reference — full descriptions, hidden by default */}
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

      {/* Evaluator Tabs */}
      <div className="tdf-evaluator-tabs">
        {EVALUATORS.map((e) => (
          <button
            key={e.key}
            className={`tdf-evaluator-tab ${activeEvaluator === e.key ? 'active' : ''}`}
            onClick={() => setActiveEvaluator(e.key)}
          >
            {e.label} ({e.percent})
            {getRawTotal(e.key) > 0 && <span className="tdf-done-badge">&#10003;</span>}
          </button>
        ))}
      </div>

      {/* Evaluator Name */}
      <div className="tdf-section">
        <div className="tdf-info-table">
          <table>
            <tbody>
              <tr>
                <td className="tdf-info-label">Evaluator Name</td>
                <td>
                  <input
                    type="text"
                    className="tdf-text-input"
                    placeholder="Enter evaluator's full name"
                    value={current.evaluatorName}
                    onChange={(e) => updateCurrent({ evaluatorName: e.target.value })}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Marks Entry */}
      <div className="tdf-section">
        <h3 className="tdf-section-title">{EVALUATORS.find((e) => e.key === activeEvaluator).label} Evaluation</h3>
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
                        name={`${activeEvaluator}_c${cIdx}`}
                        value={level}
                        checked={current.selections[cIdx] === level}
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
                      value={current.marks[cIdx]}
                      onChange={(e) => handleManual(cIdx, e.target.value)}
                      placeholder={`/${row.maxMarks}`}
                    />
                  </td>
                </tr>
              ))}
              <tr className="tdf-total-row">
                <td colSpan="10" className="tdf-right"><strong>Raw Total (out of 40)</strong></td>
                <td className="tdf-center"><strong>{getRawTotal(activeEvaluator).toFixed(1)}</strong></td>
              </tr>
              <tr className="tdf-final-row">
                <td colSpan="10" className="tdf-right">
                  <strong>Converted Marks ({EVALUATORS.find((e) => e.key === activeEvaluator).percent}, out of 5)</strong>
                </td>
                <td className="tdf-center"><strong>{getConvertedMarks(activeEvaluator)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments */}
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
                    value={current.comments}
                    onChange={(e) => updateCurrent({ comments: e.target.value })}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Grand total preview */}
      <div className="tdf-grand-total-box">
        <span>Total Marks (Evaluation Committee + Project Committee)</span>
        <strong>{getGrandTotal()} / 10</strong>
      </div>

      <div className="tdf-actions">
        <button className="tdf-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Evaluation'}
        </button>
        <button className="tdf-print-btn" onClick={() => setPrintOpen(true)}>
          Print Rubrics
        </button>
        <button className="tdf-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

      <TitleDefenseRubricsPrint
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        group={group}
        criteria={titleDefenseCriteria}
        evaluators={EVALUATORS}
        evaluatorData={evaluatorData}
      />

    </div>
  );
};

export default TitleDefenseEvaluationForm;

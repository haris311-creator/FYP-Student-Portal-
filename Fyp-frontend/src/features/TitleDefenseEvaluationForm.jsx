import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { evaluationAPI } from '../utils/api';
import { titleDefenseCriteria } from '../data/titleDefenseRubricData';
import './TitleDefenseEvaluationForm.css';

const TitleDefenseEvaluationForm = ({ group, onClose }) => {
  const [showRubric, setShowRubric] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [adminEditMode, setAdminEditMode] = useState(false);

  const [evalLink, setEvalLink] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [ecStatus, setEcStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [evaluatorName, setEvaluatorName] = useState('');
  const [selections, setSelections] = useState(
    Object.fromEntries(titleDefenseCriteria.map((_, i) => [i, null]))
  );
  const [marks, setMarks] = useState(
    Object.fromEntries(titleDefenseCriteria.map((_, i) => [i, '']))
  );
  const [comments, setComments] = useState('');

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch (e) {
      return {};
    }
  })();
  const isAdmin = currentUser.user_type === 'admin';

  const buildEvalLink = (token) => `${window.location.origin}/evaluate/td/${token}`;

  // Load existing evaluations (Project Committee submission + Evaluation Committee status) on mount
  useEffect(() => {
    const loadExisting = async () => {
      if (!group?.id) {
        setLoadingExisting(false);
        return;
      }
      try {
        const res = await evaluationAPI.getTitleDefenseByGroup(group.id);
        const results = res?.data?.results || [];

        const pcRecord = results.find((r) => r.role === 'project_committee');
        const ecRecord = results.find((r) => r.role === 'evaluation_committee');

        if (pcRecord && pcRecord.is_submitted) {
          setEvaluatorName(pcRecord.evaluator_name || '');
          const loadedMarks = pcRecord.criteria_marks || {};
          setMarks((prev) => ({ ...prev, ...loadedMarks }));
          const derivedSelections = {};
          titleDefenseCriteria.forEach((row, idx) => {
            const val = parseFloat(loadedMarks[idx]);
            derivedSelections[idx] = !isNaN(val) ? Math.round((val / row.maxMarks) * 5) : null;
          });
          setSelections((prev) => ({ ...prev, ...derivedSelections }));
          setComments(pcRecord.comments || '');
          setIsLocked(true);
        }

        if (ecRecord) {
          setEvalLink({
            token: ecRecord.evaluation_token,
            link: buildEvalLink(ecRecord.evaluation_token),
            submitted: ecRecord.is_submitted
          });
        }

        fetchStatus();
      } catch (err) {
        console.error('Error loading existing title defense evaluation:', err);
      } finally {
        setLoadingExisting(false);
      }
    };
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  const fetchStatus = async () => {
    if (!group?.id) return;
    setLoadingStatus(true);
    try {
      const res = await evaluationAPI.getTitleDefenseStatus(group.id);
      setEcStatus(res?.data || null);
    } catch (err) {
      setEcStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await evaluationAPI.createTitleDefenseSession(group?.id);
      const token = res?.data?.token;
      if (token) {
        const link = res?.data?.link || buildEvalLink(token);
        setEvalLink({ token, link, submitted: false });
        navigator.clipboard?.writeText(link);
        toast.success('Evaluation link generated and copied!');
        fetchStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate evaluation link.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  const readOnly = isLocked && !(isAdmin && adminEditMode);

  const handleRadio = (cIdx, value) => {
    if (readOnly) return;
    setSelections((prev) => ({ ...prev, [cIdx]: value }));
    setMarks((prev) => ({
      ...prev,
      [cIdx]: ((value / 5) * titleDefenseCriteria[cIdx].maxMarks).toFixed(1)
    }));
  };

  const handleManual = (cIdx, value) => {
    if (readOnly) return;
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
      toast.warning('Please enter the evaluator name.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        group: group?.id,
        role: 'project_committee',
        evaluator_name: evaluatorName,
        criteria_marks: marks,
        raw_total: rawTotal,
        comments,
        is_submitted: true
      };
      await evaluationAPI.submitTitleDefense(payload);
      setSubmitted(true);
      setIsLocked(true);
      setAdminEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="tdf-container">
        <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="tdf-container">
        <div className="tdf-success">
          <div className="tdf-success-icon">&#10003;</div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif" }}>Submitted Successfully</h2>
          <p>Your Title Defense evaluation has been recorded.</p>
          <div className="tdf-success-actions">
            <button className="tdf-cancel-btn" onClick={onClose}>Back to Group</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tdf-container">

      <div className="tdf-header">
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif" }}>Title Defense Evaluation</h2>
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

      {isLocked && (
        <div style={{
          background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '16px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
        }}>
          <span style={{ fontSize: '13px', color: '#854d0e' }}>
            {adminEditMode
              ? 'Admin edit mode — you can modify this submitted evaluation.'
              : 'This evaluation has already been submitted and is read-only.'}
          </span>
          {isAdmin && (
            <button
              onClick={() => setAdminEditMode((prev) => !prev)}
              style={{
                background: adminEditMode ? '#64748b' : '#1e3a8a', color: 'white', border: 'none',
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              {adminEditMode ? 'Cancel Edit' : 'Edit (Admin)'}
            </button>
          )}
        </div>
      )}

      {/* Evaluation Committee Link */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '20px' }}>
<h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#1e3a8a', fontFamily: "'Manrope', sans-serif" }}>
  Committee Evaluation Links
</h3>
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
            Generate a unique link for the Evaluation Committee. The link can be used only once.
          </p>

          {loadingStatus ? (
            <p style={{ fontSize: '12px', color: '#64748b' }}>Loading status...</p>
          ) : ecStatus?.submitted > (evalLink ? 0 : -1) && evalLink?.submitted ? null : null}

          {evalLink?.submitted ? (
            <div style={{
              background: '#f0fdf4', borderLeft: '3px solid #22c55e', borderRadius: '6px',
              padding: '10px 14px', fontSize: '13px', color: '#166534', fontWeight: 600
            }}>
              &#10003; Evaluation Committee has submitted their evaluation.
            </div>
          ) : evalLink ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                background: '#f0f9ff', borderLeft: '3px solid #3b82f6', borderRadius: '6px', padding: '10px 14px'
              }}>
                <code style={{ flex: 1, fontSize: '12px', color: '#1e3a8a', wordBreak: 'break-all', minWidth: '200px' }}>
                  {evalLink.link}
                </code>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                  background: '#fef9c3', color: '#854d0e', whiteSpace: 'nowrap'
                }}>
                  active
                </span>
                <button
                  onClick={() => copyLink(evalLink.link)}
                  style={{
                    background: 'white', border: '1px solid #bfdbfe', color: '#1e3a8a',
                    padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={fetchStatus}
                  style={{
                    background: 'white', border: '1px solid #cbd5e1', color: '#475569',
                    padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  Refresh Status
                </button>
              </div>
            </div>
          ) : (
            <button className="gmp-evaluate-btn" onClick={handleGenerateLink} disabled={generatingLink}>
              {generatingLink ? 'Generating...' : 'Generate Evaluation Link'}
            </button>
          )}
        </div>
      </div>

      {/* Rubric Reference */}
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

      {/* Project Committee — Evaluator Name */}
      <div className="tdf-section">
        <h3 className="tdf-section-title">Project Committee Evaluation (5%)</h3>
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
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    disabled={readOnly}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Marks Entry */}
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
                        name={`pc_c${cIdx}`}
                        value={level}
                        checked={selections[cIdx] === level}
                        onChange={() => handleRadio(cIdx, level)}
                        disabled={readOnly}
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
                      disabled={readOnly}
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
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    disabled={readOnly}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="tdf-actions">
        <button className="tdf-submit-btn" onClick={handleSubmit} disabled={submitting || readOnly}>
          {submitting ? 'Submitting...' : isLocked && adminEditMode ? 'Update Evaluation' : 'Submit Evaluation'}
        </button>
        <button className="tdf-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

    </div>
  );
};

export default TitleDefenseEvaluationForm;
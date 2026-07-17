import React, { useState, useEffect } from 'react';
import { reportAPI, evaluationAPI } from '../utils/api';
import { reportCriteria } from './reportRubricData';
import ProjectReportRubricsPrint from './ProjectReportRubricsPrint';
import './ProjectReportEvaluationForm.css';

const ProjectReportEvaluationForm = ({ group, onClose }) => {
  const [showRubric, setShowRubric] = useState(false);
  const [showPrintable, setShowPrintable] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [comments, setComments] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [existingEvaluation, setExistingEvaluation] = useState(null);

  const [selections, setSelections] = useState(
    Object.fromEntries(reportCriteria.map((_, i) => [i, null]))
  );
  const [marks, setMarks] = useState(
    Object.fromEntries(reportCriteria.map((_, i) => [i, '']))
  );


  // Report fetch karo
  useEffect(() => {
    const fetchReport = async () => {
      if (!group?.id) return;
      
      setLoadingReport(true);
      try {
        // Admin/Committee ke liye group report endpoint
        const response = await reportAPI.getGroupReport(group.id);
        setReportData(response.data);
      } catch (err) {
        console.error('Error fetching report:', err);
        setReportData(null);
      } finally {
        setLoadingReport(false);
      }
    };
    
    fetchReport();
  }, [group?.id]);

  // Existing evaluation fetch karo (agar hai toh)
  useEffect(() => {
    const fetchExistingEvaluation = async () => {
      if (!group?.id) return;
      
      try {
        const response = await evaluationAPI.getReportByGroup(group.id);
        const evaluations = response.data;
        
        if (evaluations && evaluations.length > 0) {
          const latestEval = evaluations[0];
          setExistingEvaluation(latestEval);
          
          // Form pre-fill karo
          setEvaluatorName(latestEval.evaluator_name || '');
          setComments(latestEval.comments || '');
          
          // Criteria marks set karo
          if (latestEval.criteria_marks) {
            const newMarks = {};
            const newSelections = {};
            
            Object.entries(latestEval.criteria_marks).forEach(([key, value]) => {
              newMarks[key] = value;
              // Radio button ke liye calculate karo
              const criteriaIndex = parseInt(key);
              if (!isNaN(criteriaIndex)) {
                const maxMarks = reportCriteria[criteriaIndex]?.maxMarks || 5;
                newSelections[criteriaIndex] = Math.round((value / maxMarks) * 5);
              }
            });
            
            setMarks(newMarks);
            setSelections(newSelections);
          }
          
          setSubmitted(true);
        }
      } catch (err) {
        console.error('Error fetching existing evaluation:', err);
      }
    };
    
    fetchExistingEvaluation();
  }, [group?.id]);


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
        group: group?.id,
        evaluator_name: evaluatorName,
        criteria_marks: marks,
        raw_total: getRawTotal(),
        final_marks: parseFloat(getFinalMarks()),
        comments: comments
      };


      if (existingEvaluation) {
        // Update existing
        await evaluationAPI.updateReport(existingEvaluation.id, payload);
      } else {
        // Create new
        await evaluationAPI.submitReport(payload);
      }
      
      setSubmitted(true);

      // Parent component ko refresh karne ka signal
      if (onClose) {
        setTimeout(() => onClose(), 1500);
      }

    } catch (err) {
      console.error('Error submitting report evaluation:', err);
      alert(err.response?.data?.detail || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleViewReport = () => {
  // Report view/download ka logic yahan
  if (reportData?.report_file) {
    window.open(reportData.report_file, '_blank');
  } else {
    alert('Report not uploaded yet.');
  }
};

  const handleDownloadReport = async () => {
    if (reportData?.report_file) {
      const link = document.createElement('a');
      link.href = reportData.report_file;
      link.download = `Report_${group.project_title}.pdf`;
      link.click();
    } else {
      alert('Report not uploaded yet.');
    }
  };



if (submitted) {
  return (
    <div className="mlm-container">
      <div className="mlm-success">
        <div className="mlm-success-icon">&#10003;</div>
        <h2>Already Submitted</h2>
        <p style={{ marginBottom: '20px' }}>Project report marks have been recorded for this group.</p>
        
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
              {evaluatorName}
            </p>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#64748b', fontSize: '13px' }}>Marks Awarded:</strong>
            <p style={{ margin: '5px 0', fontSize: '20px', fontWeight: 600, color: '#16a34a' }}>
              {getFinalMarks()}/30
            </p>
          </div>
          {comments && (
            <div>
              <strong style={{ color: '#64748b', fontSize: '13px' }}>Comments:</strong>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#475569', fontStyle: 'italic' }}>
                {comments}
              </p>
            </div>
          )}
          {existingEvaluation && (
            <div style={{ marginTop: '15px', fontSize: '12px', color: '#94a3b8' }}>
              Submitted: {new Date(existingEvaluation.evaluated_at).toLocaleString()}
            </div>
          )}
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

      {/*  Report View/Download Section */}
      <div className="pref-section" style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #1e3a8a' }}>
        <h3 className="pref-section-title" style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
           Submitted Report
        </h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleViewReport}
            disabled={loadingReport}
            style={{
              padding: '8px 16px',
              background: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px'
            }}
          >
            {loadingReport ? 'Loading...' : ' View Report'}
          </button>
          <button 
            onClick={handleDownloadReport}
            disabled={loadingReport}
            style={{
              padding: '8px 16px',
              background: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px'
            }}
          >
             Download Report
          </button>
        </div>
        {reportData && (
          <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Submitted: {new Date(reportData.submitted_at).toLocaleString()}
            {reportData.is_late && <span style={{ color: '#f59e0b', marginLeft: '10px' }}> Late Submission</span>}
          </p>
        )}
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
        <button className="pref-print-btn" onClick={() => setShowPrintable(true)}>
          Print Evaluation
        </button>
        <button className="pref-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : existingEvaluation ? 'Update Evaluation' : 'Submit Evaluation'}
        </button>
        <button className="pref-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

      <ProjectReportRubricsPrint
        open={showPrintable}
        onClose={() => setShowPrintable(false)}
        group={group}
        criteria={reportCriteria}
        marks={marks}
        selections={selections}
        comments={comments}
        evaluatorName={evaluatorName}
        reportData={reportData}
        rawTotal={getRawTotal()}
        finalMarks={getFinalMarks()}
      />

    </div>
  );
};

export default ProjectReportEvaluationForm;

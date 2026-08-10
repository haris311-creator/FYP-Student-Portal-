import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { downloadNodeAsPdf } from '../utils/printUtils';
import './SupervisorPrintBase.css';
import './TitleDefenseRubricsPrint.css';

const getSelectedLevel = (selections, index, marks, criteria) => {
  const selected = selections?.[index];
  const manualMark = parseFloat(marks?.[index]);
  const maxMarks = criteria?.[index]?.maxMarks || 5;

  if (!Number.isNaN(manualMark) && manualMark >= 0) {
    const derived = Math.round((manualMark / maxMarks) * 5);
    if (derived >= 1 && derived <= 5) return derived;
  }
  return selected || null;
};

const TitleDefenseRubricsPrint = ({
  open,
  onClose,
  group,
  criteria = [],
  evaluators = [],
  evaluatorData = {}
}) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [activeEvaluator, setActiveEvaluator] = useState(evaluators[0]?.key || '');

  if (!open) return null;

  const members = group?.members || [];
  const projectTitle = group?.project || group?.title || '—';
  const supervisorName = group?.supervisor_name || group?.supervisor || '—';
  const semester = group?.phase || group?.semester || '—';
  const membersLabel = members.length ? members.map((m) => m.name).join(', ') : '—';

  const active = evaluators.find((e) => e.key === activeEvaluator) || evaluators[0];
  const data = evaluatorData[active?.key] || {};

  const handleDownload = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      await downloadNodeAsPdf(printRef.current, `Title_Defense_Rubrics_${active?.key || 'group'}_${group?.group_number || group?.title || 'group'}.pdf`);
    } catch (err) {
      console.error('Title Defense PDF failed:', err);
      toast.error('Failed to generate printable PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return createPortal(
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="sp-toolbar no-print">
          <div>
            <h3 className="sp-toolbar-title">Title Defense Rubrics</h3>
            <p className="sp-toolbar-subtitle">Printable version auto-filled from the current evaluation.</p>
          </div>
          <div className="sp-toolbar-actions">
            {evaluators.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`tdp-print-tab ${active?.key === e.key ? 'active' : ''}`}
                onClick={() => setActiveEvaluator(e.key)}
              >
                {e.label} ({e.percent})
              </button>
            ))}
            <button type="button" className="sp-btn sp-btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="sp-btn sp-btn-primary" onClick={handleDownload} disabled={generating}>
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="sp-preview-wrap">
          <div className="sp-page" ref={printRef}>

            <div className="sp-header-top tdp-header-top">
              <div className="sp-header-spacer" aria-hidden="true" />
              <div className="tdp-logo-wrap">
                <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="tdp-logo" />
              </div>
              <div className="sp-form-tag">FYDP-form 7</div>
            </div>

            <div className="sp-header-block">
              <h1 className="sp-title">Rubrics for FYDP Title Defense Presentation</h1>
            </div>

            <table className="sp-info-table">
              <tbody>
                <tr>
                  <td className="sp-label">Project Title</td>
                  <td className="sp-value">{projectTitle}</td>
                </tr>
                <tr>
                  <td className="sp-label">Student Names</td>
                  <td className="sp-value">{membersLabel}</td>
                </tr>
                <tr>
                  <td className="sp-label">Name of Project Supervisor</td>
                  <td className="sp-value">{supervisorName}</td>
                </tr>
                <tr>
                  <td className="sp-label">Semester</td>
                  <td className="sp-value">{semester}</td>
                </tr>
              </tbody>
            </table>

            {active && (
              <div className="tdp-evaluator-block">
                <p className="tdp-evaluator-heading">
                  {active.label} <span>({active.percent})</span>
                </p>

                <table className="tdp-rubric-table">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>CLOs</th>
                      <th style={{ width: '16%' }}>PLO/GA</th>
                      <th style={{ width: '20%' }}>Description</th>
                      <th style={{ width: '7%' }}>Weight</th>
                      <th style={{ width: '39%' }}>Performance (1 - 5)</th>
                      <th style={{ width: '10%' }}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((row, index) => {
                      const level = getSelectedLevel(data.selections, index, data.marks, criteria);
                      const selectedMarks = data.marks?.[index];
                      return (
                        <tr key={row.sno}>
                          <td className="tdp-center tdp-bold">{row.clo}</td>
                          <td className="tdp-center tdp-medium">{row.ga}</td>
                          <td className="tdp-center tdp-bold">{row.criteria}</td>
                          <td className="tdp-center">{row.weight}</td>
                          <td className="tdp-performance-cell">
                            {[1, 2, 3, 4, 5].map((option) => (
                              <span className="tdp-choice" key={option}>
                                {option}{' '}
                                <span className={level === option ? 'tdp-box tdp-box-active' : 'tdp-box'}>
                                  {level === option ? '✓' : ''}
                                </span>
                              </span>
                            ))}
                          </td>
                          <td className="tdp-center tdp-mark-cell">
                            {selectedMarks !== '' && selectedMarks !== null && selectedMarks !== undefined
                              ? Number.parseFloat(selectedMarks).toFixed(1)
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="tdp-bottom-info">
                  <div className="tdp-comment-box">
                    <div className="tdp-box-title">Comments</div>
                    <div className="tdp-box-body">{data.comments || '-'}</div>
                  </div>
                  <div className="tdp-sign-box">
                    <div className="tdp-box-title">Evaluator Name</div>
                    <div className="tdp-box-body tdp-signature-name">{data.evaluatorName || '-'}</div>
                    <div className="tdp-sign-line"></div>
                    <div className="tdp-box-body">Signature with Date</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TitleDefenseRubricsPrint;

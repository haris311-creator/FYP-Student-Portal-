import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import './ProjectReportRubricsPrint.css';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const getSelectedLevel = (selections, index, marks, criteria) => {
  const selected = selections?.[index];
  const manualMark = parseFloat(marks?.[index]);
  const maxMarks = criteria?.[index]?.maxMarks || 5;

  if (!Number.isNaN(manualMark) && manualMark >= 0) {
    const derived = Math.round((manualMark / maxMarks) * 5);
    if (derived >= 1 && derived <= 5) {
      return derived;
    }
  }

  return selected || null;
};

const ProjectReportRubricsPrint = ({
  open,
  onClose,
  group,
  criteria = [],
  marks = {},
  selections = {},
  comments = '',
  evaluatorName = '',
  reportData = null
}) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  const members = group?.members || [];
  const projectTitle = group?.project || group?.title || reportData?.project_title || 'Project Report';
  const supervisorName =
    group?.supervisor?.name ||
    group?.supervisor?.full_name ||
    group?.supervisor_name ||
    group?.supervisor ||
    '-';
  const semester = group?.phase || group?.semester || 'FYP-1';
  const membersLabel = members.length ? members.map((m) => m.name).join(', ') : '-';

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Project_Report_Rubrics_${group?.group_number || group?.title || 'group'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate printable PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rpt-modal-backdrop" onClick={onClose}>
      <div className="rpt-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="rpt-toolbar no-print">
          <div>
            <h3 className="rpt-toolbar-title">Project Report Rubrics</h3>
            <p className="rpt-toolbar-subtitle">Printable version auto-filled from the current evaluation.</p>
          </div>
          <div className="rpt-toolbar-actions">
            <button className="rpt-btn rpt-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="rpt-btn rpt-btn-primary" onClick={handleDownloadPDF} disabled={generating}>
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="rpt-preview-wrap">
          <div className="rpt-page" ref={printRef}>
            <div className="rpt-header-top">
              <div className="rpt-header-spacer" />
              <div className="gc-logo">
                <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="rpt-logo" />
              </div>
              <div className="rpt-form-tag">FYDP-Form9</div>
            </div>

            <div className="rpt-header-block">
              <h1 className="rpt-title">Rubrics for Evaluation of FYDP-1 Report</h1>
            </div>

            <table className="rpt-info-table">
              <tbody>
                <tr>
                  <td className="rpt-label">Project Title</td>
                  <td className="rpt-value">{projectTitle}</td>
                </tr>
                <tr>
                  <td className="rpt-label">Student Names</td>
                  <td className="rpt-value">{membersLabel}</td>
                </tr>
                <tr>
                  <td className="rpt-label">Name of Project Supervisor</td>
                  <td className="rpt-value">{supervisorName}</td>
                </tr>
                <tr>
                  <td className="rpt-label">Semester</td>
                  <td className="rpt-value">{semester}</td>
                </tr>
              </tbody>
            </table>

            <table className="rpt-rubric-table">
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
                  const level = getSelectedLevel(selections, index, marks, criteria);
                  const selectedMarks = marks?.[index];
                  return (
                    <tr key={row.sno}>
                      <td className="rpt-center rpt-bold">{row.clo}</td>
                      <td className="rpt-center rpt-medium">{row.ga}</td>
                      <td className="rpt-center rpt-bold">{row.criteria}</td>
                      <td className="rpt-center">{row.weight}</td>
                      <td className="rpt-performance-cell">
                        {[1, 2, 3, 4, 5].map((option) => (
                          <span className="rpt-choice" key={option}>
                            {option} <span className={level === option ? 'rpt-box rpt-box-active' : 'rpt-box'}>{level === option ? '✓' : ''}</span>
                          </span>
                        ))}
                      </td>
                      <td className="rpt-center rpt-mark-cell">
                        {selectedMarks !== '' && selectedMarks !== null && selectedMarks !== undefined
                          ? Number.parseFloat(selectedMarks).toFixed(1)
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="rpt-bottom-info">
              <div className="rpt-comment-box">
                <div className="rpt-box-title">Comments</div>
                <div className="rpt-box-body">{comments || '-'}</div>
              </div>
              <div className="rpt-sign-box">
                <div className="rpt-box-title">Evaluator Name</div>
                <div className="rpt-box-body rpt-signature-name">{evaluatorName || '-'}</div>
                <div className="rpt-sign-line"></div>
                <div className="rpt-box-body">Signature with Date</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReportRubricsPrint;

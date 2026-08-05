import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { sessionalCriteria } from './sessionalRubricData';
import './SupervisorSessionalPrint.css';

const getSelectedLevel = (selections, index, manualMarks, criteria) => {
  const selected = selections?.[index];
  const manualMark = parseFloat(manualMarks?.[index]);
  const maxMarks = criteria?.[index]?.maxMarks || 10;

  if (!Number.isNaN(manualMark) && manualMark >= 0) {
    const derived = Math.round((manualMark / maxMarks) * 5);
    if (derived >= 1 && derived <= 5) {
      return derived;
    }
  }

  return selected || null;
};

const StudentPage = ({ member, studentIdx, studentData, group }) => {
  const selections = studentData?.selections || {};
  const manualMarks = studentData?.manualMarks || {};
  const comments = studentData?.comments || '';

  const projectTitle = group?.project || group?.title || 'Project';
  const supervisorName =
    group?.supervisor?.name ||
    group?.supervisor?.full_name ||
    group?.supervisor_name ||
    group?.supervisor ||
    '-';
  const semester = group?.phase || group?.semester || 'FYP-1';

  return (
    <div className="ssp-page">
      <div className="ssp-header-top">
        <div className="ssp-header-spacer" />
        <div className="ssp-logo-wrap">
          <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="ssp-logo" />
        </div>
        <div className="ssp-form-tag">FYDP-Form 8</div>
      </div>

      <div className="ssp-header-block">
        <h1 className="ssp-title">Rubrics for Evaluation of FYDP-1 Sessional</h1>
      </div>

      <table className="ssp-info-table">
        <tbody>
          <tr>
            <td className="ssp-label">Project Title</td>
            <td className="ssp-value">{projectTitle}</td>
          </tr>
          <tr>
            <td className="ssp-label">Student Name</td>
            <td className="ssp-value">{member?.name || '-'}</td>
          </tr>
          <tr>
            <td className="ssp-label">Student ID</td>
            <td className="ssp-value">{member?.odoo_id || '-'}</td>
          </tr>
          <tr>
            <td className="ssp-label">Name of Project Supervisor</td>
            <td className="ssp-value">{supervisorName}</td>
          </tr>
          <tr>
            <td className="ssp-label">Semester</td>
            <td className="ssp-value">{semester}</td>
          </tr>
        </tbody>
      </table>

      <table className="ssp-rubric-table">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>S.No</th>
            <th style={{ width: '22%' }}>Criteria</th>
            <th style={{ width: '8%' }}>CLOs</th>
            <th style={{ width: '18%' }}>PLO/GA</th>
            <th style={{ width: '6%' }}>Weight</th>
            <th style={{ width: '30%' }}>Performance (1 - 5)</th>
            <th style={{ width: '10%' }}>Marks</th>
          </tr>
        </thead>
        <tbody>
          {sessionalCriteria.map((row, index) => {
            const level = getSelectedLevel(selections, index, manualMarks, sessionalCriteria);
            const mark = manualMarks?.[index];
            return (
              <tr key={row.sno}>
                <td className="ssp-center ssp-bold">{row.sno}</td>
                <td className="ssp-bold">{row.criteria}</td>
                <td className="ssp-center">{row.clo}</td>
                <td className="ssp-medium">{row.ga}</td>
                <td className="ssp-center">{row.weight}</td>
                <td className="ssp-performance-cell">
                  {[1, 2, 3, 4, 5].map((option) => (
                    <span className="ssp-choice" key={option}>
                      {option} <span className={level === option ? 'ssp-box ssp-box-active' : 'ssp-box'}>{level === option ? '✓' : ''}</span>
                    </span>
                  ))}
                </td>
                <td className="ssp-center ssp-mark-cell">
                  {mark !== '' && mark !== null && mark !== undefined
                    ? Number.parseFloat(mark).toFixed(1)
                    : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ssp-bottom-info">
        <div className="ssp-comment-box">
          <div className="ssp-box-title">Comments</div>
          <div className="ssp-box-body">{comments || '-'}</div>
        </div>
        <div className="ssp-sign-box">
          <div className="ssp-box-title">Supervisor Name</div>
          <div className="ssp-box-body ssp-signature-name">{supervisorName}</div>
          <div className="ssp-sign-line"></div>
          <div className="ssp-box-body">Signature with Date</div>
        </div>
      </div>
    </div>
  );
};

const SupervisorSessionalPrint = ({
  open,
  onClose,
  group,
  studentMarks = [],
  members = []
}) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

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

      pdf.save(`Sessional_Rubrics_${group?.group_number || group?.title || 'group'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate printable PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="ssp-modal-backdrop" onClick={onClose}>
      <div className="ssp-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="ssp-toolbar">
          <div>
            <h3 className="ssp-toolbar-title">Sessional Evaluation Rubrics</h3>
            <p className="ssp-toolbar-subtitle">Printable version auto-filled from the current evaluation.</p>
          </div>
          <div className="ssp-toolbar-actions">
            <button className="ssp-btn ssp-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="ssp-btn ssp-btn-primary" onClick={handleDownloadPDF} disabled={generating}>
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="ssp-preview-wrap">
          <div ref={printRef}>
            {members.map((member, idx) => (
              <StudentPage
                key={idx}
                member={member}
                studentIdx={idx}
                studentData={studentMarks[idx]}
                group={group}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SupervisorSessionalPrint;

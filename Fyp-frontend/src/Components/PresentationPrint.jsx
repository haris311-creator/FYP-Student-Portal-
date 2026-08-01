import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { presentationCriteria, vivaCriteria } from './rubricData/presentationCriteria';
import './PresentationPrint.css';

const getLevel = (selections, idx, marks, criteria) => {
  const sel = selections?.[idx];
  const mark = parseFloat(marks?.[idx]);
  const max = criteria?.[idx]?.maxMarks || 5;
  if (!Number.isNaN(mark) && mark >= 0) {
    const d = Math.round((mark / max) * 5);
    if (d >= 1 && d <= 5) return d;
  }
  return sel || null;
};

const PresentationPage = ({ criteria, marks, selections, group }) => {
  const members = group?.members || [];
  const projectTitle = group?.project || group?.title || 'Project';
  const supervisorName = group?.supervisor?.name || group?.supervisor?.full_name || group?.supervisor_name || group?.supervisor || '-';
  const semester = group?.phase || group?.semester || 'FYP-1';

  return (
    <div className="pp-page">
      <div className="pp-header-top">
        <div className="pp-header-spacer" />
        <div className="pp-logo-wrap">
          <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="pp-logo" />
        </div>
        <div className="pp-form-tag">FYDP-Form</div>
      </div>

      <div className="pp-header-block">
        <h1 className="pp-title">Rubrics for Evaluation of FYDP-1 Presentation</h1>
      </div>

      <table className="pp-info-table">
        <tbody>
          <tr>
            <td className="pp-label">Project Title</td>
            <td className="pp-value">{projectTitle}</td>
            <td className="pp-label">Student Names</td>
            <td className="pp-value">{members.map(m => m.name).join(', ') || '-'}</td>
          </tr>
          <tr>
            <td className="pp-label">Supervisor</td>
            <td className="pp-value">{supervisorName}</td>
            <td className="pp-label">Semester</td>
            <td className="pp-value">{semester}</td>
          </tr>
        </tbody>
      </table>

      <table className="pp-rubric-table">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>S.No</th>
            <th style={{ width: '22%' }}>Criteria</th>
            <th style={{ width: '8%' }}>CLOs</th>
            <th style={{ width: '18%' }}>PLO/GA</th>
            <th style={{ width: '6%' }}>Wt</th>
            <th style={{ width: '30%' }}>Performance (1 - 5)</th>
            <th style={{ width: '10%' }}>Marks</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((row, idx) => {
            const level = getLevel(selections, idx, marks, criteria);
            const mark = marks?.[idx];
            return (
              <tr key={row.sno}>
                <td className="pp-center pp-bold">{row.sno}</td>
                <td className="pp-bold">{row.criteria}</td>
                <td className="pp-center">{row.clo}</td>
                <td className="pp-medium">{row.ga}</td>
                <td className="pp-center">{row.weight}</td>
                <td className="pp-performance-cell">
                  {[1, 2, 3, 4, 5].map(o => (
                    <span className="pp-choice" key={o}>
                      {o} <span className={level === o ? 'pp-box pp-box-active' : 'pp-box'}>{level === o ? '✓' : ''}</span>
                    </span>
                  ))}
                </td>
                <td className="pp-center pp-mark-cell">
                  {mark !== '' && mark != null ? Number.parseFloat(mark).toFixed(1) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const VivaPage = ({ vivaMarks, vivaSelections, group }) => {
  const members = group?.members || [];
  const projectTitle = group?.project || group?.title || 'Project';

  return (
    <div className="pp-page">
      <div className="pp-header-top">
        <div className="pp-header-spacer" />
        <div className="pp-logo-wrap">
          <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="pp-logo" />
        </div>
        <div className="pp-form-tag">FYDP-Form</div>
      </div>

      <div className="pp-header-block">
        <h1 className="pp-title">Viva / Q&A Evaluation — {projectTitle}</h1>
      </div>

      <table className="pp-info-table">
        <tbody>
          <tr>
            <td className="pp-label">Project Title</td>
            <td className="pp-value">{projectTitle}</td>
            <td className="pp-label">Criteria</td>
            <td className="pp-value">{vivaCriteria.criteria}</td>
          </tr>
          <tr>
            <td className="pp-label">CLOs</td>
            <td className="pp-value">{vivaCriteria.clo}</td>
            <td className="pp-label">PLO/GA</td>
            <td className="pp-value">{vivaCriteria.ga}</td>
          </tr>
        </tbody>
      </table>

      <table className="pp-rubric-table">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>CLOs</th>
            <th>PLO/GA</th>
            <th>Wt</th>
            <th style={{ width: '30%' }}>Performance (1 - 5)</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, sIdx) => {
            const level = getLevel(vivaSelections, sIdx, vivaMarks, [vivaCriteria]);
            const mark = vivaMarks?.[sIdx];
            return (
              <tr key={sIdx}>
                <td className="pp-bold">{member.name}</td>
                <td className="pp-center">{vivaCriteria.clo}</td>
                <td className="pp-medium">{vivaCriteria.ga}</td>
                <td className="pp-center">{vivaCriteria.weight}</td>
                <td className="pp-performance-cell">
                  {[1, 2, 3, 4, 5].map(o => (
                    <span className="pp-choice" key={o}>
                      {o} <span className={level === o ? 'pp-box pp-box-active' : 'pp-box'}>{level === o ? '✓' : ''}</span>
                    </span>
                  ))}
                </td>
                <td className="pp-center pp-mark-cell">
                  {mark !== '' && mark != null ? Number.parseFloat(mark).toFixed(1) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pp-bottom-info">
        <div className="pp-comment-box">
          <div className="pp-box-title">Comments</div>
          <div className="pp-box-body">{group?.comments || '-'}</div>
        </div>
        <div className="pp-sign-box">
          <div className="pp-box-title">Evaluator Name</div>
          <div className="pp-box-body pp-signature-name">{group?.evaluatorName || '-'}</div>
          <div className="pp-sign-line"></div>
          <div className="pp-box-body">Signature with Date</div>
        </div>
      </div>
    </div>
  );
};

const PresentationPrint = ({
  open, onClose, group,
  presentationMarks = {}, presentationSelections = {},
  vivaMarks = {}, vivaSelections = {},
  comments = '', evaluatorName = ''
}) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const iw = pw;
      const ih = (canvas.height * iw) / canvas.width;
      let hl = ih, pos = 0;
      pdf.addImage(imgData, 'PNG', 0, pos, iw, ih);
      hl -= ph;
      while (hl > 0) { pos = hl - ih; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, pos, iw, ih); hl -= ph; }
      pdf.save(`Presentation_Rubrics_${group?.group_number || group?.title || 'group'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF.');
    } finally { setGenerating(false); }
  };

  return (
    <div className="pp-modal-backdrop" onClick={onClose}>
      <div className="pp-modal-shell" onClick={e => e.stopPropagation()}>
        <div className="pp-toolbar">
          <div>
            <h3 className="pp-toolbar-title">Presentation Evaluation Rubrics</h3>
            <p className="pp-toolbar-subtitle">Printable version auto-filled from the current evaluation.</p>
          </div>
          <div className="pp-toolbar-actions">
            <button className="pp-btn pp-btn-secondary" onClick={onClose}>Close</button>
            <button className="pp-btn pp-btn-primary" onClick={handleDownloadPDF} disabled={generating}>
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
        <div className="pp-preview-wrap">
          <div ref={printRef}>
            <PresentationPage criteria={presentationCriteria} marks={presentationMarks} selections={presentationSelections} group={group} />
            <VivaPage vivaMarks={vivaMarks} vivaSelections={vivaSelections} group={{ ...group, comments, evaluatorName }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationPrint;

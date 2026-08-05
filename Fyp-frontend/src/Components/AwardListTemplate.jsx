import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { evaluationAPI } from '../utils/api';
import './AwardListTemplate.css';

const AwardListTemplate = ({ group }) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Evaluation states
  const [sessionalMarks, setSessionalMarks] = useState({});
  const [meetingLogMarks, setMeetingLogMarks] = useState(null);
  const [reportMarks, setReportMarks] = useState(null);
  const [presentationData, setPresentationData] = useState(null);
  
  // Auto-calculated marks per student
  const [studentMarks, setStudentMarks] = useState({});

  // Fetch all evaluations when component mounts
  useEffect(() => {
    const fetchAllEvaluations = async () => {
      if (!group?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Parallel fetch all evaluations
        const [sessionalRes, meetingLogRes, reportRes, presentationRes] = await Promise.all([
          evaluationAPI.getSessionalByGroup(group.id),
          evaluationAPI.getMeetingLogByGroup(group.id),
          evaluationAPI.getReportByGroup(group.id),
          evaluationAPI.getPresentationByGroup(group.id)
        ]);

        // Process Sessional Marks (per student)
        const sessionalData = {};
        if (sessionalRes.data && sessionalRes.data.length > 0) {
          sessionalRes.data.forEach(evaluation => {
            sessionalData[evaluation.student] = parseFloat(evaluation.final_marks) || 0;
          });
        }
        setSessionalMarks(sessionalData);

        // Process Meeting Log Marks (same for all students)
        if (meetingLogRes.data && meetingLogRes.data.length > 0) {
          setMeetingLogMarks(parseFloat(meetingLogRes.data[0].marks) || 0);
        }

        // Process Report Marks (same for all students)
        if (reportRes.data && reportRes.data.length > 0) {
          setReportMarks(parseFloat(reportRes.data[0].final_marks) || 0);
        }

        // Process Presentation Marks (per student)
        if (presentationRes.data && presentationRes.data.per_student_marks) {
          setPresentationData(presentationRes.data.per_student_marks);
        }

      } catch (err) {
        console.error('Error fetching evaluations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllEvaluations();
  }, [group?.id]);

  // Calculate totals when any evaluation changes
  useEffect(() => {
    if (!group?.members) return;

    const marks = {};
    
    group.members.forEach(member => {
      const memberId = member.id;
      
      // Sessional (20%)
      const sessional = sessionalMarks[memberId] || 0;
      
      // Meeting Log (10%) - same for all
      const meetingLog = meetingLogMarks !== null ? meetingLogMarks : 0;
      
      // Report (30%) - same for all
      const report = reportMarks !== null ? reportMarks : 0;
      
      // Presentation (40%) - per student
      const presentation = presentationData && presentationData[memberId] 
        ? presentationData[memberId].scaled_marks 
        : 0;
      
      // Total out of 100
      const total = sessional + meetingLog + report + presentation;
      
      marks[memberId] = {
        sessional: sessional.toFixed(1),
        meetingLog: meetingLog.toFixed(1),
        report: report.toFixed(1),
        presentation: presentation.toFixed(1),
        total: total.toFixed(1)
      };
    });

    setStudentMarks(marks);
  }, [sessionalMarks, meetingLogMarks, reportMarks, presentationData, group?.members]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc, clonedElement) => {
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.maxWidth = '800px';
          clonedElement.style.margin = '0 auto';
          
          const inputs = clonedElement.querySelectorAll('input');
          inputs.forEach((input) => {
            const div = clonedDoc.createElement('div');
            div.textContent = input.value || input.getAttribute('value') || '';
            div.className = input.className;
            
            if (input.classList.contains('alt-title-input')) {
              div.style.display = 'block';
              div.style.flex = '1';
              div.style.borderBottom = '1px solid #000';
              div.style.paddingTop = '2px';
              div.style.minHeight = '20px';
            } else if (input.classList.contains('alt-header-input')) {
              div.style.display = 'inline-block';
              div.style.borderBottom = '1px solid #000';
              div.style.minWidth = input.classList.contains('alt-header-input-short') ? '70px' : '140px';
              div.style.textAlign = 'center';
            } else if (input.classList.contains('alt-cell-input')) {
              div.style.display = 'flex';
              div.style.alignItems = 'center';
              div.style.justifyContent = 'center';
              div.style.minHeight = '38px';
              div.style.width = '100%';
              div.style.textAlign = 'center';
            }
            
            input.parentNode.replaceChild(div, input);
          });
        }
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

      const fileName = `AwardList_${group?.group_number || group?.title || 'group'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const members = group?.members || [];

  if (loading) {
    return (
      <div className="alt-wrapper">
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#64748b',
          background: '#f8fafc',
          borderRadius: '8px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alt-wrapper">

      <div className="alt-toolbar">
        <h3 className="alt-toolbar-title">Award List</h3>
        <button className="alt-download-btn" onClick={handleDownloadPDF} disabled={generating}>
          {generating ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      <div className="alt-print-area">
        <div className="alt-page" ref={printRef}>

          <div className="alt-doc-header">
            <div className="alt-header-top">
              <div className="alt-header-spacer" />
              <div className="gc-logo">
                <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="alt-logo" />
              </div>
              <div className="alt-award-tag">Award List-2</div>
            </div>
            <p className="alt-uni-name">Iqra University</p>
            <p className="alt-faculty">Faculty of Engineering Sciences and Technology</p>
            <p className="alt-dept-line">
              Department of <span className="alt-fixed-fill">Computer Science</span>
            </p>
            <p className="alt-batch-line">
              Batch: <input type="text" className="alt-header-input alt-header-input-short" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} />
              &nbsp;&nbsp;&nbsp;Date of Conduct: <input type="date" className="alt-header-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} />
            </p>
            <h2 className="alt-doc-title">Award List of FYDP-1</h2>
          </div>

          <div className="alt-title-row">
            <span className="alt-title-label">Title of the project:</span>
            <input type="text" className="alt-title-input" defaultValue={group?.project || group?.title || ''} onChange={(e) => e.target.setAttribute('value', e.target.value)} />
          </div>

          <table className="alt-table">
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13.75%' }} />
              <col style={{ width: '13.75%' }} />
              <col style={{ width: '13.75%' }} />
              <col style={{ width: '13.75%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan="2">S. No.</th>
                <th rowSpan="2">Name of the student</th>
                <th rowSpan="2">ID No.</th>
                <th colSpan="4">Evaluation</th>
                <th rowSpan="2">Total<br />(100)</th>
              </tr>
              <tr>
                <th>Presentation<br />(40%)</th>
                <th>Project report<br />(30%)</th>
                <th>Progress report<br />(20%)</th>
                <th>Meeting log<br />(10%)</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? (
                members.map((m, idx) => {
                  const marks = studentMarks[m.id] || {
                    sessional: '0.0',
                    meetingLog: '0.0',
                    report: '0.0',
                    presentation: '0.0',
                    total: '0.0'
                  };
                  
                  return (
                    <tr key={idx}>
                      <td className="alt-center">{idx + 1}</td>
                      <td className="alt-name-cell">{m.name}</td>
                      <td className="alt-center">{m.odoo_id || ''}</td>
                      <td className="alt-center" style={{ 
                        background: marks.presentation === '0.0' ? '#fef3c7' : 'transparent',
                        fontWeight: marks.presentation !== '0.0' ? '600' : '400'
                      }}>
                        {marks.presentation}
                      </td>
                      <td className="alt-center" style={{ 
                        background: marks.report === '0.0' ? '#fef3c7' : 'transparent',
                        fontWeight: marks.report !== '0.0' ? '600' : '400'
                      }}>
                        {marks.report}
                      </td>
                      <td className="alt-center" style={{ 
                        background: marks.sessional === '0.0' ? '#fef3c7' : 'transparent',
                        fontWeight: marks.sessional !== '0.0' ? '600' : '400'
                      }}>
                        {marks.sessional}
                      </td>
                      <td className="alt-center" style={{ 
                        background: marks.meetingLog === '0.0' ? '#fef3c7' : 'transparent',
                        fontWeight: marks.meetingLog !== '0.0' ? '600' : '400'
                      }}>
                        {marks.meetingLog}
                      </td>
                      <td className="alt-center" style={{ 
                        background: '#f0fdf4',
                        fontWeight: '700',
                        color: '#166534'
                      }}>
                        {marks.total}
                      </td>
                    </tr>
                  );
                })
              ) : (
                [1, 2, 3].map(n => (
                  <tr key={n}>
                    <td className="alt-center">{n}</td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" defaultValue="" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>
      </div>

    </div>
  );
};

export default AwardListTemplate;

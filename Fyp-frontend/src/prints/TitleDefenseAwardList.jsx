import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { evaluationAPI } from '../utils/api';
import './TitleDefenseAwardList.css';

const TitleDefenseAwardList = ({ group }) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-fetch Title Defense evaluations when group changes
  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!group?.id) return;
      
      setLoading(true);
      try {
        const res = await evaluationAPI.getTitleDefenseByGroup(group.id);
        const data = res.data?.results || [];
        console.log('📊 Title Defense Evaluations:', data); // Debug log
        setEvaluations(data);
      } catch (err) {
        console.error('Failed to fetch Title Defense evaluations:', err);
        toast.error('Could not load evaluation marks');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [group?.id]);

  // Helper: Get marks for a specific role (flexible matching)
  const getMarksByRole = (roleKeyword) => {
    const evalRecord = evaluations.find(e => {
      const role = e.role?.toLowerCase() || '';
      const roleDisplay = e.role_display?.toLowerCase() || '';
      return role.includes(roleKeyword.toLowerCase()) || 
             roleDisplay.includes(roleKeyword.toLowerCase());
    });
    
    return evalRecord ? parseFloat(evalRecord.converted_marks) : 0;
  };

  // Auto-calculate total (Project Committee + Evaluation Committee)
  const totalMarks = (() => {
    const pc = getMarksByRole('project');
    const ec = getMarksByRole('evaluation');
    return (pc + ec).toFixed(1);
  })();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 4,
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

      const fileName = `TitleDefense_AwardList_${group?.group_number || group?.title || 'group'}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const members = group?.members || [];
  const evaluationCommitteeMarks = getMarksByRole('evaluation');
  const projectCommitteeMarks = getMarksByRole('project');

  return (
    <div className="tal-wrapper">

      <div className="tal-toolbar">
        <h3 className="tal-toolbar-title">Title Defense Award List</h3>
        <div className="tal-toolbar-actions">
          {loading && <span className="tal-loading-text">Loading marks...</span>}
          <button className="tal-download-btn" onClick={handleDownloadPDF} disabled={generating}>
            {generating ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="tal-print-area">
        <div className="tal-page" ref={printRef}>

          <div className="tal-doc-header">
            <div className="tal-header-top">
              <div className="tal-header-spacer" />
              <div className="tal-logo-wrap">
                <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="tal-logo" />
              </div>
              <div className="tal-award-tag">Award List-1</div>
            </div>
            <p className="tal-uni-name">Iqra University</p>
            <p className="tal-faculty">Faculty of Engineering Sciences and Technology</p>
            <p className="tal-dept-line">
              Department of <span className="tal-fixed-fill">Computer Science</span>
            </p>
            <p className="tal-batch-line">
              <span>Batch </span><input type="text" className="tal-header-input tal-header-input-short" />
            </p>
            <h2 className="tal-doc-title">Award List of FYDP Title Defense</h2>
          </div>

          <div className="tal-title-row">
            <span className="tal-title-label">Title of the project:</span>
            <input type="text" className="tal-title-input" defaultValue={group?.project || group?.title || ''} />
          </div>

          <table className="tal-table">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan="2">S. No.</th>
                <th rowSpan="2">Name of the Student</th>
                <th rowSpan="2">ID No.</th>
                <th colSpan="2">Evaluation</th>
                <th rowSpan="2">Total Marks<br />(10)</th>
              </tr>
              <tr>
                <th>Evaluation Committee (5%)<br />Max. Marks-40</th>
                <th>Project Committee (5%)<br />Max. Marks-40</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? (
                members.map((m, idx) => (
                  <tr key={idx}>
                    <td className="tal-center">{idx + 1}</td>
                    <td className="tal-name-cell">{m.name}</td>
                    <td className="tal-center">{m.odoo_id || ''}</td>
                    <td className="tal-input-cell">
                      <input 
                        type="text" 
                        className="tal-cell-input" 
                        value={evaluationCommitteeMarks.toFixed(1)}
                        readOnly
                        style={{ background: '#fef3c', textAlign: 'center' }}
                      />
                    </td>
                    <td className="tal-input-cell">
                      <input 
                        type="text" 
                        className="tal-cell-input" 
                        value={projectCommitteeMarks.toFixed(1)}
                        readOnly
                        style={{ background: '#fef3c', textAlign: 'center' }}
                      />
                    </td>
                    <td className="tal-input-cell">
                      <input 
                        type="text" 
                        className="tal-cell-input" 
                        value={totalMarks}
                        readOnly
                        style={{ fontWeight: 'bold', background: '#f0f9ff', textAlign: 'center' }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                [1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td className="tal-center">{n}</td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
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

export default TitleDefenseAwardList;
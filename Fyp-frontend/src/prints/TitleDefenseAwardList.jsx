import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import './TitleDefenseAwardList.css';

const TitleDefenseAwardList = ({ group }) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

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

      const fileName = `TitleDefense_AwardList_${group?.group_number || group?.title || 'group'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const members = group?.members || [];

  return (
    <div className="tal-wrapper">

      <div className="tal-toolbar">
        <h3 className="tal-toolbar-title">Title Defense Award List</h3>
        <button className="tal-download-btn" onClick={handleDownloadPDF} disabled={generating}>
          {generating ? 'Generating PDF...' : 'Download PDF'}
        </button>
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
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
                    <td className="tal-input-cell"><input type="text" className="tal-cell-input" /></td>
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

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './AwardListTemplate.css';

const AwardListTemplate = ({ group }) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

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
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const members = group?.members || [];

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
            <p className="alt-uni-name">Iqra University</p>
            <p className="alt-faculty">Faculty of Engineering Sciences and Technology</p>
            <p className="alt-dept-line">
              Department of <span className="alt-fixed-fill">Computer Science</span>
            </p>
            <p className="alt-batch-line">
              Batch <input type="text" className="alt-header-input alt-header-input-short" onChange={(e) => e.target.setAttribute('value', e.target.value)} />
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
                members.map((m, idx) => (
                  <tr key={idx}>
                    <td className="alt-center">{idx + 1}</td>
                    <td className="alt-name-cell">{m.name}</td>
                    <td className="alt-center">{m.odoo_id || ''}</td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                  </tr>
                ))
              ) : (
                [1, 2, 3].map(n => (
                  <tr key={n}>
                    <td className="alt-center">{n}</td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
                    <td className="alt-input-cell"><input type="text" className="alt-cell-input" onChange={(e) => e.target.setAttribute('value', e.target.value)} /></td>
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

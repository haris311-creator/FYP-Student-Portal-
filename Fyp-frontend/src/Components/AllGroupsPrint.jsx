import React, { useState, useRef } from 'react';
import './AllGroupsPrint.css';

const AllGroupsPrint = ({ groups = [] }) => {
  const [batch, setBatch] = useState('');
  const printRef = useRef(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>All FYP Groups</title>
        <link rel="stylesheet" href="/src/Components/AllGroupsPrint.css">
        <style>
          body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; }
          @media print { body { margin: 0; } }
        </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const today = new Date().toLocaleDateString('en-GB');

  return (
    <div className="agp-container">
      <div className="agp-controls no-print">
        <div className="agp-controls-row">
          <label>Batch Year:</label>
          <input
            type="text"
            className="agp-batch-input"
            placeholder="e.g. 2024"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
          <button className="agp-print-btn" onClick={handlePrint}>
            Print Sheet
          </button>
        </div>
      </div>

      <div className="agp-preview-wrap">
        <div ref={printRef} className="agp-page">
          <div className="agp-header-top">
            <div className="agp-header-spacer" />
            <div className="agp-logo-wrap">
              <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Logo" className="agp-logo" />
            </div>
            <div className="agp-form-tag">FYDP-Form5</div>
          </div>

          <div className="agp-header-block">
            <p className="agp-faculty">Faculty of Engineering, Science &amp; Technology</p>
            <p className="agp-dept">DEPT OF COMPUTER SCIENCE</p>
            {batch && <p className="agp-batch">Batch: {batch}</p>}
          </div>

          <h2 className="agp-title">List of Projects (FYDP)</h2>

          <table className="agp-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Group No</th>
                <th style={{ width: '28%' }}>Project Title</th>
                <th style={{ width: '35%' }}>Student Name with Seat No.</th>
                <th style={{ width: '22%' }}>Supervisor / Co-Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan="4" className="agp-center">No groups available</td>
                </tr>
              ) : (
                groups.map((g) => {
                  const members = g._fullData?.members_details || [];
                  const memberLines = members.length > 0
                    ? members.map(m => `${m.full_name || m.email || '-'} (${m.odoo_id || '-'})`)
                    : [g.group || 'Unknown'];
                  const supervisor = g.supervisor || '-';
                  const coSupervisor = g._fullData?.co_supervisor_details?.name || '';

                  return (
                    <tr key={g.id}>
                      <td className="agp-center">{g.groupNumber || '-'}</td>
                      <td>{g.title || '-'}</td>
                      <td>
                        {memberLines.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </td>
                      <td>
                        <div>{supervisor}</div>
                        {coSupervisor && <div>Co: {coSupervisor}</div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="agp-footer">
            <div className="agp-footer-box">
              <div className="agp-footer-label">Date</div>
              <div className="agp-footer-value">{today}</div>
            </div>
            <div className="agp-footer-box">
              <div className="agp-footer-label">FYDP Coordinator Signature</div>
              <div className="agp-footer-line" />
            </div>
            <div className="agp-footer-box">
              <div className="agp-footer-label">Conveners Signature</div>
              <div className="agp-footer-line" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllGroupsPrint;

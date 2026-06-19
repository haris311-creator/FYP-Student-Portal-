import React, { useRef } from 'react';
import './AwardListTemplate.css';

const AwardListTemplate = ({ group }) => {
  const printRef = useRef(null);

  const handleDownloadPDF = () => {
    window.print();
  };

  const members = group?.members || [];

  return (
    <div className="alt-wrapper">

      <div className="alt-toolbar">
        <h3 className="alt-toolbar-title">Award List</h3>
        <button className="alt-download-btn" onClick={handleDownloadPDF}>
          Download / Print PDF
        </button>
      </div>

      <div className="alt-print-area" ref={printRef}>
        <div className="alt-page">

          <div className="alt-doc-header">
            <p className="alt-uni-name">Iqra University</p>
            <p className="alt-faculty">Faculty of Engineering Sciences and Technology</p>
            <p className="alt-dept-line">
              Department of <span className="alt-blank-fill">________________________</span>
            </p>
            <p className="alt-batch-line">
              Batch <span className="alt-blank-fill alt-blank-short">______</span>
              &nbsp;&nbsp;&nbsp;Date of Conduct: <span className="alt-blank-fill">______________________</span>
            </p>
            <h2 className="alt-doc-title">Award List of FYDP-1</h2>
          </div>

          <div className="alt-title-row">
            <span className="alt-title-label">Title of the project:</span>
            <span className="alt-title-fill">{group?.project || group?.title || ''}</span>
          </div>

          <table className="alt-table">
            <thead>
              <tr>
                <th rowSpan="2">S. No.</th>
                <th rowSpan="2">Name of the Student</th>
                <th rowSpan="2">ID No.</th>
                <th colSpan="4">Evaluation</th>
                <th rowSpan="2">Total Marks<br />(100)</th>
              </tr>
              <tr>
                <th>Presentation<br />(40%)</th>
                <th>Project Report<br />(30%)</th>
                <th>Progress Report<br />(20%)</th>
                <th>Meeting Log<br />(10%)</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? (
                members.map((m, idx) => (
                  <tr key={idx}>
                    <td className="alt-center">{idx + 1}</td>
                    <td>{m.name}</td>
                    <td>{m.odoo_id || ''}</td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                  </tr>
                ))
              ) : (
                [1, 2, 3].map(n => (
                  <tr key={n}>
                    <td className="alt-center">{n}</td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                    <td className="alt-input-cell">
                      <input type="text" className="alt-cell-input" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="alt-signature-row">
            <div className="alt-signature-block">
              <span className="alt-blank-fill"></span>
              <p>Supervisor Signature</p>
            </div>
            <div className="alt-signature-block">
              <span className="alt-blank-fill"></span>
              <p>Committee Member Signature</p>
            </div>
            <div className="alt-signature-block">
              <span className="alt-blank-fill"></span>
              <p>Admin / Coordinator Signature</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AwardListTemplate;

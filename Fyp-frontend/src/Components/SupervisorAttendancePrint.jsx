import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { downloadNodeAsPdf } from './printUtils';
import './SupervisorPrintBase.css';
import './SupervisorAttendancePrint.css';

const MEETING_COUNT = 16;

const SupervisorAttendancePrint = ({
  open,
  onClose,
  selectedGroup,
  supervisorName = '',
  attendanceData
}) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const meetingDates = useMemo(() => {
    // Optional per-meeting dates, if ever provided by the caller.
    // Falls back to blank cells (matches the paper FP-5 form).
    return attendanceData?.meeting_dates || [];
  }, [attendanceData]);

  if (!open) return null;

  const handleDownload = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      await downloadNodeAsPdf(printRef.current, `Attendance_${selectedGroup?.group_number || 'group'}.pdf`);
    } catch (err) {
      console.error('Attendance PDF failed:', err);
      toast.error('Failed to generate attendance printable PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const members = attendanceData?.members || [];

  return createPortal(
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="sp-toolbar no-print">
          <div>
            <h3 className="sp-toolbar-title">Attendance Sheet Print</h3>
            <p className="sp-toolbar-subtitle">Printable version of the FP-5 attendance form.</p>
          </div>
          <div className="sp-toolbar-actions">
            <button type="button" className="sp-btn sp-btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="sp-btn sp-btn-primary" onClick={handleDownload} disabled={generating}>
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="sp-preview-wrap">
          <div className="sp-page sp-att-page" ref={printRef}>

            <div className="sp-header-top sp-header-top-attendance">
              <div className="sp-header-logo">
                <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University" className="sp-logo" />
              </div>
              <div className="sp-form-tag">Form FP-5</div>
            </div>

            <div className="sp-att-univ-block">
              <p className="sp-att-univ-name">Iqra University</p>
              <p className="sp-att-faculty">Faculty of Engineering Sciences and Technology</p>
            </div>

            <div className="sp-att-line">
              <span>Department of Computer Science</span>
            </div>
            <div className="sp-att-line sp-att-line-short">
              <span>Batch:</span>
              <span className="sp-att-fill sp-att-fill-short" />
            </div>

            <h1 className="sp-att-title">Attendance of Project Group (FYDP)</h1>

            <div className="sp-att-line sp-att-line-full">
              <span>Name of the supervisor/ Co-Supervisor:</span>
              <span className="sp-att-fill sp-att-fill-grow">{supervisorName || selectedGroup?.supervisor || ''}</span>
            </div>
            <div className="sp-att-line sp-att-line-full">
              <span>Title of the Project:</span>
              <span className="sp-att-fill sp-att-fill-grow">{selectedGroup?.project || selectedGroup?.title || ''}</span>
            </div>

            <table className="sp-data-table sp-att-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '7%' }}>Seat No.</th>
                  <th rowSpan={2} style={{ width: '20%' }}>Name of the Student</th>
                  <th colSpan={MEETING_COUNT + 1}>Meetings</th>
                  <th rowSpan={2} style={{ width: '10%' }}>Meetings Attended</th>
                </tr>
                <tr>
                  {Array.from({ length: MEETING_COUNT }, (_, i) => (
                    <th key={i} className="sp-att-meeting-col">{i + 1}</th>
                  ))}
                  <th className="sp-att-date-col">Date</th>
                </tr>
              </thead>
              <tbody>
                {members.length > 0 ? (
                  members.map((member, idx) => (
                    <tr key={member.student_id || idx}>
                      <td className="sp-center">{idx + 1}</td>
                      <td className="sp-left">{member.full_name}</td>
                      {Array.from({ length: MEETING_COUNT }, (_, mIdx) => {
                        const status = member.attendance?.[mIdx] || 'none';
                        return (
                          <td key={mIdx} className={`sp-center sp-att-${status}`}>
                            {status === 'present' ? 'P' : status === 'absent' ? 'A' : ''}
                          </td>
                        );
                      })}
                      <td className="sp-att-date-cell">{meetingDates[idx] || ''}</td>
                      <td className="sp-center sp-bold">
                        {member.total_present !== undefined ? `${member.total_present}/${member.total_meetings}` : ''}
                      </td>
                    </tr>
                  ))
                ) : (
                  Array.from({ length: 3 }, (_, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="sp-center">&nbsp;</td>
                      <td>&nbsp;</td>
                      {Array.from({ length: MEETING_COUNT }, (_, mIdx) => (
                        <td key={mIdx}>&nbsp;</td>
                      ))}
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="sp-att-sign-row">
              <div className="sp-att-sign-block">
                <p className="sp-att-sign-label">Signature with Date</p>
                <p className="sp-att-sign-role">FYDP Supervisor</p>
              </div>
              <div className="sp-att-sign-block">
                <p className="sp-att-sign-label">Signature with Date</p>
                <p className="sp-att-sign-role">FYDP Coordinator</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SupervisorAttendancePrint;

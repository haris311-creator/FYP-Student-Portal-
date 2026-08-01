import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { downloadNodeAsPdf } from './printUtils';
import './SupervisorPrintBase.css';
import './SupervisorMeetingPrint.css';

const blankMeeting = (meetingNumber) => ({
  meeting_number: meetingNumber,
  date: '',
  agenda: '',
  previous_task_status: '',
  previous_task_comment: '',
  new_task: ''
});

const cleanText = (value) => (value && String(value).trim() ? String(value).trim() : '-');

const MeetingPage = ({ meeting, selectedGroup, supervisorName }) => {
  const projectTitle = cleanText(selectedGroup?.project || selectedGroup?.title);
  const meetingDate = cleanText(meeting.date || '[day - month - year]');
  const members = selectedGroup?.members || [];
  const signatureRows = Math.max(4, members.length || 0);

  return (
    <div className="sp-page sp-meeting-page">
      <div className="sp-header-top sp-header-top-meeting">
        <div className="sp-header-logo-center">
          <img src="/images/Gulshan-logo.jpg.png" alt="Iqra University Gulshan" className="sp-logo sp-logo-meeting" />
        </div>
      </div>

      <div className="sp-form-topline">Final Year Design Project</div>
      <div className="sp-form-projectline">
        <span className="sp-form-project-label">Project Title:</span>
        <span className="sp-form-project-value">{projectTitle}</span>
      </div>

      <table className="sp-meeting-table">
        <tbody>
          <tr className="sp-meeting-heading-row">
            <td className="sp-meeting-heading" colSpan={2}>
              MEETING # {String(meeting.meeting_number).padStart(2, '0')}, Date {meetingDate}
            </td>
          </tr>
          <tr className="sp-meeting-agenda-row">
            <td className="sp-meeting-label">Discussion Agenda</td>
            <td className="sp-meeting-value">{meeting.agenda || '\u00A0'}</td>
          </tr>
          <tr className="sp-meeting-confirm-row">
            <td className="sp-meeting-label">Confirmation about the previous task, (if any)</td>
            <td className="sp-meeting-value">
              {meeting.previous_task_comment || meeting.previous_task_status || '\u00A0'}
            </td>
          </tr>
          <tr className="sp-meeting-tasks-row">
            <td className="sp-meeting-label">Suggestions and Tasks Assigned</td>
            <td className="sp-meeting-value">{meeting.new_task || '\u00A0'}</td>
          </tr>
        </tbody>
      </table>

      <div className="sp-signature-block">
        {Array.from({ length: signatureRows }, (_, idx) => {
          const member = members[idx];
          const isLeadLine = idx === 0;
          const studentLabel = member ? `Student ID & Signature: ${member.odoo_id || '____________'}` : 'Student ID & Signature:';

          return (
            <div key={idx} className="sp-signature-row">
              <div className="sp-signature-left">{studentLabel}</div>
              {isLeadLine ? (
                <div className="sp-signature-right">
                  Supervisor Name &amp; Signature <span className="sp-signature-fill">{supervisorName || '__________________'}</span>
                </div>
              ) : (
                <div className="sp-signature-right">____________________</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SupervisorMeetingPrint = ({
  open,
  onClose,
  selectedGroup,
  supervisorName = '-',
  meetingsList = [],
  activeMeetingNumber = null,
  formData = null,
  mode = 'single'
}) => {
  const printRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const meetingPages = useMemo(() => {
    if (mode === 'all') {
      return Array.from({ length: 16 }, (_, idx) => {
        const meetingNumber = idx + 1;
        const existing = meetingsList.find((m) => m.meeting_number === meetingNumber);
        return existing || blankMeeting(meetingNumber);
      });
    }

    const meetingNumber = activeMeetingNumber || formData?.meeting_number || 1;
    const existing = meetingsList.find((m) => m.meeting_number === meetingNumber);

    if (existing) return [existing];

    return [
      {
        ...blankMeeting(meetingNumber),
        ...formData,
        meeting_number: meetingNumber
      }
    ];
  }, [activeMeetingNumber, formData, meetingsList, mode]);

  if (!open) return null;

  const handleDownload = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const suffix = mode === 'all' ? 'All_Meetings' : `Meeting_${meetingPages[0]?.meeting_number || 'print'}`;
      await downloadNodeAsPdf(printRef.current, `FYP_Meeting_${suffix}.pdf`);
    } catch (err) {
      console.error('Meeting PDF failed:', err);
      alert('Failed to generate meeting printable PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return createPortal(
    <div className="sp-modal-backdrop" onClick={onClose}>
      <div className="sp-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="sp-toolbar no-print">
          <div>
            <h3 className="sp-toolbar-title">{mode === 'all' ? 'All Meetings Print' : 'Meeting Minutes Print'}</h3>
            <p className="sp-toolbar-subtitle">
              {mode === 'all'
                ? 'Printable booklet for all 16 meetings.'
                : 'Printable view of the meeting form from the Word template.'}
            </p>
          </div>
          <div className="sp-toolbar-actions">
            <button type="button" className="sp-btn sp-btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="sp-btn sp-btn-primary" onClick={handleDownload} disabled={generating}>
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="sp-preview-wrap">
          <div ref={printRef}>
            {meetingPages.map((meeting, idx) => (
              <div key={meeting.meeting_number} className={idx < meetingPages.length - 1 ? 'sp-page-break-wrap' : ''}>
                <MeetingPage
                  meeting={meeting}
                  selectedGroup={selectedGroup}
                  supervisorName={supervisorName}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SupervisorMeetingPrint;


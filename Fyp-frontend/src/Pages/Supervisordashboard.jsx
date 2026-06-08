// fyp-frontend/src/Pages/Supervisordashboard.jsx
import React, { useState, useEffect } from 'react';
import { supervisorAPI, meetingAPI, attendanceSheetAPI, proposalAPI } from '../utils/api';
import './Supervisordashboard.css';

function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', role: '', email: '' });
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New states for Meetings & Attendance
  const [detailSubTab, setDetailSubTab] = useState('info');
  const [meetingsList, setMeetingsList] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [activeMeetingForm, setActiveMeetingForm] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    agenda: '',
    previous_task_status: '',
    previous_task_comment: '',
    new_task: '',
    attendance: {}
  });
  const [formLoading, setFormLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Proposal Review States
  const [pendingProposals, setPendingProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ action: 'approve', remarks: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load user info
  useEffect(() => {
    const loadUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          setUserInfo({
            name: fullName || user.email || 'User',
            role: user.user_type || 'supervisor',
            email: user.email || ''
          });
        }
      } catch (e) {
        console.log('User info not found');
      }
    };
    loadUser();
  }, []);

  // Fetch assigned groups
  useEffect(() => {
    const fetchAssignedGroups = async () => {
      try {
        setLoading(true);
        const response = await supervisorAPI.getAssignedGroups();
        
        console.log("Raw API Response:", response.data);
        console.log("Results:", response.data.results);
        
        const transformedGroups = response.data.results.map(group => {
          console.log(`Processing Group ${group.group_number}:`, group);
          
          return {
            id: group.id,
            group_number: group.group_number,
            name: `Group ${group.group_number}`, 
            project: group.project_title || 'Untitled Project',
            members: group.members?.map(m => {
              console.log(`  Member:`, m);
              return {
                name: m.student_first_name && m.student_last_name 
                  ? `${m.student_first_name} ${m.student_last_name}`.trim()
                  : m.student_name || m.full_name || m.student?.full_name || 'Unknown',
                odoo_id: m.student_id || m.odoo_id || m.student?.student_id || 'N/A',
                student_db_id: m.student || m.id || null,
                email: m.student_email || m.student?.email || ''
              };
            }) || [],
            phase: group.fydp_phase === 'fydp1' ? 'FYP-1' : 'FYP-2',
            status: group.status,
            progress: calculateProgress(group.status),
            domain: group.domain_display || group.domain || 'N/A',
          };
        });
        
        console.log("Transformed Groups:", transformedGroups);
        setAssignedGroups(transformedGroups);
        setError(null);
      } catch (err) {
        console.error('Error fetching groups:', err);
        console.error('Response:', err.response?.data);
        setError('Failed to load assigned groups');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignedGroups();
  }, []);

  // Fetch pending proposals for supervisor
  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoadingProposals(true);
        const res = await proposalAPI.getPendingSupervisor();
        setPendingProposals(res.data.results || []);
      } catch (err) {
        console.error("Error fetching proposals:", err);
      } finally {
        setLoadingProposals(false);
      }
    };
    fetchProposals();
  }, []);

  // Fetch meetings & attendance data when group is selected
  useEffect(() => {
    if (!selectedGroup) {
      console.log("No group selected, skipping meetings fetch");
      return;
    }

    const fetchMeetingsData = async () => {
      try {
        console.log(`Fetching meetings for group ${selectedGroup.id}...`);
        setLoadingMeetings(true);
        
        const [meetingsRes, sheetRes] = await Promise.all([
          meetingAPI.getByGroup(selectedGroup.id),
          attendanceSheetAPI.getSheet(selectedGroup.id)
        ]);
        
        console.log("Meetings API Response:", meetingsRes.data);
        console.log("Meetings Results:", meetingsRes.data.results || meetingsRes.data);
        console.log("Attendance Sheet:", sheetRes.data);
        
        const meetingsData = meetingsRes.data.results || meetingsRes.data || [];
        setMeetingsList(Array.isArray(meetingsData) ? meetingsData : []);
        setAttendanceData(sheetRes.data);
      } catch (err) {
        console.error("Error fetching meetings:", err);
        console.error("Response:", err.response?.data);
      } finally {
        setLoadingMeetings(false);
      }
    };
    
    fetchMeetingsData();
  }, [selectedGroup]);

  const calculateProgress = (status) => {
    const progressMap = {
      'pending_approval': 10, 'idea_pitch': 25, 'proposal_pending': 40,
      'proposal_approved': 60, 'in_progress': 80, 'completed': 100, 'rejected': 0
    };
    return progressMap[status] || 0;
  };

  const handleMeetingCardClick = (meetingNum) => {
    const existingMeeting = meetingsList.find(m => m.meeting_number === meetingNum);
    
    console.log("Meeting Clicked:", meetingNum);
    console.log("Existing Meeting:", existingMeeting);
    
    let attendanceMap = {};
    selectedGroup.members.forEach((member, idx) => {
      const key = member.student_db_id;
      if (key) {
        attendanceMap[key] = 'present';
      }
    });

    if (existingMeeting) {
      console.log("Editing existing meeting");
      console.log("Attendance Records:", existingMeeting.attendance_records);
      
      (existingMeeting.attendance_records || []).forEach(rec => {
        const studentKey = rec.student;
        console.log(`Mapping: Student ${studentKey} -> ${rec.status}`);
        
        if (studentKey) {
          attendanceMap[studentKey] = rec.status;
        }
      });

      setFormData({
        date: existingMeeting.date,
        agenda: existingMeeting.agenda,
        previous_task_status: existingMeeting.previous_task_status || '',
        previous_task_comment: existingMeeting.previous_task_comment || '',
        new_task: existingMeeting.new_task,
        attendance: attendanceMap
      });
      
      console.log("Form populated with attendance:", attendanceMap);
    } else {
      console.log("Creating new meeting");
      setFormData({
        date: new Date().toISOString().split('T')[0],
        agenda: '',
        previous_task_status: '',
        previous_task_comment: '',
        new_task: '',
        attendance: attendanceMap
      });
    }
    setActiveMeetingForm(meetingNum);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttendanceChange = (studentId, status) => {
    console.log(`Attendance: Student ${studentId} -> ${status}`);
    setFormData(prev => ({
      ...prev,
      attendance: { ...prev.attendance, [studentId]: status }
    }));
  };

  const handleSubmitMeeting = async () => {
    if (!formData.date || !formData.agenda || !formData.new_task) {
      alert('Please fill all required fields (Date, Agenda, New Task)');
      return;
    }

    try {
      setFormLoading(true);
      console.log("Starting save process...");
      
      const formattedAttendance = {};
      selectedGroup.members.forEach(member => {
        if (member.student_db_id) {
          const status = formData.attendance[member.student_db_id] || 'present';
          formattedAttendance[member.student_db_id] = status;
        }
      });

      const payload = {
        group: selectedGroup.id,
        meeting_number: activeMeetingForm,
        date: formData.date,
        agenda: formData.agenda,
        previous_task_status: formData.previous_task_status || null,
        previous_task_comment: formData.previous_task_comment || '',
        new_task: formData.new_task,
        attendance: formattedAttendance
      };

      console.log("Sending payload:", payload);

      const existingMeeting = meetingsList.find(m => m.meeting_number === activeMeetingForm);
      
      if (existingMeeting) {
        console.log("Updating meeting", existingMeeting.id);
        await meetingAPI.update(existingMeeting.id, payload);
        alert('Meeting updated successfully!');
      } else {
        console.log("Creating new meeting");
        await meetingAPI.create(selectedGroup, payload);
        alert('Meeting saved successfully!');
      }

      console.log("Refreshing data from server...");
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const meetingsResponse = await meetingAPI.getByGroup(selectedGroup.id);
      const sheetResponse = await attendanceSheetAPI.getSheet(selectedGroup.id);
      
      console.log("Meetings Response:", meetingsResponse.data);
      console.log("Sheet Response:", sheetResponse.data);
      
      const meetingsData = meetingsResponse.data.results || meetingsResponse.data || [];
      const attendanceData = sheetResponse.data;
      
      console.log("Processed Meetings:", meetingsData);
      console.log("Processed Attendance:", attendanceData);
      
      setMeetingsList(Array.isArray(meetingsData) ? meetingsData : []);
      setAttendanceData(attendanceData);
      
      setActiveMeetingForm(null);
      
      setFormData({
        date: '',
        agenda: '',
        previous_task_status: '',
        previous_task_comment: '',
        new_task: '',
        attendance: {}
      });
      
      console.log("Save complete, UI updated");
      
    } catch (err) {
      console.error("Error saving meeting:", err);
      console.error("Response data:", err.response?.data);
      alert("Failed to save meeting. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const closeForm = () => {
    setActiveMeetingForm(null);
  };

  // Handle Proposal Review Submission
  const handleReviewSubmit = async () => {
    if (!selectedProposal) return;
    
    if (reviewForm.action === 'revision' && !reviewForm.remarks.trim()) {
      alert('Remarks are required when requesting a revision.');
      return;
    }
    
    setSubmittingReview(true);
    try {
      await proposalAPI.supervisorReview(selectedProposal.id, reviewForm);
      alert(`Proposal ${reviewForm.action === 'approve' ? 'approved and sent to Admin' : 'sent back to students for revision'}!`);
      setSelectedProposal(null);
      setReviewForm({ action: 'approve', remarks: '' });
      
      // Refresh list
      const res = await proposalAPI.getPendingSupervisor();
      setPendingProposals(res.data.results || []);
    } catch (err) {
      console.error("Review failed:", err);
      alert(err.response?.data?.error || err.response?.data?.remarks?.[0] || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

    // Helper function to force download
  // Robust File Download Function using Fetch API
  const handleFileDownload = async (fileUrl) => {
    try {
      // Check if fileUrl is already a full URL or just a path
      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        fullUrl = `http://localhost:8000${fileUrl}`;
      }
      
      // Fetch the file as a blob
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from URL for the download attribute
      const filename = fileUrl.split('/').pop() || 'proposal_document';
      link.setAttribute('download', filename);
      
      // Append to body, click, and cleanup
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please check if the file exists.');
    }
  };

  if (loading) return <div className="dashboard-container"><div className="loading-spinner">Loading...</div></div>;
  if (error) return <div className="dashboard-container"><div className="error-message">{error}</div></div>;

  // Render Pending Proposals List
  const renderReviews = () => {
    if (loadingProposals) return <div className="overview-content"><div className="loading-spinner">Loading proposals...</div></div>;

    return (
      <div className="overview-content">
        <h1 className="page-title">Pending Proposal Reviews</h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Review and approve proposals submitted by your assigned groups.
        </p>

        {pendingProposals.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>&#10004;</p>
            <p style={{ color: '#64748b' }}>No proposals pending your review.</p>
          </div>
        ) : (
          <div className="groups-list-horizontal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {pendingProposals.map(proposal => (
              <div key={proposal.id} className="group-card-horizontal" style={{ cursor: 'pointer' }} onClick={() => setSelectedProposal(proposal)}>
                <div className="group-info">
                  <div className="group-header">
                    <h3 className="group-name">{proposal.project_title}</h3>
                    <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                      Attempt {proposal.submission_count}/3
                    </span>
                  </div>
                  <p className="group-project" style={{ color: '#64748b', fontSize: '0.875rem' }}>Group ID: {proposal.group_id}</p>
                  <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#eff6ff', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: '600', margin: 0 }}>
                      Status: {proposal.status_display}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <button className="view-details-btn">Review &rarr;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Proposal Review Modal
  const renderProposalReviewModal = () => {
    return (
      <div className="meeting-form-overlay" style={{ zIndex: 1000 }}>
        <div className="meeting-form-container" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="form-header">
            <h3>Review Proposal</h3>
            <button className="close-form-btn" onClick={() => setSelectedProposal(null)}>&#10005;</button>
          </div>

          <div style={{ padding: '1rem 0' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>{selectedProposal.project_title}</h4>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                Submitted on: {selectedProposal.submitted_at ? new Date(selectedProposal.submitted_at).toLocaleString() : 'N/A'}
              </p>
              
              {selectedProposal.proposal_file ? (
                <button 
                  onClick={() => handleFileDownload(selectedProposal.proposal_file)}
                  className="submit-btn"
                  style={{ display: 'inline-block', textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
                >
                  Download Uploaded Proposal
                </button>
              ) : (
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', color: '#92400e' }}>
                  Warning: No file uploaded by students.
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Your Decision</h4>
              
              <div className="mform-group" style={{ marginBottom: '1rem' }}>
                <label className="mform-label">Action</label>
                <div className="radio-group" style={{ display: 'flex', gap: '1rem' }}>
                  <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="radio" 
                      name="reviewAction" 
                      value="approve"
                      checked={reviewForm.action === 'approve'}
                      onChange={e => setReviewForm({ ...reviewForm, action: e.target.value })}
                    /> Approve (Send to Admin)
                  </label>
                  <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="radio" 
                      name="reviewAction" 
                      value="revision"
                      checked={reviewForm.action === 'revision'}
                      onChange={e => setReviewForm({ ...reviewForm, action: e.target.value })}
                    /> Request Revision
                  </label>
                </div>
              </div>

              <div className="mform-group">
                <label className="mform-label">
                  Remarks {reviewForm.action === 'revision' && <span className="required">*</span>}
                </label>
                <textarea
                  className="mform-textarea"
                  placeholder={reviewForm.action === 'approve' ? "Optional: Any positive feedback..." : "Required: What needs to be changed?"}
                  value={reviewForm.remarks}
                  onChange={e => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div className="mform-actions">
            <button 
              className="submit-btn" 
              onClick={handleReviewSubmit}
              disabled={submittingReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
            <button className="back-btn" onClick={() => setSelectedProposal(null)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="overview-content">
      <h1 className="page-title">Overview</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{assignedGroups.length}</div>
          <div className="stat-label">Assigned Groups</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">9</div>
          <div className="stat-label">Pending Log Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">2</div>
          <div className="stat-label">Reports to Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">1</div>
          <div className="stat-label">Marks Pending</div>
        </div>
      </div>
      <div className="groups-section">
        <h2 className="section-title">My Groups</h2>
        {assignedGroups.length === 0 ? (
          <div className="empty-state"><p>No groups assigned yet.</p></div>
        ) : (
          <div className="groups-list-horizontal">
            {assignedGroups.map(group => (
              <div key={group.id} className="group-card-horizontal">
                <div className="group-info">
                  <div className="group-header">
                    <h3 className="group-name">{group.name}</h3>
                    <span className={`phase-badge ${group.phase === 'FYP-1' ? 'fyp1' : 'fyp2'}`}>
                      {group.phase}
                    </span>
                  </div>
                  <p className="group-project">{group.project}</p>
                  <div className="group-members">
                    <span className="member-icon">👤</span>
                    <span className="member-names">
                      {group.members && group.members.length > 0 
                        ? group.members.map(m => m.name).join(', ')
                        : 'No members yet'
                      }
                    </span>
                  </div>
                </div>
                <div className="group-actions">
                  <div className="progress-section">
                    <div className="progress-label">
                      <span>Progress</span>
                      <span className="progress-percentage">{group.progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${group.progress}%` }}></div>
                    </div>
                  </div>
                  <button 
                    className="view-details-btn"
                    onClick={() => { setSelectedGroup(group); setActiveTab('groupDetail'); }}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderMeetingsSection = () => {
    if (loadingMeetings) return <div className="loading-spinner">Loading meetings data...</div>;

    return (
      <div className="meetings-container">
        <div className="attendance-sheet-card">
          <div className="card-header">
            <h3> Attendance Sheet (FP-5)</h3>
            <button 
              className="btn-outline" 
              onClick={async () => {
                try {
                  const res = await attendanceSheetAPI.exportExcel(selectedGroup.id);
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `Attendance_${selectedGroup.group_number}.xlsx`);
                  document.body.appendChild(link);
                  link.click();
                } catch (err) {
                  alert("Excel export failed. Make sure openpyxl is installed on backend.");
                }
              }}
            >
              ⬇️ Export Excel
            </button>
          </div>
          {attendanceData ? (
            <div className="table-responsive">
              <table className="fp5-table">
                <thead>
                  <tr>
                    <th>Seat No.</th>
                    <th>Student Name</th>
                    <th>Odoo ID</th>
                    {Array.from({ length: 16 }, (_, i) => <th key={i}>{i + 1}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.members.map((member, idx) => (
                    <tr key={member.student_id}>
                      <td>{idx + 1}</td>
                      <td>{member.full_name}</td>
                      <td>{member.odoo_id}</td>
                      {member.attendance.map((status, mIdx) => (
                        <td key={mIdx} className={`att-${status === 'present' ? 'p' : status === 'absent' ? 'a' : 'none'}`}>
                          {status === 'present' ? 'P' : status === 'absent' ? 'A' : '—'}
                        </td>
                      ))}
                      <td className="total-cell">{member.total_present}/{member.total_meetings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No attendance records found.</p>
          )}
        </div>

        <div className="meetings-grid-section">
          <h3> Meeting Minutes</h3>
          <div className="meetings-grid">
            {Array.from({ length: 16 }, (_, i) => {
              const meetingNum = i + 1;
              const meeting = meetingsList.find(m => m.meeting_number === meetingNum);
              const isConducted = !!meeting;
              const isActive = activeMeetingForm === meetingNum;
              
              return (
                <div key={meetingNum}>
                  <div 
                    className={`meeting-card ${isConducted ? 'meeting-done' : 'meeting-pending'} ${isActive ? 'meeting-active' : ''}`}
                    onClick={() => !isActive && handleMeetingCardClick(meetingNum)}
                  >
                    <div className="meeting-card-header">
                      <span className="meeting-num">Meeting #{meetingNum}</span>
                      <span className={`badge ${isConducted ? 'badge-green' : 'badge-blue'}`}>
                        {isConducted ? ' Done' : ' Pending'}
                      </span>
                    </div>
                    {isConducted && !isActive && (
                      <div className="meeting-card-body">
                        <p className="meeting-date"> {meeting.date}</p>
                        <p className="meeting-task"><strong>Task:</strong> {meeting.new_task?.slice(0, 40)}...</p>
                      </div>
                    )}
                  </div>
                  
                  {isActive && (
                    <div className="meeting-form-overlay">
                      <div className="meeting-form-container">
                        <div className="form-header">
                          <h3>Meeting #{meetingNum} — Minutes Form</h3>
                          <button className="close-form-btn" onClick={closeForm}>✕</button>
                        </div>
                        
                        <div className="form-info-row">
                          <div className="form-info-item">
                            <span className="form-info-label">Project Title</span>
                            <span className="form-info-value">{selectedGroup.project}</span>
                          </div>
                          <div className="form-info-item">
                            <span className="form-info-label">Supervisor</span>
                            <span className="form-info-value">{userInfo.name}</span>
                          </div>
                        </div>

                        <div className="mform-group">
                          <label className="mform-label">Date of Meeting <span className="required">*</span></label>
                          <input
                            type="date"
                            className="mform-input"
                            value={formData.date}
                            onChange={e => handleFormChange('date', e.target.value)}
                          />
                        </div>

                        <div className="mform-group">
                          <label className="mform-label">Discussion Agenda <span className="required">*</span></label>
                          <textarea
                            className="mform-textarea"
                            placeholder="What was discussed in this meeting..."
                            value={formData.agenda}
                            onChange={e => handleFormChange('agenda', e.target.value)}
                            rows="3"
                          />
                        </div>

                        {meetingNum > 1 && (
                          <div className="prev-task-box">
                            <p className="prev-task-label">Previous Task Assigned:</p>
                            <div className="prev-task-status-row">
                              <label className="mform-label">Status:</label>
                              <div className="radio-group">
                                <label className="radio-label">
                                  <input 
                                    type="radio" 
                                    name={`prevStatus-${meetingNum}`} 
                                    value="complete"
                                    checked={formData.previous_task_status === 'complete'}
                                    onChange={e => handleFormChange('previous_task_status', e.target.value)}
                                  />  Completed
                                </label>
                                <label className="radio-label">
                                  <input 
                                    type="radio" 
                                    name={`prevStatus-${meetingNum}`} 
                                    value="incomplete"
                                    checked={formData.previous_task_status === 'incomplete'}
                                    onChange={e => handleFormChange('previous_task_status', e.target.value)}
                                  />  Incomplete
                                </label>
                                <label className="radio-label">
                                  <input 
                                    type="radio" 
                                    name={`prevStatus-${meetingNum}`} 
                                    value="partial"
                                    checked={formData.previous_task_status === 'partial'}
                                    onChange={e => handleFormChange('previous_task_status', e.target.value)}
                                  />  Partial
                                </label>
                              </div>
                            </div>
                            <input
                              type="text"
                              className="mform-input"
                              placeholder="Supervisor comment on previous task..."
                              value={formData.previous_task_comment}
                              onChange={e => handleFormChange('previous_task_comment', e.target.value)}
                            />
                          </div>
                        )}

                        <div className="mform-group">
                          <label className="mform-label">New Task / Suggestions Assigned <span className="required">*</span></label>
                          <textarea
                            className="mform-textarea"
                            placeholder="Tasks assigned for next week..."
                            value={formData.new_task}
                            onChange={e => handleFormChange('new_task', e.target.value)}
                            rows="3"
                          />
                        </div>

                        <div className="mform-group">
                          <label className="mform-label">Attendance</label>
                          {selectedGroup.members && selectedGroup.members.length > 0 ? (
                            <div className="attendance-check-grid">
                              {selectedGroup.members.map((member, idx) => {
                                const studentKey = member.student_db_id;
                                const currentStatus = studentKey ? (formData.attendance[studentKey] || 'present') : 'present';
                                
                                console.log(`Rendering ${member.name}: Key=${studentKey}, Status=${currentStatus}`);
                                
                                if (!studentKey) {
                                  return (
                                    <div key={idx} className="attendance-check-row" style={{opacity: 0.6}}>
                                      <div className="att-member-info">
                                        <span className="att-member-name">{member.name}</span>
                                        <span className="att-member-id">{member.odoo_id}</span>
                                        <span style={{color: '#f59e0b', fontSize: '0.75rem'}}> No DB ID</span>
                                      </div>
                                      <div className="att-toggle">
                                        <button
                                          type="button"
                                          className="att-btn att-btn-present"
                                          onClick={() => {
                                            const tempKey = `temp_${idx}`;
                                            handleAttendanceChange(tempKey, 'present');
                                          }}
                                        >
                                          Present
                                        </button>
                                        <button
                                          type="button"
                                          className="att-btn"
                                          onClick={() => {
                                            const tempKey = `temp_${idx}`;
                                            handleAttendanceChange(tempKey, 'absent');
                                          }}
                                        >
                                          Absent
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={studentKey} className="attendance-check-row">
                                    <div className="att-member-info">
                                      <span className="att-member-name">{member.name}</span>
                                      <span className="att-member-id">{member.odoo_id}</span>
                                    </div>
                                    <div className="att-toggle">
                                      <button
                                        type="button"
                                        className={`att-btn ${currentStatus === 'present' ? 'att-btn-present' : ''}`}
                                        onClick={() => {
                                          console.log(`${member.name} -> Present`);
                                          handleAttendanceChange(studentKey, 'present');
                                        }}
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        className={`att-btn ${currentStatus === 'absent' ? 'att-btn-absent' : ''}`}
                                        onClick={() => {
                                          console.log(`${member.name} -> Absent`);
                                          handleAttendanceChange(studentKey, 'absent');
                                        }}
                                      >
                                        Absent
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{padding: '1rem', background: '#fef3c7', borderRadius: '6px', color: '#92400e'}}>
                               No members found in this group. Please check group data.
                            </div>
                          )}
                        </div>

                        <div className="mform-actions">
                          <button 
                            className="submit-btn" 
                            onClick={handleSubmitMeeting}
                            disabled={formLoading}
                          >
                            {formLoading ? 'Saving...' : ' Save Meeting Minutes'}
                          </button>
                          <button className="back-btn" onClick={closeForm}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
        ☰ Menu
      </button>

      <div className="dashboard-body">
        <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Supervisor Portal</h2>
            <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
          </div>
          <div className="profile-card">
            <div className="profile-avatar">
              {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{userInfo.name}</h3>
              <p className="profile-role">Supervisor</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('overview'); setMenuOpen(false); }}
            >
              <span className="nav-text">Overview</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'reviews' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('reviews'); setMenuOpen(false); }}
            >
              <span className="nav-text">Pending Reviews</span>
            </button>
          </nav>
        </aside>

        <main className="main-content">
          {activeTab === 'overview' && renderOverview()}
          
          {activeTab === 'groupDetail' && selectedGroup && (
            <div className="group-detail-view">
              <div className="detail-header">
                <button className="back-btn" onClick={() => { setActiveTab('overview'); setSelectedGroup(null); }}>
                  ← Back to Overview
                </button>
                <h1 className="detail-title">{selectedGroup.name}</h1>
                <p className="detail-subtitle">{selectedGroup.project}</p>
                
                <div className="detail-tabs">
                  <button 
                    className={`tab-btn ${detailSubTab === 'info' ? 'active' : ''}`}
                    onClick={() => setDetailSubTab('info')}
                  >
                     Group Info
                  </button>
                  <button 
                    className={`tab-btn ${detailSubTab === 'meetings' ? 'active' : ''}`}
                    onClick={() => setDetailSubTab('meetings')}
                  >
                     Manage Meetings
                  </button>
                </div>
              </div>

              {detailSubTab === 'info' ? (
                <div className="detail-grid">
                  <div className="detail-column">
                    <div className="detail-card">
                      <h3 className="detail-card-title">Group Information</h3>
                      <div className="detail-row">
                        <span className="detail-label">Group ID</span>
                        <span className="detail-value">{selectedGroup.group_number}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phase</span>
                        <span className={`phase-badge ${selectedGroup.phase === 'FYP-1' ? 'fyp1' : 'fyp2'}`}>
                          {selectedGroup.phase}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Status</span>
                        <span className={`status-badge status-${selectedGroup.status}`}>
                          {selectedGroup.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Domain</span>
                        <span className="detail-value">{selectedGroup.domain || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-card">
                      <h3 className="detail-card-title">Progress</h3>
                      <div className="progress-detail">
                        <div className="progress-circle">
                          <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="8"
                              strokeDasharray={`${selectedGroup.progress * 2.83} 283`}
                              strokeLinecap="round" transform="rotate(-90 50 50)" />
                          </svg>
                          <div className="progress-text">{selectedGroup.progress}%</div>
                        </div>
                        <div className="progress-bar-large">
                          <div className="progress-label-row">
                            <span>Completion</span>
                            <span>{selectedGroup.progress}%</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill-large" style={{ width: `${selectedGroup.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="detail-column">
                    <div className="detail-card full-height">
                      <h3 className="detail-card-title">Team Members</h3>
                      <div className="members-list-detail">
                        {selectedGroup.members && selectedGroup.members.length > 0 ? (
                          selectedGroup.members.map((member, idx) => (
                            <div key={idx} className="member-row">
                              <div className="member-avatar-sm">{member.name.charAt(0).toUpperCase()}</div>
                              <div className="member-info">
                                <span className="member-name">{member.name}</span>
                                <span className="member-role">ID: {member.odoo_id}</span>
                              </div>
                            </div>
                          ))
                        ) : <p>No members found.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                renderMeetingsSection()
              )}
            </div>
          )}
          
          {activeTab === 'reviews' && renderReviews()}
          {selectedProposal && renderProposalReviewModal()}
        </main>
      </div>
    </div>
  );
}

export default SupervisorDashboard;
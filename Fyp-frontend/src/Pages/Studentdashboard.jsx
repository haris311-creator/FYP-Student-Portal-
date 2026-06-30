// fyp-frontend/src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api, { studentMeetingAPI, proposalAPI, reportAPI } from '../utils/api';
import './Studentdashboard.css';

function StudentDashboard() {
  const [existingGroup, setExistingGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('progress'); // Default to 'progress' tab
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasSubmittedIdea, setHasSubmittedIdea] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
    
  const [formData, setFormData] = useState({
    project_title: '',
    domain: '',
    supervisor: '',
    semester: 'Fall 2024',
    fydp_phase: 'fydp1',
    members: [
      {
        full_name: '',
        odoo_id: '',
        role: 'lead',
        cgpa: '',
        earned_credit_hours: '',
        prerequisites_completed: true,
        has_special_permission: false
      }
    ]
  });

  const [userInfo, setUserInfo] = useState({ name: '', role: '', email: '' });
  const [myMeetingsData, setMyMeetingsData] = useState(null);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [proposalData, setProposalData] = useState(null);
  const [proposalFile, setProposalFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);


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
            role: user.user_type || 'student',
            email: user.email || ''
          });
        }
      } catch (e) {
        console.log('User info not found');
      }
    };
    loadUser();
  }, []);

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const activeResponse = await api.get('/projects/groups/my_group/');
        
        if (activeResponse.data) {
          setExistingGroup(activeResponse.data);
          setHasSubmittedIdea(true);
        } else {
          try {
            const historyResponse = await api.get('/projects/groups/my-group-with-history/');
            
            if (historyResponse.data && historyResponse.data.status === 'rejected') {
              setExistingGroup(historyResponse.data);
              setHasSubmittedIdea(true);
            } else {
              setExistingGroup(null);
              setHasSubmittedIdea(false);
            }
          } catch (historyErr) {
            setExistingGroup(null);
            setHasSubmittedIdea(false);
          }
        }
      } catch (err) {
        try {
          const historyResponse = await api.get('/projects/groups/my-group-with-history/');
          
          if (historyResponse.data && historyResponse.data.status === 'rejected') {
            setExistingGroup(historyResponse.data);
            setHasSubmittedIdea(true);
          } else {
            setExistingGroup(null);
            setHasSubmittedIdea(false);
          }
        } catch (historyErr) {
          setExistingGroup(null);
          setHasSubmittedIdea(false);
        }
      }
    };
    fetchGroupData();
  }, []);


  

  // Fetch Meetings & Attendance
  useEffect(() => {
    if (hasSubmittedIdea && existingGroup) {
      const fetchMyMeetings = async () => {
        setLoadingMeetings(true);
        try {
          const res = await studentMeetingAPI.getMyMeetings();
          setMyMeetingsData(res.data);
        } catch (err) {
          console.error("Error fetching meetings:", err);
        } finally {
          setLoadingMeetings(false);
        }
      };
      fetchMyMeetings();
    }
  }, [hasSubmittedIdea, existingGroup]);

    // Fetch Proposal Data
  useEffect(() => {
    const fetchProposal = async () => {
      // Sirf tab fetch karein jab group approved ho
      if (existingGroup && ['idea_pitch', 'proposal_pending', 'proposal_approved', 'in_progress', 'completed'].includes(existingGroup.status)) {
        try {
          setProposalLoading(true);
          const res = await api.get('/projects/proposals/');
          // Student ki sirf ek proposal hogi
          if (res.data && res.data.length > 0) {
            setProposalData(res.data[0]); 
          } else {
            setProposalData(null);
          }
        } catch (err) {
          console.error("Error fetching proposal:", err);
        } finally {
          setProposalLoading(false);
        }
      }
    };
    fetchProposal();
  }, [existingGroup]);


  useEffect(() => {
  const fetchReport = async () => {
    if (existingGroup && ['proposal_approved', 'in_progress', 'completed'].includes(existingGroup.status)) {
      try {
        setReportLoading(true);
        const res = await reportAPI.getMyReport();
        if (res.data && res.data.length > 0) {
          setReportData(res.data[0]);
        } else {
          setReportData(null);
        }
      } catch (err) {
        console.error("Error fetching report:", err);
      } finally {
        setReportLoading(false);
      }
    }
  };
  fetchReport();
}, [existingGroup]);

  // Fetch Faculty
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get('http://localhost:8000/api/projects/faculty/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFacultyList(response.data);
      } catch (err) {
        console.error("Error fetching faculty:", err);
      }
    };
    fetchFaculty();
  }, []);

  // Handle Member Changes
  const handleMemberChange = (index, field, value) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  const addMember = () => {
    if (formData.members.length < 3) {
      setFormData({
        ...formData,
        members: [
          ...formData.members,
          { full_name: '', odoo_id: '', role: 'member', cgpa: '', earned_credit_hours: '', prerequisites_completed: true, has_special_permission: false }
        ]
      });
    }
  };

  const removeMember = (index) => {
    if (index !== 0) {
      const newMembers = formData.members.filter((_, i) => i !== index);
      setFormData({ ...formData, members: newMembers });
    }
  };

  // Handle Form Submission
  const handleIdeaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const isValid = formData.members.every(m => m.full_name && m.odoo_id && m.cgpa && m.earned_credit_hours);
    if (!isValid) {
      setError("Please fill Full Name, Odoo ID, CGPA, and Credit Hours for all members.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        project_title: formData.project_title,
        domain: formData.domain,
        supervisor: formData.supervisor,
        semester: formData.semester,
        fydp_phase: formData.fydp_phase,
        members: formData.members.map(m => ({
          ...m,
          cgpa: parseFloat(m.cgpa),
          earned_credit_hours: parseInt(m.earned_credit_hours)
        }))
      };

      const res = await api.post('/projects/groups/', payload);
      setSuccess("Group Registered Successfully!");
      setHasSubmittedIdea(true);
      const response = await api.get('/projects/groups/my_group/');
      if (response.data) setExistingGroup(response.data);
    } catch (err) {
      console.error("Submission failed:", err.response?.data || err.message);
      setError(err.response?.data?.detail || "Registration failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

    // Create Proposal Draft (Uses group details to auto-fill)
  const handleCreateProposal = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const payload = {
        group: existingGroup.id,
        title: existingGroup.project_title,
        domain: existingGroup.domain,
        nature_of_project: ["New Project"],
        problem_statement: "See attached proposal file.",
        proposed_solution: "See attached proposal file.",
        scope_included: "See attached proposal file.",
        methodology: "See attached proposal file.",
        resources_involved: "See attached proposal file.",
        final_deliverables: "See attached proposal file.",
        learning_outcomes: "See attached proposal file.",
      };
      const res = await api.post('/projects/proposals/', payload);
      setProposalData(res.data);
      setSuccess("Proposal draft created. Now upload the filled PDF file.");
    } catch (err) {
      console.error("Create failed:", err.response?.data || err.message);
      setError(err.response?.data?.detail || "Failed to create proposal draft.");
    } finally {
      setLoading(false);
    }
  };

  //  Handle File Upload
  const handleFileUpload = async () => {
    if (!proposalFile) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('proposal_file', proposalFile);
    
    try {
      const res = await proposalAPI.uploadProposal(proposalData.id, formData);
      setSuccess("Proposal uploaded successfully!");
      setProposalData(res.data.data); // Update state with new data from backend
      setProposalFile(null); // Clear file input
    } catch (err) {
      console.error("Upload failed:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Upload failed. Check file size (Max 10MB) and format (PDF/DOCX).");
    } finally {
      setUploading(false);
    }
  };



  // handleFileUpload function 
  const handleReportUpload = async () => {
    if (!reportFile) return;
    
    setUploadingReport(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('report_file', reportFile);
    
    try {
      const res = await reportAPI.uploadReport(reportData.id, formData);
      setSuccess("Report uploaded successfully!");
      setReportData(res.data.data);
      setReportFile(null);
    } catch (err) {
      console.error("Upload failed:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Upload failed. Check file size (Max 20MB) and format (PDF/DOCX).");
    } finally {
      setUploadingReport(false);
    }
  };

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

  // Render Meeting Logs
  const renderMeetingLogs = () => {
    // Check if group is approved first
    if (!existingGroup || !['idea_pitch', 'proposal_pending', 'proposal_approved', 'in_progress', 'completed'].includes(existingGroup.status)) {
      return (
        <div className="content-area">
          <h2>Meeting Logs & Attendance</h2>
          <div className="status-card pending">
            <h3>Group Approval Required</h3>
            <p>Your group must be approved by the admin before meeting logs and attendance will be available.</p>
          </div>
        </div>
      );
    }

    if (loadingMeetings) return <div className="loading-spinner">Loading logs...</div>;
    
    if (!myMeetingsData) {
      return (
        <div className="content-area">
          <h2>Meeting Logs & Attendance</h2>
          <div className="status-card">
            <h3>No Meeting Logs Found</h3>
            <p>Meeting logs will be displayed here once your supervisor conducts meetings.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="content-area">
        <h2>Meeting Logs & Tasks</h2>

        {/* Current Task Card */}
        <div className="task-card">
          <h3>Current Tasks</h3>
          <p>{myMeetingsData.current_task || "No task assigned yet."}</p>
        </div>

        {/* Attendance Table */}
        <div className="table-container">
          <div className="attendance-title-card">
            <h3>Attendance & Tasks</h3>
          </div>
          {myMeetingsData.attendance.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Meeting #</th>
                  <th>Date</th>
                  <th>Attendance</th>
                  <th>Task / Agenda</th>
                </tr>
              </thead>
              <tbody>
                {myMeetingsData.attendance.map((log, idx) => (
                  <tr key={idx}>
                    <td>{log.meeting_number}</td>
                    <td>{log.date}</td>
                    <td>
                      <span className={`badge ${log.status.toLowerCase() === 'present' ? 'badge-approved' : 'badge-pending'}`}>
                        {log.status.toLowerCase() === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td>{log.task_assigned || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No meeting logs found yet.</p>
          )}
        </div>
      </div>
    );
  };

  // Domain mapping helper
  const getFullDomainName = (domainValue) => {
    const domainMap = {
      'AI': 'AI & Machine Learning',
      'Web': 'Web Development',
      'App': 'Mobile Apps',
      'IoT': 'IoT / Embedded',
      'Other': 'Other'
    };
    return domainMap[domainValue] || domainValue;
  };

  // Render Group Formation
  const renderGroupFormation = () => {
    if (hasSubmittedIdea && existingGroup) {
      const status = existingGroup.status;
      
      // Rejected Status
      if (status === 'rejected') {
        return (
          <div className="content-area">
            <h2>Group & Idea Pitch</h2>
            <div className="status-card rejected">
              <h3> Group Registration Rejected</h3>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600', textTransform: 'uppercase' }}>
                  Admin's Feedback:
                </p>
                <p style={{ color: '#1e293b', margin: 0, fontStyle: 'italic', background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid #ef4444' }}>
                  {existingGroup.rejection_reason || 'No specific reason provided.'}
                </p>
              </div>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '0.9rem' }}>Group Details:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div><strong>Project:</strong> {existingGroup.project_title}</div>
                  <div><strong>Domain:</strong> {getFullDomainName(existingGroup.domain)}</div>
                  <div><strong>Supervisor:</strong> {existingGroup.supervisor_name || 'Not Assigned'}</div>
                  <div><strong>Submitted:</strong> {new Date(existingGroup.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <span className="status-badge">Status: Rejected</span>
              <button 
                className="btn-submit"
                style={{ marginTop: '1rem' }}
                onClick={() => {
                  setExistingGroup(null);
                  setHasSubmittedIdea(false);
                  setError('');
                  setSuccess('');
                }}
              >
                 Re-apply with New Group
              </button>
            </div>
          </div>
        );
      }
      
      // ✅ UPDATED: Approved/Active Status - All valid statuses included
      if (['idea_pitch', 'approved', 'proposal_pending', 'proposal_approved', 'in_progress', 'completed'].includes(status)) {
        return (
          <div className="content-area">
            <h2>Group & Idea Pitch</h2>
            <div className="status-card approved">
              <h3> Group Approved</h3>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>
                {status === 'idea_pitch' ? 'Your idea has been approved. Proceed to submit proposal.' : 
                status === 'proposal_pending' ? 'Proposal submitted. Waiting for supervisor review.' :
                status === 'proposal_approved' ? 'Proposal approved! You can now submit your project report.' :
                status === 'in_progress' ? 'Project in progress. Continue working on your FYP.' :
                status === 'completed' ? 'Project completed successfully! ' :
                'Your group is active.'}
              </p>
              <span className="status-badge" style={{ 
                background: status === 'completed' ? '#16a34a' : 
                          status === 'in_progress' ? '#1e3a8a' : 
                          status === 'proposal_approved' ? '#8b5cf6' :
                          status === 'proposal_pending' ? '#f59e0b' : '#10b981',
                color: 'white'
              }}>
                {status === 'idea_pitch' ? ' Approved' : 
                status === 'proposal_pending' ? ' Proposal Pending' :
                status === 'proposal_approved' ? ' Proposal Approved' :
                status === 'in_progress' ? ' In Progress' :
                status === 'completed' ? ' Completed' : 'Active'}
              </span>
              {existingGroup.group_number && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Group Number</p>
                  <p style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.25rem', margin: 0 }}>{existingGroup.group_number}</p>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Project Title</p>
                  <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{existingGroup.project_title}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Domain</p>
                  <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{getFullDomainName(existingGroup.domain)}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Supervisor</p>
                  <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{existingGroup.supervisor_name || 'Not Assigned'}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Current Status</p>
                  <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{status.replace('_', ' ').toUpperCase()}</p>
                </div>
              </div>
              <div>
                <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1rem' }}>Group Members:</h4>
                {existingGroup.members?.map((member, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '3px solid #1e3a8a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#1e293b' }}>
                        {member.student_name || member.full_name || member.student_email || 'Unknown'}
                      </strong>
                      <span style={{ background: member.role === 'lead' ? '#1e3a8a' : '#64748b', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {member.role === 'lead' ? ' Lead' : ' Member'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                      <span>Odoo ID: {member.odoo_id || 'N/A'}</span>
                      <span style={{ margin: '0 1rem' }}>|</span>
                      <span>CGPA: {member.cgpa || 'N/A'}</span>
                      <span style={{ margin: '0 1rem' }}>|</span>
                      <span>Credits: {member.earned_credit_hours || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      
      // Pending Approval - Sirf tab jab status pending_approval ho
      if (status === 'pending_approval') {
        return (
          <div className="content-area">
            <h2>Group & Idea Pitch</h2>
            <div className="status-card pending" style={{ borderLeft: '4px solid #f59e0b', background: '#fef9c3', padding: '1.5rem', borderRadius: '8px' }}>
              <h3 style={{ color: '#92400e', margin: '0 0 0.5rem 0' }}>⏳ Pending Approval</h3>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>Your idea has been pitched. Waiting for Admin approval.</p>
              <span className="status-badge" style={{ display: 'inline-block', background: '#fef9c3', color: '#92400e', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                Pending
              </span>
            </div>
          </div>
        );
      }
      
      // Fallback - Agar koi unknown status ho
      return (
        <div className="content-area">
          <h2>Group & Idea Pitch</h2>
          <div className="status-card">
            <h3>Unknown Status</h3>
            <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>Current status: {status}</p>
          </div>
        </div>
      );
    }
    
    // Show Form
    return (
      <div className="content-area">
        <h2>Register FYDP Group</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleIdeaSubmit}>
          {/* Project Details */}
          <div className="form-section">
            <h3>Project Details</h3>
            <div className="form-group">
              <label>Project Title *</label>
              <input type="text" className="form-input" value={formData.project_title} onChange={e => setFormData({...formData, project_title: e.target.value})} placeholder="e.g., AI-Based Attendance System" required />
            </div>
            <div className="form-group">
              <label>Domain *</label>
              <select className="form-select" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} required>
                <option value="">Select Domain</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="Web Development">Web Development</option>
                <option value="Mobile Apps">Mobile Apps</option>
                <option value="IoT / Embedded">IoT / Embedded</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          {/* Supervisor Selection */}
          <div className="form-section">
            <h3>Supervisor Selection</h3>
            <div className="form-group">
              <label>Select Internal Supervisor *</label>
              <select className="form-select" value={formData.supervisor} onChange={e => setFormData({...formData, supervisor: e.target.value})} required>
                <option value="">-- Choose Supervisor --</option>
                {facultyList.map(fac => (<option key={fac.id} value={fac.id}>{fac.full_name} - {fac.designation}</option>))}
              </select>
              <p className="form-note"> Meet your supervisor physically before selecting</p>
            </div>
          </div>
          {/* Group Members */}
          <div className="form-section">
            <h3>Group Members <small style={{ fontWeight: '400', color: '#64748b' }}>(Maximum 3 Members)</small></h3>
            {formData.members.map((member, index) => (
              <div key={index} className="member-card">
                <div className="member-header">
                  <span className="badge" style={{ background: index === 0 ? '#1e3a8a' : '#64748b' }}>
                    {index === 0 ? ' Group Lead' : ` Member ${index}`}
                  </span>
                  {index > 0 && (<button type="button" className="btn-remove" onClick={() => removeMember(index)}>✕</button>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" className="form-input" value={member.full_name} onChange={e => handleMemberChange(index, 'full_name', e.target.value)} placeholder="e.g., Muhammad Haris" required />
                  </div>
                  <div className="form-group">
                    <label>Odoo ID *</label>
                    <input type="text" className="form-input" value={member.odoo_id} onChange={e => handleMemberChange(index, 'odoo_id', e.target.value)} placeholder="e.g., IU02-0322-0288" required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>CGPA *</label>
                    <input type="number" step="0.01" min="0" max="4" className="form-input" value={member.cgpa} onChange={e => handleMemberChange(index, 'cgpa', e.target.value)} placeholder="e.g., 3.50" required />
                    <p className="form-note">Minimum: <strong>2.0</strong></p>
                  </div>
                  <div className="form-group">
                    <label>Earned Credit Hours *</label>
                    <input type="number" min="0" max="200" className="form-input" value={member.earned_credit_hours} onChange={e => handleMemberChange(index, 'earned_credit_hours', e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 100" required />
                    <p className="form-note">
                      {!member.earned_credit_hours ? 'Enter credits' : member.earned_credit_hours < 100 ? '⚠️ HOD approval needed' : '✓ Eligible'}
                    </p>
                  </div>
                </div>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" checked={member.prerequisites_completed} onChange={e => handleMemberChange(index, 'prerequisites_completed', e.target.checked)} />
                    Prerequisites Completed
                  </label>
                  <label>
                    <input type="checkbox" checked={member.has_special_permission} onChange={e => handleMemberChange(index, 'has_special_permission', e.target.checked)} />
                    I have HOD/Dean approval for deficiency
                  </label>
                </div>
              </div>
            ))}
            {formData.members.length < 3 && (<button type="button" className="btn-add" onClick={addMember}>+ Add Member ({formData.members.length}/3)</button>)}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Group Registration'}
            </button>
          </div>
        </form>
      </div>
    );
  };


  //Project Progress Function
const renderProjectProgress = () => {
  // Helper variables
  const isProposalApproved = proposalData?.status === 'approved';
  const isReportApproved = reportData?.status === 'approved';
  
  // Idea Pitch status check
  const ideaPitchStatus = existingGroup?.status === 'idea_pitch' || 
                          existingGroup?.status === 'proposal_pending' || 
                          existingGroup?.status === 'proposal_approved' ||
                          existingGroup?.status === 'in_progress' ||
                          existingGroup?.status === 'completed' ? 'approved' : 
                          existingGroup?.status === 'pending_approval' ? 'pending' : 'not_submitted';
  
  return (
    <div className="content-area">
      <h2>Project Progress</h2>
      
      {/* Status Cards - 5 cards ab */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Current Phase */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
            Current Phase
          </p>
          <p style={{ fontWeight: '700', color: '#000000', fontSize: '1.25rem', margin: 0 }}>
            {existingGroup?.fydp_phase === 'fydp2' ? 'FYDP-II' : 'FYDP-I'}
          </p>
        </div>
        
        {/* Idea Pitch Status */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
            Idea Pitch
          </p>
          <p style={{ fontWeight: '700', color: '#000000', fontSize: '1.25rem', margin: 0 }}>
            {ideaPitchStatus === 'approved' ? 'Approved' : ideaPitchStatus === 'pending' ? 'Pending' : 'Not Submitted'}
          </p>
        </div>
        
        {/* Proposal Status */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
            Proposal
          </p>
          <p style={{ fontWeight: '700', color: '#000000', fontSize: '1.25rem', margin: 0 }}>
            {proposalData?.status_display || 'Not Submitted'}
          </p>
        </div>
        
        {/* Report Status */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
            Report
          </p>
          <p style={{ fontWeight: '700', color: '#000000', fontSize: '1.25rem', margin: 0 }}>
            {reportData?.status_display || 'Not Submitted'}
          </p>
        </div>
        
        {/* Meetings Conducted */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
            Meetings
          </p>
          <p style={{ fontWeight: '700', color: '#000000', fontSize: '1.25rem', margin: 0 }}>
            {myMeetingsData?.attendance?.length || 0}
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>FYP Progress Tracker</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { 
              label: 'Group Formation & Idea Pitch', 
              status: existingGroup ? 'completed' : 'pending',
              icon: '1'
            },
            { 
              label: 'Proposal Submission', 
              status: isProposalApproved ? 'completed' : proposalData ? 'in-progress' : 'pending',
              icon: '2'
            },
            { 
              label: 'Final Report Submission', 
              status: isReportApproved ? 'completed' : reportData ? 'in-progress' : 'pending',
              icon: '3'
            },
            { 
              label: 'Final Evaluation', 
              status: isReportApproved ? 'in-progress' : 'pending',
              icon: '4'
            },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: item.status === 'completed' ? '#000000' : 
                          item.status === 'in-progress' ? '#f59e0b' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '0.875rem'
              }}>
                {item.status === 'completed' ? '✓' : item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: '600', color: '#000000', fontSize: '0.9rem' }}>
                  {item.label}
                </p>
              </div>
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: '600',
                background: item.status === 'completed' ? '#d1fae5' : 
                          item.status === 'in-progress' ? '#fef3c7' : '#f1f5f9',
                color: '#000000',
                border: '1px solid #e2e8f0'
              }}>
                {item.status === 'completed' ? 'Completed' : 
                item.status === 'in-progress' ? 'In Progress' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

  const renderMaterials = () => {
    const materials = [
      {
        id: 1,
        title: 'Proposal Template',
        desc: 'FYP project proposal submission form (Form FP-1)',
        file: '/Materials/Proposal - Template.pdf',
        color: '#3b82f6'
      },
      {
        id: 2,
        title: 'Brochure Format',
        desc: 'Official brochure size and format guidelines',
        file: '/Materials/brochure format IU Updated.pdf',
        color: '#10b981'
      },
      {
        id: 3,
        title: 'Standee Format',
        desc: 'Standee design format and dimensions',
        file: '/Materials/Standee Format IU Updated.pdf',
        color: '#f59e0b'
      },
      {
        id: 4,
        title: 'FYP-I Report Template',
        desc: 'Report writing template for FYP-I',
        file: '/Materials/FYDP-I Report Template.docx',
        color: '#8b5cf6'
      },
      {
        id: 5,
        title: 'FYP Final Report Template (2025)',
        desc: 'Final report template — updated 2025',
        file: '/Materials/FYDP Report Template IU Final 2025.pdf',
        color: '#ef4444'
      },
      {
        id: 6,
        title: 'Project Completion Form',
        desc: 'Form to submit upon project completion',
        file: '/Materials/FYDP Project Completion form (1).pdf',
        color: '#10b981'
      },
      {
        id: 7,
        title: 'Title Change Application',
        desc: 'Application form for changing project title',
        file: '/Materials/Application for Title change.pdf',
        color: '#3b82f6'
      },
      {
        id: 8,
        title: 'Consent Form (Industrial Advisor)',
        desc: 'F-SOP FYDP-04 consent form for industrial advisors',
        file: '/Materials/F-SOP FYDP-04 (Consent Form Indus).pdf',
        color: '#f59e0b'
      },
      {
        id: 9,
        title: 'Form 3',
        desc: 'FYP Form 3 — official department form',
        file: '/Materials/form 3.pdf',
        color: '#8b5cf6'
      },
      {
        id: 10,
        title: 'IU Poster Template',
        desc: 'Official Iqra University poster template',
        file: '/Materials/IQRA_Poster_Atir.pdf',
        color: '#ef4444'
      }
    ];

    const handleView = (filePath) => {
      window.open(filePath, '_blank');
    };

    const handleDownload = async (filePath, fileName) => {
      try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download file.');
      }
    };

    return (
      <div className="content-area">
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
          Materials & Downloads
        </h2>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Download official templates, forms, and format guidelines for your FYP.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {materials.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              {/* Header with Title */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    lineHeight: '1.3'
                  }}>
                    {item.title}
                  </h4>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    lineHeight: '1.4'
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button
                  onClick={() => handleView(item.file)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span></span> View
                </button>
                <button
                  onClick={() => handleDownload(item.file, item.file.split('/').pop())}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: '#1e3a8a',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>⬇</span> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ UPDATED: Render Proposal Upload & Status
  const renderProposal = () => {
      // 1. Check if group is approved first
      if (!existingGroup || !['idea_pitch', 'proposal_pending', 'proposal_approved', 'in_progress', 'completed'].includes(existingGroup.status)) {
        return (
          <div className="content-area">
            <h2>Project Proposal</h2>                    
            <div className="status-card pending">
              <h3>Group Approval Required</h3>          
              <p>Your group must be approved by the admin before you can submit a proposal.</p>  
            </div>
          </div>
        );
      }

    if (proposalLoading) return <div className="content-area"><div className="loading-spinner">Loading proposal...</div></div>;

    // 2. If no proposal exists, show create button
    if (!proposalData) {
      return (
        <div className="content-area">
          <h2>Project Proposal</h2>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <div className="status-card">
            <h3>Initialize Proposal</h3>
            <p>Click below to create a proposal draft for your group. After that, you can upload the filled PDF.</p>
            <button className="btn-submit" onClick={handleCreateProposal} disabled={loading}>
              {loading ? 'Creating...' : 'Create Proposal Draft'}
            </button>
          </div>
        </div>
      );
    }

    // 3. Proposal exists, show status and upload options
    const statusColors = {
      'draft': '#64748b',
      'submitted': '#3b82f6',
      'approved_by_supervisor': '#8b5cf6',
      'revision_needed': '#f59e0b',
      'approved': '#15803d',
      'rejected': '#ef4444'
    };

    const canUpload = ['draft', 'submitted', 'revision_needed'].includes(proposalData.status) && proposalData.submission_count < 3;

    return (
      <div className="content-area">
        <h2>Project Proposal</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        {/* Status Card */}
        <div className="status-card" style={{ border: '1px solid #e2e8f0', borderLeft: `4px solid ${statusColors[proposalData.status] || '#64748b'}`, background: '#ffffff', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Proposal Status</h3>
           <span className="status-badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
              {proposalData.status_display}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Submission Attempts</p>
              <p style={{ fontWeight: '700', color: '#1e293b', margin: 0, fontSize: '1.25rem' }}>
                {proposalData.submission_count} / 3
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Last Submitted</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>
                {proposalData.submitted_at ? new Date(proposalData.submitted_at).toLocaleDateString() : 'Not submitted yet'}
              </p>
            </div>
          </div>

          {/* Remarks Section */}
          {proposalData.supervisor_remarks && (
            <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '3px solid #3b82f6' }}>
              <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Supervisor Remarks:</p>
              <p style={{ color: '#1e293b', margin: 0, fontStyle: 'italic' }}>{proposalData.supervisor_remarks}</p>
            </div>
          )}
          {proposalData.admin_remarks && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1e40af', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#5b21b6', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Admin Remarks:</p>
              <p style={{ color: '#1e293b', margin: 0, fontStyle: 'italic' }}>{proposalData.admin_remarks}</p>
            </div>
          )}

          {/* File Download */}
          {proposalData.proposal_file && (
           <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#065f46', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Uploaded File:</p>
              <button 
                onClick={() => handleFileDownload(proposalData.proposal_file)}
                style={{ background: 'none', border: 'none', color: '#059669', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
              >
                View / Download Proposal File
              </button>
            </div>
          )}

          {/* Upload Section */}
          {canUpload ? (
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Upload Proposal File</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Please download the template from the "Materials" section, fill it, and upload here. (PDF/DOCX only, Max 10MB)
              </p>
              <input 
                type="file" 
                accept=".pdf,.docx" 
                onChange={(e) => setProposalFile(e.target.files[0])}
                className="form-input"
                style={{ marginBottom: '1rem' }}
              />
              <button 
                className="btn-submit" 
                onClick={handleFileUpload}
                disabled={!proposalFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Submit Proposal'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: '4px solid #ea580c', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <p style={{ color: '#9a3412', margin: 0, fontWeight: '500' }}>
                {proposalData.status === 'approved' ? 'Proposal has been finally approved. No further uploads allowed.' :
                 proposalData.status === 'rejected' ? 'Proposal has been rejected. Contact admin.' :
                 'Maximum 3 submission attempts reached. Contact admin to reset.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };


  // renderProjectReport function 
  const renderProjectReport = () => {
    if (!existingGroup || !['proposal_approved', 'in_progress', 'completed'].includes(existingGroup.status)) {
      return (
        <div className="content-area">
          <h2>Project Report</h2>
          <div className="status-card pending">
            <h3>Project Not Ready for Report Submission</h3>
            <p>Your proposal must be approved before you can submit the final report.</p>
          </div>
        </div>
      );
    }

    if (reportLoading) return <div className="content-area"><div className="loading-spinner">Loading report...</div></div>;

    if (!reportData) {
      return (
        <div className="content-area">
          <h2>Project Report</h2>
          <div className="status-card">
            <h3>No Report Submission Found</h3>
            <p>Contact admin to initialize report submission for your group.</p>
          </div>
        </div>
      );
    }

    const statusColors = {
      'draft': '#64748b',
      'submitted': '#3b82f6',
      'approved_by_supervisor': '#8b5cf6',
      'revision_needed': '#f59e0b',
      'approved': '#15803d',
      'rejected': '#ef4444'
    };

    const canUpload = ['draft', 'submitted', 'revision_needed'].includes(reportData.status) && reportData.submission_count < 3;

    return (
      <div className="content-area">
        <h2>Project Report</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        {/* Status Card */}
       <div className="status-card" style={{ border: '1px solid #e2e8f0', borderLeft: `4px solid ${statusColors[reportData.status] || '#64748b'}`, background: '#ffffff', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Report Status</h3>
           <span className="status-badge" style={{ background: reportData.status === 'approved' ? '#dcfce7' : statusColors[reportData.status], color: reportData.status === 'approved' ? '#166534' : 'white', border: reportData.status === 'approved' ? '1px solid #bbf7d0' : 'none' }}>
              {reportData.status_display}
            </span>
          </div>
          
          {/* Late Submission Warning */}
          {reportData.is_late && (
            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '3px solid #f59e0b' }}>
              <p style={{ color: '#92400e', margin: 0, fontWeight: '600' }}>
                 Late Submission - This report was submitted after the deadline
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Submission Attempts</p>
              <p style={{ fontWeight: '700', color: '#1e293b', margin: 0, fontSize: '1.25rem' }}>
                {reportData.submission_count} / 3
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Last Submitted</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>
                {reportData.submitted_at ? new Date(reportData.submitted_at).toLocaleDateString() : 'Not submitted yet'}
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Plagiarism Score</p>
              <p style={{ fontWeight: '700', color: reportData.internal_similarity_score > 30 ? '#ef4444' : '#10b981', margin: 0, fontSize: '1.25rem' }}>
                {reportData.internal_similarity_score}%
              </p>
            </div>
          </div>

          {/* Remarks Section */}
          {reportData.supervisor_remarks && (
            <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '3px solid #3b82f6' }}>
              <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Supervisor Remarks:</p>
              <p style={{ color: '#1e293b', margin: 0, fontStyle: 'italic' }}>{reportData.supervisor_remarks}</p>
            </div>
          )}
          {reportData.admin_remarks && (
           <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1e40af', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#5b21b6', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Admin Remarks:</p>
              <p style={{ color: '#1e293b', margin: 0, fontStyle: 'italic' }}>{reportData.admin_remarks}</p>
            </div>
          )}

          {/* File Download */}
          {reportData.report_file && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#065f46', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Uploaded Report:</p>
              <button 
                onClick={() => handleFileDownload(reportData.report_file)}
                style={{ background: 'none', border: 'none', color: '#059669', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
              >
                View / Download Report File
              </button>
            </div>
          )}

          {/* Upload Section */}
          {canUpload ? (
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Upload Report File</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Upload your final project report (PDF/DOCX only, Max 20MB)
              </p>
              <input 
                type="file" 
                accept=".pdf,.docx" 
                onChange={(e) => setReportFile(e.target.files[0])}
                className="form-input"
                style={{ marginBottom: '1rem' }}
              />
              <button 
                className="btn-submit" 
                onClick={handleReportUpload}
                disabled={!reportFile || uploadingReport}
              >
                {uploadingReport ? 'Uploading...' : 'Submit Report'}
              </button>
            </div>
          ) : (
           <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: '4px solid #ea580c', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <p style={{ color: '#9a3412', margin: 0, fontWeight: '500' }}>
                {reportData.status === 'approved' ? ' Report has been finally approved. No further uploads allowed.' :
                reportData.status === 'rejected' ? ' Report has been rejected. Contact admin.' :
                ' Maximum 3 submission attempts reached. Contact admin to reset.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main Render
  return (
    <div className="dashboard-container">
      {/* ✅ Sidebar Pehle */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Student Portal</h3>
          <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        
        {/* User Profile */}
        <div style={{ padding: '1rem', background: '#1e3a8a', borderRadius: '12px', margin: '0 0.75rem 1rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: 'white' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.1rem', flexShrink: 0 }}>
            {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ overflow: 'visible', flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'white', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2' }}>
              {userInfo.name}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize' }}>
              {userInfo.role === 'admin' ? 'Administrator' : userInfo.role === 'supervisor' ? 'Supervisor' : 'Student'}
            </p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => { setActiveTab('progress'); setMenuOpen(false); }}> Project Progress </button>
          <button className={`nav-btn ${activeTab === 'group' ? 'active' : ''}`} onClick={() => { setActiveTab('group'); setMenuOpen(false); }}> Group & Idea Pitch</button>
          <button className={`nav-btn ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => { setActiveTab('proposal'); setMenuOpen(false); }}> Project Proposal</button>
          <button className={`nav-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => { setActiveTab('report'); setMenuOpen(false); }}> Project Report</button>
          <button className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); setMenuOpen(false); }}> Meeting Logs & Attendance</button>
          <button className={`nav-btn ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => { setActiveTab('materials'); setMenuOpen(false); }}> Materials & Downloads</button>
        </nav>
      </aside>

      {/* ✅ Overlay Baad mein */}
      <div className={`sidebar-overlay ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* Main Content */}
      <main className="main-content">
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>☰ Menu</button>
        {activeTab === 'group' && renderGroupFormation()}
        {activeTab === 'proposal' && renderProposal()}
        {activeTab === 'report' && renderProjectReport()}
        {activeTab === 'logs' && renderMeetingLogs()}
        {activeTab === 'progress' && renderProjectProgress()} 
        {activeTab === 'materials' && renderMaterials()}
      </main>
    </div>
  );
}

export default StudentDashboard;
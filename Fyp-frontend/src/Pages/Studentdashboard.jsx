// fyp-frontend/src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import './Studentdashboard.css';

function StudentDashboard() {
  const [existingGroup, setExistingGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('group');
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasSubmittedIdea, setHasSubmittedIdea] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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

  // ✅ Single useEffect for fetching group data
  // ✅ Updated useEffect - Check for rejected groups too
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        // Try to get active group first
        const activeResponse = await api.get('/projects/groups/my_group/');
        
        if (activeResponse.data) {
          // Active group found
          setExistingGroup(activeResponse.data);
          setHasSubmittedIdea(true);
        } else {
          // No active group - check for rejected group
          try {
            const historyResponse = await api.get('/projects/groups/my-group-with-history/');
            
            if (historyResponse.data && historyResponse.data.status === 'rejected') {
              // Show rejected group to student
              setExistingGroup(historyResponse.data);
              setHasSubmittedIdea(true);
            } else {
              // No group at all - show form
              setExistingGroup(null);
              setHasSubmittedIdea(false);
            }
          } catch (historyErr) {
            // No history found - show form
            setExistingGroup(null);
            setHasSubmittedIdea(false);
          }
        }
      } catch (err) {
        // No active group found - check history
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
      // Refresh group data
      const response = await api.get('/projects/groups/my_group/');
      if (response.data) setExistingGroup(response.data);
    } catch (err) {
      console.error("Submission failed:", err.response?.data || err.message);
      setError(err.response?.data?.detail || "Registration failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Domain mapping helper - short to full text
  const getFullDomainName = (domainValue) => {
    const domainMap = {
      'AI': 'AI & Machine Learning',
      'Web': 'Web Development',
      'App': 'Mobile Apps',
      'IoT': 'IoT / Embedded',
      'Other': 'Other'
    };
    return domainMap[domainValue] || domainValue; // Fallback to original if not found
  };

  // ✅ FIXED: Render Group Formation - Complete with Form Return
  const renderGroupFormation = () => {
    // Case 1: User has submitted a group
    if (hasSubmittedIdea && existingGroup) {
      const status = existingGroup.status;
      
      // ✅ Rejected Status - Show rejection reason prominently
      if (status === 'rejected') {
        return (
          <div className="content-area">
            <h2>Group & Idea Pitch</h2>
            
            {/* Rejection Notice with Reason */}
            <div className="status-card rejected" style={{ 
              borderLeft: '4px solid #ef4444', 
              background: '#fef2f2', 
              padding: '1.5rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h3 style={{ color: '#991b1b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ❌ Group Registration Rejected
              </h3>
              
              {/* Admin's Rejection Reason */}
              <div style={{ 
                background: '#fff', 
                padding: '1rem', 
                borderRadius: '6px', 
                marginBottom: '1rem',
                border: '1px solid #fecaca'
              }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600', textTransform: 'uppercase' }}>
                  📝 Admin's Feedback / Reason for Rejection:
                </p>
                <p style={{ 
                  color: '#1e293b', 
                  margin: 0, 
                  fontStyle: 'italic',
                  background: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  borderLeft: '3px solid #ef4444'
                }}>
                  {existingGroup.rejection_reason || 'No specific reason provided by admin.'}
                </p>
              </div>

              {/* Rejected Group Details */}
              <div style={{ 
                background: '#fff', 
                padding: '1rem', 
                borderRadius: '6px',
                marginBottom: '1rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '0.9rem' }}>Rejected Group Details:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div><strong>Project:</strong> {existingGroup.project_title}</div>
                  <div><strong>Domain:</strong> {getFullDomainName(existingGroup.domain)}</div>
                  <div><strong>Supervisor:</strong> {existingGroup.supervisor_name || 'Not Assigned'}</div>
                  <div><strong>Submitted:</strong> {new Date(existingGroup.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              
              <span className="status-badge" style={{ 
                display: 'inline-block', 
                background: '#fee2e2', 
                color: '#991b1b', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: '600'
              }}>
                Status: Rejected
              </span>
              
              <button 
                className="btn-primary" 
                style={{ 
                  marginTop: '1rem', 
                  background: '#1e3a8a', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => {
                  setExistingGroup(null);
                  setHasSubmittedIdea(false);
                  setError('');
                  setSuccess('');
                }}
              >
                🔄 Re-apply with New Group
              </button>
            </div>
          </div>
        );
      }
      
      // Approved/Active Status
      if (status === 'idea_pitch' || status === 'approved' || status === 'proposal_pending') {
        return (
          <div className="content-area">
            <h2>Group & Idea Pitch</h2>
            <div className="status-card approved" style={{ borderLeft: '4px solid #22c55e', background: '#f0fdf4', padding: '1.5rem', borderRadius: '8px' }}>
              <h3 style={{ color: '#166534', margin: '0 0 0.5rem 0' }}>✅ Group Approved</h3>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>
                {status === 'idea_pitch' ? 'Your idea has been approved. Proceed to submit proposal.' : 
                 status === 'proposal_pending' ? 'Proposal submitted. Waiting for committee review.' :
                 'Your group is active.'}
              </p>
              <span className="status-badge" style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                {status === 'idea_pitch' ? 'Approved' : status === 'proposal_pending' ? 'Proposal Pending' : 'Active'}
              </span>
              {existingGroup.group_number && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Group Number</p>
                  <p style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.25rem', margin: 0 }}>{existingGroup.group_number}</p>
                </div>
              )}
            </div>
            {/* Group Details */}
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
              </div>
              {/* Members List */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1rem', margin: '0 0 1rem 0' }}>Group Members:</h4>
                {existingGroup.members?.map((member, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '3px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#1e293b' }}>{member.full_name || member.student_email}</strong>
                      <span style={{ background: member.role === 'lead' ? '#1e3a8a' : '#64748b', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {member.role === 'lead' ? '👑 Lead' : '👤 Member'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      
      // Default: Pending Approval
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
          {/* Group Details for Pending */}
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
            </div>
          </div>
        </div>
      );
    }
    
    // ✅ Case 2: User has NOT submitted - SHOW THE FORM
    return (
      <div className="content-area">
        <h2>Register FYDP Group</h2>
        {error && <div className="alert alert-error" style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem' }}>{success}</div>}
        <form onSubmit={handleIdeaSubmit}>
          {/* Project Details */}
          <div className="form-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Project Details</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Project Title *</label>
              <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={formData.project_title} onChange={e => setFormData({...formData, project_title: e.target.value})} placeholder="e.g., AI-Based Attendance System" required />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Domain *</label>
              <select className="form-select" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} required>
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
          <div className="form-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Supervisor Selection</h3>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Select Internal Supervisor *</label>
              <select className="form-select" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={formData.supervisor} onChange={e => setFormData({...formData, supervisor: e.target.value})} required>
                <option value="">-- Choose Supervisor --</option>
                {facultyList.map(fac => (<option key={fac.id} value={fac.id}>{fac.full_name} - {fac.designation}</option>))}
              </select>
              <p className="form-note" style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>💡 Meet your supervisor physically before selecting</p>
            </div>
          </div>
          {/* Group Members */}
          <div className="form-section" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Group Members <small style={{ fontWeight: '400', color: '#64748b' }}>(Maximum 3 Members)</small></h3>
            {formData.members.map((member, index) => (
              <div key={index} className="member-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
                <div className="member-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                  <span className="badge" style={{ background: index === 0 ? '#1e3a8a' : '#64748b', color: 'white', padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {index === 0 ? '👑 Group Lead' : `👤 Member ${index}`}
                  </span>
                  {index > 0 && (<button type="button" className="btn-remove" onClick={() => removeMember(index)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.375rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Full Name *</label>
                    <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={member.full_name} onChange={e => handleMemberChange(index, 'full_name', e.target.value)} placeholder="e.g., Muhammad Haris" required />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Odoo ID *</label>
                    <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={member.odoo_id} onChange={e => handleMemberChange(index, 'odoo_id', e.target.value)} placeholder="e.g., IU02-0322-0288" required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>CGPA *</label>
                    <input type="number" step="0.01" min="0" max="4" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={member.cgpa} onChange={e => handleMemberChange(index, 'cgpa', e.target.value)} placeholder="e.g., 3.50" required />
                    <p className="form-note" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Minimum: <strong>2.0</strong></p>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Earned Credit Hours *</label>
                    <input type="number" min="0" max="200" className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} value={member.earned_credit_hours} onChange={e => handleMemberChange(index, 'earned_credit_hours', e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 100" required />
                    <p className="form-note" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {!member.earned_credit_hours ? 'Enter credits' : member.earned_credit_hours < 100 ? '⚠️ HOD approval needed' : '✓ Eligible'}
                    </p>
                  </div>
                </div>
                <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                    <input type="checkbox" checked={member.prerequisites_completed} onChange={e => handleMemberChange(index, 'prerequisites_completed', e.target.checked)} />
                    Prerequisites Completed
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
                    <input type="checkbox" checked={member.has_special_permission} onChange={e => handleMemberChange(index, 'has_special_permission', e.target.checked)} />
                    I have HOD/Dean approval for deficiency
                  </label>
                </div>
              </div>
            ))}
            {formData.members.length < 3 && (<button type="button" className="btn-add" onClick={addMember} style={{ background: '#f1f5f9', color: '#1e3a8a', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>+ Add Member ({formData.members.length}/3)</button>)}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-submit" style={{ background: '#1e3a8a', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Group Registration'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Render other tabs (unchanged)
  const renderProposal = () => (<div className="content-area"><h2>Project Proposal</h2><div className="placeholder-card"><p>📄 Upload your project proposal here</p><p className="text-muted">This feature will be available soon</p></div></div>);
  const renderMeetingLogs = () => (<div className="content-area"><h2>Weekly Meeting Logs</h2><div className="placeholder-card"><p>📅 Track your weekly progress meetings</p><p className="text-muted">Coming soon...</p></div></div>);
  const renderReports = () => (<div className="content-area"><h2>Reports & Marks</h2><div className="placeholder-card"><p>📊 View your FYP progress and marks</p><p className="text-muted">Coming soon...</p></div></div>);
  const renderMaterials = () => {
    const materials = [{ name: 'Proposal Template', desc: 'FYP project proposal form', icon: '📋' }, { name: 'Brochure Format', desc: 'Official brochure guidelines', icon: '🖼️' }, { name: 'FYP Report Template', desc: 'Report writing format', icon: '📝' }];
    return (<div className="content-area"><h2>Materials & Downloads</h2><div className="materials-grid">{materials.map((item, idx) => (<div key={idx} className="material-card"><div className="material-icon">{item.icon}</div><div className="material-info"><h4>{item.name}</h4><p className="text-muted">{item.desc}</p></div></div>))}</div></div>);
  };

  // Main Render
  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Student Portal</h3>
          <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        
        {/* 👤 User Profile Section - UPDATED */}
        <div style={{ 
          padding: '1rem',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          borderRadius: '12px',
          margin: '0 0.75rem 1rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          color: 'white'
        }}>
          {/* Avatar Circle */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '1.1rem',
            flexShrink: 0,
            backdropFilter: 'blur(10px)'
          }}>
            {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
          </div>
          
          {/* Name & Role - FIXED to show full text */}
          <div style={{ overflow: 'visible', flex: 1, minWidth: 0 }}>
            <p style={{ 
              margin: 0, 
              fontSize: '0.9rem', 
              fontWeight: '600', 
              color: 'white',
              whiteSpace: 'normal',    // Allows wrapping
              wordWrap: 'break-word',  // Breaks long words
              lineHeight: '1.2',       // Keeps lines tight
              overflowWrap: 'break-word'
            }}>
              {userInfo.name}
            </p>
            <p style={{ 
              margin: '2px 0 0 0', 
              fontSize: '0.75rem', 
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'capitalize'
            }}>
              {userInfo.role === 'admin' ? 'Administrator' : 
               userInfo.role === 'supervisor' ? 'Supervisor' : 'Student'}
            </p>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'group' ? 'active' : ''}`} onClick={() => setActiveTab('group')}>📝 Group & Idea Pitch</button>
          <button className={`nav-btn ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => setActiveTab('proposal')}>📄 Project Proposal</button>
          <button className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>📅 Meeting Logs</button>
          <button className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>📊 Reports & Marks</button>
          <button className={`nav-btn ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>📥 Materials & Downloads</button>
        </nav>
      </aside>
      <main className="main-content">
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>☰ Menu</button>
        {activeTab === 'group' && renderGroupFormation()}
        {activeTab === 'proposal' && renderProposal()}
        {activeTab === 'logs' && renderMeetingLogs()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'materials' && renderMaterials()}
      </main>
    </div>
  );
}

export default StudentDashboard;
// fyp-frontend/src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { studentMeetingAPI } from '../utils/api';
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
  const [myMeetingsData, setMyMeetingsData] = useState(null);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

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

  // Render Meeting Logs
  const renderMeetingLogs = () => {
    if (loadingMeetings) return <div className="loading-spinner">Loading logs...</div>;
    if (!myMeetingsData) return <div className="text-muted">No meeting logs found.</div>;

    return (
      <div className="content-area">
        <h2>📅 Meeting Logs & Tasks</h2>

        {/* Current Task Card */}
        <div className="task-card">
          <h3>🚀 Current Tasks</h3>
          <p>{myMeetingsData.current_task || "No task assigned yet."}</p>
        </div>

        {/* Attendance Table */}
        <div className="table-container">
          <div className="attendance-title-card">
            <h3>📊 Attendance & Tasks</h3>
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
                        {log.status.toLowerCase() === 'present' ? ' Present' : ' Absent'}
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
              <h3>❌ Group Registration Rejected</h3>
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600', textTransform: 'uppercase' }}>
                  📝 Admin's Feedback:
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
            <div className="status-card approved">
              <h3>✅ Group Approved</h3>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>
                {status === 'idea_pitch' ? 'Your idea has been approved. Proceed to submit proposal.' : 
                 status === 'proposal_pending' ? 'Proposal submitted. Waiting for committee review.' :
                 'Your group is active.'}
              </p>
              <span className="status-badge">
                {status === 'idea_pitch' ? 'Approved' : status === 'proposal_pending' ? 'Proposal Pending' : 'Active'}
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
              </div>
              <div>
                <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1rem' }}>Group Members:</h4>
                {existingGroup.members?.map((member, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '3px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#1e293b' }}>
                        {member.student_name || member.full_name || member.student_email || 'Unknown'}
                      </strong>
                      <span style={{ background: member.role === 'lead' ? '#1e3a8a' : '#64748b', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {member.role === 'lead' ? '👑 Lead' : '👤 Member'}
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
      
      // Pending Approval
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
              <p className="form-note">💡 Meet your supervisor physically before selecting</p>
            </div>
          </div>
          {/* Group Members */}
          <div className="form-section">
            <h3>Group Members <small style={{ fontWeight: '400', color: '#64748b' }}>(Maximum 3 Members)</small></h3>
            {formData.members.map((member, index) => (
              <div key={index} className="member-card">
                <div className="member-header">
                  <span className="badge" style={{ background: index === 0 ? '#1e3a8a' : '#64748b' }}>
                    {index === 0 ? '👑 Group Lead' : `👤 Member ${index}`}
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

  // Render other tabs
  const renderProposal = () => (<div className="content-area"><h2>Project Proposal</h2><div className="placeholder-card"><p>📄 Upload your project proposal here</p><p className="text-muted">This feature will be available soon</p></div></div>);
  const renderReports = () => (<div className="content-area"><h2>Reports & Marks</h2><div className="placeholder-card"><p>📊 View your FYP progress and marks</p><p className="text-muted">Coming soon...</p></div></div>);
  const renderMaterials = () => {
    const materials = [{ name: 'Proposal Template', desc: 'FYP project proposal form', icon: '📋' }, { name: 'Brochure Format', desc: 'Official brochure guidelines', icon: '🖼️' }, { name: 'FYP Report Template', desc: 'Report writing format', icon: '📝' }];
    return (<div className="content-area"><h2>Materials & Downloads</h2><div className="materials-grid">{materials.map((item, idx) => (<div key={idx} className="material-card"><div className="material-icon">{item.icon}</div><div className="material-info"><h4>{item.name}</h4><p className="text-muted">{item.desc}</p></div></div>))}</div></div>);
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
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '12px', margin: '0 0.75rem 1rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: 'white' }}>
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
          <button className={`nav-btn ${activeTab === 'group' ? 'active' : ''}`} onClick={() => { setActiveTab('group'); setMenuOpen(false); }}>📝 Group & Idea Pitch</button>
          <button className={`nav-btn ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => { setActiveTab('proposal'); setMenuOpen(false); }}>📄 Project Proposal</button>
          <button className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); setMenuOpen(false); }}>📅 Meeting Logs</button>
          <button className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setMenuOpen(false); }}>📊 Reports & Marks</button>
          <button className={`nav-btn ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => { setActiveTab('materials'); setMenuOpen(false); }}>📥 Materials</button>
        </nav>
      </aside>

      {/* ✅ Overlay Baad mein */}
      <div className={`sidebar-overlay ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* Main Content */}
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
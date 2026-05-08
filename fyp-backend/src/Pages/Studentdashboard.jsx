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

  // ✅ useEffect
  useEffect(() => {
    const checkExistingGroup = async () => {
      try {
        const response = await api.get('/projects/groups/my_group/');
        if (response.data) {
          setExistingGroup(response.data);
          setHasSubmittedIdea(true);
        }
      } catch (err) {
        console.log("No existing group found");
      }
    };
    checkExistingGroup();
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
          {  full_name: '', odoo_id: '', role: 'member', cgpa: '', earned_credit_hours: '', prerequisites_completed: true, has_special_permission: false }
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

  // Validation
  const isValid = formData.members.every(m => m.full_name && m.odoo_id && m.cgpa && m.earned_credit_hours);
  if (!isValid) {
    setError("Please fill Full Name, Odoo ID, CGPA, and Credit Hours for all members.");
    setLoading(false);
    return;
  }

  try {
    // Data ko number mein convert karein
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

    // ✅ api instance use karein (Ye automatically JSON headers bhejta hai)
    const res = await api.post('/projects/groups/', payload);

    setSuccess("Group Registered Successfully!");
    setHasSubmittedIdea(true);
  } catch (err) {
    console.error("Submission failed:", err.response?.data || err.message);
    setError(err.response?.data?.detail || "Registration failed. Check console.");
  } finally {
    setLoading(false);
  }
};

  // Render Group Formation
const renderGroupFormation = () => {
  if (hasSubmittedIdea && existingGroup) {
    return (
      <div className="content-area">
        <h2>Group & Idea Pitch</h2>
        <div className="status-card pending">
          <h3>Project Idea Submitted</h3>
          <p>Your idea has been pitched. Waiting for Admin approval.</p>
          <span className="status-badge badge-pending">Pending Approval</span>
          
          {/* Submitted Details */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Project Title</p>
                <p style={{ fontWeight: '600', color: '#1e293b' }}>{existingGroup.project_title}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Domain</p>
                <p style={{ fontWeight: '600', color: '#1e293b' }}>{existingGroup.domain}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Group Number</p>
                <p style={{ fontWeight: '600', color: '#1e293b' }}>{existingGroup.group_number}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Supervisor</p>
                <p style={{ fontWeight: '600', color: '#1e293b' }}>{existingGroup.supervisor_name || 'Not Assigned'}</p>
              </div>
            </div>
            
            {/* Members List */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1rem' }}>Group Members:</h4>
              {existingGroup.members?.map((member, idx) => (
                <div key={idx} style={{ 
                  background: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '0.75rem',
                  borderLeft: '3px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#1e293b' }}>{member.full_name || member.student_email}</strong>
                    <span style={{ 
                      background: member.role === 'lead' ? '#1e3a8a' : '#64748b',
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {member.role === 'lead' ? '👑 Lead' : '👤 Member'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                    <span>Odoo ID: {member.odoo_id}</span>
                    <span style={{ margin: '0 1rem' }}>|</span>
                    <span>CGPA: {member.cgpa}</span>
                    <span style={{ margin: '0 1rem' }}>|</span>
                    <span>Credits: {member.earned_credit_hours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <input 
              type="text" 
              className="form-input"
              value={formData.project_title}
              onChange={e => setFormData({...formData, project_title: e.target.value})}
              placeholder="e.g., AI-Based Attendance System"
              required
            />
          </div>
          <div className="form-group">
            <label>Domain *</label>
            <select 
              className="form-select"
              value={formData.domain}
              onChange={e => setFormData({...formData, domain: e.target.value})}
              required
            >
              <option value="">Select Domain</option>
              <option value="AI">AI & Machine Learning</option>
              <option value="Web">Web Development</option>
              <option value="App">Mobile Apps</option>
              <option value="IoT">IoT / Embedded</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Supervisor Selection */}
        <div className="form-section">
          <h3>Supervisor Selection</h3>
          <div className="form-group">
            <label>Select Internal Supervisor *</label>
            <select 
              className="form-select"
              value={formData.supervisor}
              onChange={e => setFormData({...formData, supervisor: e.target.value})}
              required
            >
              <option value="">-- Choose Supervisor --</option>
              {facultyList.map(fac => (
                <option key={fac.id} value={fac.id}>
                  {fac.full_name} - {fac.designation}
                </option>
              ))}
            </select>
            <p className="form-note">💡 Meet your supervisor physically before selecting</p>
          </div>
        </div>

        {/* Group Members */}
        <div className="form-section">
          <h3>Group Members <small>(Maximum 3 Members)</small></h3>
          
          {formData.members.map((member, index) => (
            <div key={index} className="member-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
              
              {/* Header */}
              <div className="member-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                <span className="badge" style={{ background: index === 0 ? '#1e3a8a' : '#64748b', color: 'white', padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                  {index === 0 ? '👑 Group Lead' : `👤 Member ${index}`}
                </span>
                {index > 0 && (
                  <button type="button" className="btn-remove" onClick={() => removeMember(index)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.375rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                )}
              </div>

              {/* Full Name & Odoo ID */}
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

              {/* CGPA & Credit Hours */}
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

              {/* Checkboxes */}
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

          {formData.members.length < 3 && (
            <button type="button" className="btn-add" onClick={addMember}>
              + Add Member ({formData.members.length}/3)
            </button>
          )}
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

  // Render Proposal (Placeholder)
  const renderProposal = () => (
    <div className="content-area">
      <h2>Project Proposal</h2>
      <div className="placeholder-card">
        <p>📄 Upload your project proposal here</p>
        <p className="text-muted">This feature will be available soon</p>
      </div>
    </div>
  );

  // Render Meeting Logs (Placeholder)
  const renderMeetingLogs = () => (
    <div className="content-area">
      <h2>Weekly Meeting Logs</h2>
      <div className="placeholder-card">
        <p>📅 Track your weekly progress meetings</p>
        <p className="text-muted">Coming soon...</p>
      </div>
    </div>
  );

  // Render Reports (Placeholder)
  const renderReports = () => (
    <div className="content-area">
      <h2>Reports & Marks</h2>
      <div className="placeholder-card">
        <p>📊 View your FYP progress and marks</p>
        <p className="text-muted">Coming soon...</p>
      </div>
    </div>
  );

  // Render Materials
  const renderMaterials = () => {
    const materials = [
      { name: 'Proposal Template', desc: 'FYP project proposal form', icon: '📋' },
      { name: 'Brochure Format', desc: 'Official brochure guidelines', icon: '🖼️' },
      { name: 'FYP Report Template', desc: 'Report writing format', icon: '📝' },
    ];

    return (
      <div className="content-area">
        <h2>Materials & Downloads</h2>
        <div className="materials-grid">
          {materials.map((item, idx) => (
            <div key={idx} className="material-card">
              <div className="material-icon">{item.icon}</div>
              <div className="material-info">
                <h4>{item.name}</h4>
                <p className="text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Main Render
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Student Portal</h3>
          <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-btn ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            📝 Group & Idea Pitch
          </button>
          <button 
            className={`nav-btn ${activeTab === 'proposal' ? 'active' : ''}`}
            onClick={() => setActiveTab('proposal')}
          >
            📄 Project Proposal
          </button>
          <button 
            className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📅 Meeting Logs
          </button>
          <button 
            className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📊 Reports & Marks
          </button>
          <button 
            className={`nav-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            📥 Materials & Downloads
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
          ☰ Menu
        </button>

        {/* Render Active Tab */}
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
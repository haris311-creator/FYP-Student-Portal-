// fyp-frontend/src/pages/SupervisorDashboard.jsx
import React, { useState, useEffect } from 'react';
import './Supervisordashboard.css';

const assignedGroups = [
  {
    id: 1,
    name: 'Team Alpha',
    project: 'AI-Based Chatbot for University',
    members: ['Ali Ahmed', 'Sara Khan', 'Hassan Raza'],
    phase: 'FYP-1',
    progress: 65,
    pendingLogs: 3,
  },
  {
    id: 2,
    name: 'Team Beta',
    project: 'E-commerce Platform',
    members: ['Fatima Malik', 'Zain Ul Abideen'],
    phase: 'FYP-2',
    progress: 85,
    pendingLogs: 1,
  },
  {
    id: 3,
    name: 'Team Gamma',
    project: 'Smart Attendance System',
    members: ['Usman Tariq', 'Ayesha Siddiqui', 'Bilal Ahmed'],
    phase: 'FYP-1',
    progress: 40,
    pendingLogs: 5,
  },
];

function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // 👤 User Profile State
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

  const renderOverview = () => (
    <div>
      <h2 className="content-title">Overview</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>👥</div>
          <div>
            <p className="stat-number">3</p>
            <p className="stat-label">Assigned Groups</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3' }}>📋</div>
          <div>
            <p className="stat-number">9</p>
            <p className="stat-label">Pending Log Reviews</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>📄</div>
          <div>
            <p className="stat-number">2</p>
            <p className="stat-label">Reports to Review</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fdf4ff' }}>✏️</div>
          <div>
            <p className="stat-number">1</p>
            <p className="stat-label">Marks Pending</p>
          </div>
        </div>
      </div>

      <h3 className="sub-title">My Groups</h3>
      <div className="groups-list">
        {assignedGroups.map(group => (
          <div key={group.id} className="group-card">
            <div className="group-card-top">
              <div>
                <h4 className="group-name">{group.name}</h4>
                <p className="group-project">{group.project}</p>
                <p className="group-members">
                  👤 {group.members.join(', ')}
                </p>
              </div>
              <div className="group-card-right">
                <span className={`phase-badge ${group.phase === 'FYP-2' ? 'phase-2' : 'phase-1'}`}>
                  {group.phase}
                </span>
                {group.pendingLogs > 0 && (
                  <span className="pending-badge">{group.pendingLogs} logs pending</span>
                )}
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-label">
                <span>Progress</span>
                <span>{group.progress}%</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${group.progress}%` }}
                />
              </div>
            </div>
            <button
              className="view-btn"
              onClick={() => {
                setSelectedGroup(group);
                setActiveTab('groupDetail');
              }}
            >
              View Details →
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGroupDetail = () => {
    if (!selectedGroup) return null;
    return (
      <div>
        <button
          className="back-btn"
          onClick={() => setActiveTab('overview')}
        >
          ← Back
        </button>
        <h2 className="content-title">{selectedGroup.name}</h2>
        <p className="group-project" style={{ marginBottom: '2rem', color: '#64748b' }}>
          {selectedGroup.project}
        </p>

        <div className="detail-grid">
          <div className="detail-card">
            <p className="detail-label">Phase</p>
            <p className="detail-value">{selectedGroup.phase}</p>
          </div>
          <div className="detail-card">
            <p className="detail-label">Progress</p>
            <p className="detail-value">{selectedGroup.progress}%</p>
          </div>
          <div className="detail-card">
            <p className="detail-label">Members</p>
            <p className="detail-value">{selectedGroup.members.length}</p>
          </div>
          <div className="detail-card">
            <p className="detail-label">Pending Logs</p>
            <p className="detail-value" style={{ color: '#f59e0b' }}>{selectedGroup.pendingLogs}</p>
          </div>
        </div>

        <h3 className="sub-title">Meeting Logs</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Topics Discussed</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Week 1</td>
                <td>Requirements finalization</td>
                <td><span className="badge-approved">Approved</span></td>
                <td>—</td>
              </tr>
              <tr>
                <td>Week 2</td>
                <td>ERD & Database Design</td>
                <td><span className="badge-pending">Pending</span></td>
                <td>
                  <button className="approve-btn">Approve</button>
                </td>
              </tr>
              <tr>
                <td>Week 3</td>
                <td>—</td>
                <td><span style={{ color: '#94a3b8' }}>Not Submitted</span></td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="sub-title" style={{ marginTop: '2rem' }}>Enter Marks</h3>
        <div className="marks-form">
          <div className="marks-row">
            <div className="form-group">
              <label className="form-label">Presentation (40)</label>
              <input type="number" className="form-input" placeholder="e.g. 35" max="40" />
            </div>
            <div className="form-group">
              <label className="form-label">Report (30)</label>
              <input type="number" className="form-input" placeholder="e.g. 25" max="30" />
            </div>
            <div className="form-group">
              <label className="form-label">Sessional (20)</label>
              <input type="number" className="form-input" placeholder="e.g. 18" max="20" />
            </div>
            <div className="form-group">
              <label className="form-label">Logs (10)</label>
              <input type="number" className="form-input" placeholder="e.g. 8" max="10" />
            </div>
          </div>
          <button className="submit-btn">Save Marks</button>
        </div>
      </div>
    );
  };

  const renderReviews = () => (
    <div>
      <h2 className="content-title">Pending Reviews</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Type</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Team Alpha</td>
              <td>Meeting Log — Week 2</td>
              <td>2025-04-20</td>
              <td><button className="approve-btn">Approve</button></td>
            </tr>
            <tr>
              <td>Team Gamma</td>
              <td>Project Proposal</td>
              <td>2025-04-18</td>
              <td><button className="approve-btn">Review</button></td>
            </tr>
            <tr>
              <td>Team Beta</td>
              <td>FYP-2 Final Report</td>
              <td>2025-04-15</td>
              <td><button className="approve-btn">Review</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Supervisor Panel</h2>
          <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        
        {/* 👤 User Profile Card - TOP POSITION */}
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
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '1.1rem', flexShrink: 0,
            backdropFilter: 'blur(10px)'
          }}>
            {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
          </div>
          
          <div style={{ overflow: 'visible', flex: 1, minWidth: 0 }}>
            <p style={{ 
              margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'white',
              whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2', overflowWrap: 'break-word'
            }}>
              {userInfo.name}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize' }}>
              {userInfo.role === 'admin' ? 'Administrator' : 
               userInfo.role === 'supervisor' ? 'Supervisor' : 'User'}
            </p>
          </div>
        </div>
        
        <button
          className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overview'); setMenuOpen(false); }}
        >
          🏠 Overview
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => { setActiveTab('reviews'); setMenuOpen(false); }}
        >
          📋 Pending Reviews
        </button>
      </div>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
        ☰ Menu
      </button>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'groupDetail' && renderGroupDetail()}
        {activeTab === 'reviews' && renderReviews()}
      </div>
    </div>
  );
}

export default SupervisorDashboard;
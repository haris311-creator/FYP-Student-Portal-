// fyp-frontend/src/Pages/Supervisordashboard.jsx
import React, { useState, useEffect } from 'react';
import { supervisorAPI } from '../utils/api';
import './Supervisordashboard.css';

function SupervisorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', role: '', email: '' });
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        
        const transformedGroups = response.data.results.map(group => ({
          id: group.id,
          group_number: group.group_number,
          name: `Group ${group.group_number}`, 
          project: group.project_title || 'Untitled Project',
          // ✅ UPDATED: Full name + odoo_id
          members: group.members?.map(m => ({
            name: m.student_first_name && m.student_last_name 
              ? `${m.student_first_name} ${m.student_last_name}`.trim()
              : m.student_name || m.full_name || m.student?.full_name || 'Unknown',
            odoo_id: m.student_id || m.odoo_id || m.student?.student_id || 'N/A',
            email: m.student_email || m.student?.email || ''
          })) || [],
          phase: group.fydp_phase === 'fydp1' ? 'FYP-1' : 'FYP-2',
          status: group.status,
          progress: calculateProgress(group.status),
          // ✅ UPDATED: Use domain_display (full name) from backend
          domain: group.domain_display || group.domain || 'N/A',
        }));
        
        setAssignedGroups(transformedGroups);
        setError(null);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load assigned groups');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignedGroups();
  }, []);

  const calculateProgress = (status) => {
    const progressMap = {
      'pending_approval': 10, 'idea_pitch': 25, 'proposal_pending': 40,
      'proposal_approved': 60, 'in_progress': 80, 'completed': 100, 'rejected': 0
    };
    return progressMap[status] || 0;
  };

  if (loading) return <div className="dashboard-container"><div className="loading-spinner">Loading...</div></div>;
  if (error) return <div className="dashboard-container"><div className="error-message">{error}</div></div>;

  const renderOverview = () => (
    <div className="overview-content">
      <h1 className="page-title">Overview</h1>
      
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-value">{assignedGroups.length}</div>
          <div className="stat-label">Assigned Groups</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">📋</div>
          <div className="stat-value">9</div>
          <div className="stat-label">Pending Log Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📄</div>
          <div className="stat-value">2</div>
          <div className="stat-label">Reports to Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">✏️</div>
          <div className="stat-value">1</div>
          <div className="stat-label">Marks Pending</div>
        </div>
      </div>

      {/* My Groups Section */}
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
                  {/* ✅ FIXED: Use group.members instead of selectedGroup.members */}
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Supervisor Portal</h2>
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
            <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span className="nav-icon">🏠</span>
              <span className="nav-text">Overview</span>
            </button>
            <button className={`nav-item ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
              <span className="nav-icon">📋</span>
              <span className="nav-text">Pending Reviews</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {activeTab === 'overview' && renderOverview()}
          
          {/* Group Detail View */}
          {activeTab === 'groupDetail' && selectedGroup && (
            <div className="group-detail-view">
              <div className="detail-header">
                <button className="back-btn" onClick={() => setActiveTab('overview')}>
                  ← Back to Overview
                </button>
                <h1 className="detail-title">{selectedGroup.name}</h1>
                <p className="detail-subtitle">{selectedGroup.project}</p>
              </div>

              <div className="detail-grid">
                {/* Left Column: Group Info */}
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

                  {/* Progress Card */}
                  <div className="detail-card">
                    <h3 className="detail-card-title">Progress</h3>
                    <div className="progress-detail">
                      <div className="progress-circle">
                        <svg viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                          <circle 
                            cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="8"
                            strokeDasharray={`${selectedGroup.progress * 2.83} 283`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
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

                {/* Right Column: Members */}
                <div className="detail-column">
                  <div className="detail-card full-height">
                    <h3 className="detail-card-title">Team Members</h3>
                    <div className="members-list-detail">
                      {selectedGroup.members && selectedGroup.members.length > 0 ? (
                        selectedGroup.members.map((member, idx) => (
                          <div key={idx} className="member-row">
                            <div className="member-avatar-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="member-info">
                              <span className="member-name">{member.name}</span>
                              <span className="member-role">ID: {member.odoo_id}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-members">No members added yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'reviews' && (
            <div className="placeholder-section">
              <h2>Pending Reviews</h2>
              <p>Feature coming soon...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default SupervisorDashboard;
// fyp-frontend/src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from "../api/admin"; 
import { toast } from 'react-toastify';
import './Admindashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Backend data states
  const [pendingProposals, setPendingProposals] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState({ proposals: false, groups: false });
  
  // Local states
  const [announcement, setAnnouncement] = useState('');
  const [announcementList, setAnnouncementList] = useState([
    { id: 1, text: 'FYP Orientation Session — April 25', date: '2025-04-20' },
    { id: 2, text: 'Proposal Submission Deadline — May 1', date: '2025-04-18' },
  ]);
  
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
            role: user.user_type || 'admin',
            email: user.email || ''
          });
        }
      } catch (e) {
        console.log('User info not found');
      }
    };
    loadUser();
  }, []);

  // ✅ Fetch data from backend on mount
  useEffect(() => {
    fetchPendingProposals();
    fetchAllGroups();
  }, []);

  const fetchPendingProposals = async () => {
    try {
      setLoading(prev => ({ ...prev, proposals: true }));
      const response = await adminAPI.getPendingGroups();
      const data = response.data.results || response.data;
      
      const formatted = data.map(group => ({
        id: group.id,
        group: group.members_details?.map(m => m.full_name || m.email).join(', ') || 'Unknown',
        title: group.project_title || group.name || 'Untitled Project',
        supervisor: group.supervisor_details?.name || group.supervisor_details?.email || 'Not Assigned',
        date: new Date(group.created_at).toLocaleDateString(),
        _fullData: group,
      }));
      
      setPendingProposals(formatted);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load pending proposals');
    } finally {
      setLoading(prev => ({ ...prev, proposals: false }));
    }
  };

  const fetchAllGroups = async () => {
    try {
      setLoading(prev => ({ ...prev, groups: true }));
      const response = await adminAPI.getAllGroups();
      const data = response.data.results || response.data;
      
      const formatted = data.map(group => {
        let displayStatus = 'Pending';
        if (group.status === 'approved' || group.status === 'idea_pitch') {
          displayStatus = 'Active';
        } else if (group.status === 'completed') {
          displayStatus = 'Completed';
        } else if (group.status === 'rejected') {
          displayStatus = 'Rejected';
        }

        return {
          id: group.id,
          group: group.members_details?.map(m => m.full_name || m.email).join(', ') || 'Unknown',
          title: group.project_title || group.name || 'Untitled Project',
          phase: group.semester || 'FYP-1',
          supervisor: group.supervisor_details?.name || group.supervisor_details?.email || 'Not Assigned',
          status: displayStatus,
          groupNumber: group.group_number || '-',
          _fullData: group,
        };
      });
      
      setAllGroups(formatted);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(prev => ({ ...prev, groups: false }));
    }
  };

  const handleApprove = async (proposal) => {
    if (!window.confirm(`Approve "${proposal.title}" for ${proposal.group}?`)) return;
    
    try {
      const response = await adminAPI.approveGroup(proposal.id);
      toast.success(response.data.message || 'Group approved successfully!');
      setPendingProposals(prev => prev.filter(p => p.id !== proposal.id));
      fetchAllGroups();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.response?.data?.error || 'Approval failed');
    }
  };

  const handleReject = async (proposal) => {
    const reason = window.prompt('Enter rejection reason (required):');
    if (!reason || !reason.trim()) {
      toast.warning('Rejection reason is required');
      return;
    }
    
    if (!window.confirm(`Reject "${proposal.title}"?\nReason: ${reason}`)) return;
    
    try {
      const response = await adminAPI.rejectGroup(proposal.id, reason);
      toast.success(response.data.message || 'Group rejected');
      setPendingProposals(prev => prev.filter(p => p.id !== proposal.id));
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error(error.response?.data?.error || 'Rejection failed');
    }
  };

  const handleAnnouncementSubmit = (e) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    const newItem = {
      id: Date.now(),
      text: announcement,
      date: new Date().toISOString().split('T')[0],
    };
    setAnnouncementList(prev => [newItem, ...prev]);
    setAnnouncement('');
    toast.success('Announcement posted!');
  };

  const renderOverview = () => (
    <div>
      <h2 className="content-title">Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>📁</div>
          <div>
            <p className="stat-number">{allGroups.length}</p>
            <p className="stat-label">Total FYP Groups</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3' }}>⏳</div>
          <div>
            <p className="stat-number">{pendingProposals.length}</p>
            <p className="stat-label">Pending Approvals</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>✅</div>
          <div>
            <p className="stat-number">{allGroups.filter(g => g.status === 'Completed').length}</p>
            <p className="stat-label">Completed Projects</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fdf4ff' }}>👨‍🏫</div>
          <div>
            <p className="stat-number">25</p>
            <p className="stat-label">Active Supervisors</p>
          </div>
        </div>
      </div>

      <h3 className="sub-title">Quick Actions</h3>
      <div className="actions-grid">
        <button className="action-btn" onClick={() => setActiveTab('announcements')}>
          <span className="action-icon">📢</span>
          <span>Announcements</span>
        </button>
        <button className="action-btn" onClick={() => setActiveTab('proposals')}>
          <span className="action-icon">📋</span>
          <span>Approve Proposals</span>
        </button>
        <button className="action-btn" onClick={() => setActiveTab('groups')}>
          <span className="action-icon">👥</span>
          <span>View All Groups</span>
        </button>
        <button className="action-btn" onClick={() => navigate('/admin/approvals')}>
          <span className="action-icon">⚡</span>
          <span>Advanced Approval</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">📊</span>
          <span>Schedule Evaluations</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">📥</span>
          <span>Export Excel</span>
        </button>
      </div>
    </div>
  );

  const renderProposals = () => (
    <div>
      <h2 className="content-title">Pending Proposals</h2>
      {loading.proposals ? (
        <div className="loading-state">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading proposals...</p>
        </div>
      ) : pendingProposals.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">✅</p>
          <p className="empty-text">All proposals have been reviewed!</p>
          <button className="refresh-btn" onClick={fetchPendingProposals}>🔁 Refresh</button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Project Title</th>
                <th>Supervisor</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingProposals.map(p => (
                <tr key={p.id}>
                  <td><span className="group-name-cell">{p.group}</span></td>
                  <td>{p.title}</td>
                  <td>{p.supervisor}</td>
                  <td>{p.date}</td>
                  <td>
                    <div className="action-btns">
                      <button className="approve-btn" onClick={() => handleApprove(p)}>Approve</button>
                      <button className="reject-btn" onClick={() => handleReject(p)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderGroups = () => (
    <div>
      <h2 className="content-title">All FYP Groups</h2>
      {loading.groups ? (
        <div className="loading-state">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading groups...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Project Title</th>
                <th>Phase</th>
                <th>Supervisor</th>
                <th>Group #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allGroups.map(g => (
                <tr key={g.id}>
                  <td><span className="group-name-cell">{g.group}</span></td>
                  <td>{g.title}</td>
                  <td>
                    <span className={`phase-badge ${g.phase === 'FYP-2' ? 'phase-2' : 'phase-1'}`}>
                      {g.phase}
                    </span>
                  </td>
                  <td>{g.supervisor}</td>
                  <td className="group-number-cell">{g.groupNumber}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(g.status)}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const getStatusClass = (status) => {
    switch(status) {
      case 'Active': return 'status-active';
      case 'Completed': return 'status-done';
      case 'Rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const renderAnnouncements = () => (
    <div>
      <h2 className="content-title">Manage Announcements</h2>
      <div className="announce-form-box">
        <h3 className="sub-title" style={{ marginTop: 0 }}>Post New Announcement</h3>
        <form onSubmit={handleAnnouncementSubmit} className="announce-form">
          <input
            type="text"
            className="form-input"
            placeholder="e.g. FYP Viva scheduled for May 10th..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            required
          />
          <button type="submit" className="submit-btn">Post Announcement</button>
        </form>
        <p className="announce-note">
          📢 This will appear in the ticker on the homepage automatically.
        </p>
      </div>

      <h3 className="sub-title">Posted Announcements</h3>
      <div className="announce-list">
        {announcementList.map(a => (
          <div key={a.id} className="announce-item">
            <div>
              <p className="announce-text">{a.text}</p>
              <p className="announce-date">Posted: {a.date}</p>
            </div>
            <button
              className="delete-btn"
              onClick={() => setAnnouncementList(prev => prev.filter(x => x.id !== a.id))}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin Panel</h2>
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
          className={`sidebar-btn ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => { setActiveTab('proposals'); setMenuOpen(false); }}
        >
          📋 Pending Proposals
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => { setActiveTab('groups'); setMenuOpen(false); }}
        >
          👥 All Groups
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => { setActiveTab('announcements'); setMenuOpen(false); }}
        >
          📢 Announcements
        </button>
      </div>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
        ☰ Menu
      </button>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'proposals' && renderProposals()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'announcements' && renderAnnouncements()}
      </div>
    </div>
  );
}

export default AdminDashboard;
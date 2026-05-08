import React, { useState } from 'react';
import './Admindashboard.css';

const pendingProposals = [
  { id: 1, group: 'Team Faiz', title: 'AI-Based Chatbot', supervisor: 'Dr. Saad Ahmed', date: '2025-04-01' },
  { id: 2, group: 'Team jawad', title: 'E-commerce Platform', supervisor: 'Ms. Asma Qaiser', date: '2025-04-03' },
  { id: 3, group: 'Team haris', title: 'Smart Attendance System', supervisor: 'Ms. Nisha Malik', date: '2025-04-05' },
];

const allGroups = [
  { id: 1, group: 'Team Jawad', title: 'AI-Based Chatbot', phase: 'FYP-1', supervisor: 'Dr. Saad Ahmed', status: 'Active' },
  { id: 2, group: 'Team Faiz', title: 'E-commerce Platform', phase: 'FYP-2', supervisor: 'Ms. Asma Qaiser', status: 'Active' },
  { id: 3, group: 'Team haris', title: 'Smart Attendance System', phase: 'FYP-1', supervisor: 'Ms. Nisha Malik', status: 'Pending' },
  { id: 4, group: 'Team jeeva', title: 'Hospital Management', phase: 'FYP-2', supervisor: 'Ms. Kulsoom Nasir', status: 'Completed' },
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [proposals, setProposals] = useState(pendingProposals);
  const [announcement, setAnnouncement] = useState('');
  const [announcementList, setAnnouncementList] = useState([
    { id: 1, text: 'FYP Orientation Session — April 25', date: '2025-04-20' },
    { id: 2, text: 'Proposal Submission Deadline — May 1', date: '2025-04-18' },
  ]);

  const handleApprove = (id) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  const handleReject = (id) => {
    setProposals(prev => prev.filter(p => p.id !== id));
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
  };

  const renderOverview = () => (
    <div>
      <h2 className="content-title">Overview</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}>📁</div>
          <div>
            <p className="stat-number">45</p>
            <p className="stat-label">Total FYP Groups</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3' }}>⏳</div>
          <div>
            <p className="stat-number">{proposals.length}</p>
            <p className="stat-label">Pending Approvals</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>✅</div>
          <div>
            <p className="stat-number">12</p>
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
        <button className="action-btn">
          <span className="action-icon">📊</span>
          <span>Schedule Evaluations</span>
        </button>
        <button className="action-btn">
          <span className="action-icon">🏆</span>
          <span>Generate Award List</span>
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
      {proposals.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">✅</p>
          <p className="empty-text">All proposals have been reviewed!</p>
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
              {proposals.map(p => (
                <tr key={p.id}>
                  <td><span className="group-name-cell">{p.group}</span></td>
                  <td>{p.title}</td>
                  <td>{p.supervisor}</td>
                  <td>{p.date}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="approve-btn"
                        onClick={() => handleApprove(p.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleReject(p.id)}
                      >
                        Reject
                      </button>
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
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Project Title</th>
              <th>Phase</th>
              <th>Supervisor</th>
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
                <td>
                  <span className={`status-pill ${
                    g.status === 'Active' ? 'status-active' :
                    g.status === 'Completed' ? 'status-done' : 'status-pending'
                  }`}>
                    {g.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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
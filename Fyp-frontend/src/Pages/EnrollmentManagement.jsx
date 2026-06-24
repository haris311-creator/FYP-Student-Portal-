import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';
import './Admindashboard.css'; 
import './EnrollmentManagement.css';

function EnrollmentManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState({
    total_enrolled: 0,
    registered_students: 0,
    pending_registration: 0,
    rejected_students: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState({ show: false, studentId: null });
  const [rejectReason, setRejectReason] = useState('');

  // Helper function to check if link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/enrolled-students/');
      setStudents(response.data);
    } catch (error) {
      setError('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/auth/registration-stats/');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this student?')) return;

    try {
      await api.post(`/auth/enrolled-students/${id}/approve/`);
      setSuccessMessage('Student approved successfully');
      fetchStudents();
      fetchStats();
    } catch (error) {
      setError('Error approving student');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Rejection reason is required');
      return;
    }

    try {
      await api.post(`/auth/enrolled-students/${rejectModal.studentId}/reject/`, {
        reason: rejectReason
      });
      setSuccessMessage('Student rejected successfully');
      setRejectModal({ show: false, studentId: null });
      setRejectReason('');
      fetchStudents();
      fetchStats();
    } catch (error) {
      setError('Error rejecting student');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      student.approval_status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Sidebar navigation helper - Admin Dashboard tab change karne ke liye
  const handleSidebarClick = (tabName) => {
    setMenuOpen(false);
    navigate(`/admin-dashboard?tab=${tabName}`);
  };

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <div className={`dashboard-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin Panel</h2>
          <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        
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
            A
          </div>
          
          <div style={{ overflow: 'visible', flex: 1, minWidth: 0 }}>
            <p style={{ 
              margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'white',
              whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2', overflowWrap: 'break-word'
            }}>
              Admin User
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize' }}>
              Administrator
            </p>
          </div>
        </div>
        
        <Link 
          to="/admin-dashboard" 
          className="sidebar-btn"
          onClick={() => setMenuOpen(false)}
        >
          Overview
        </Link>
        
        <Link 
          to="/admin-dashboard?tab=proposals" 
          className="sidebar-btn"
          onClick={() => setMenuOpen(false)}
        >
          Approve Groups & Ideas
        </Link>
        
        <Link 
          to="/admin-dashboard?tab=finalProposals" 
          className="sidebar-btn"
          onClick={() => setMenuOpen(false)}
        >
          Proposal Approval
        </Link>
        
        <Link 
          to="/admin-dashboard?tab=groups" 
          className="sidebar-btn"
          onClick={() => setMenuOpen(false)}
        >
          View All Groups
        </Link>
        
        <Link 
          to="/admin-dashboard?tab=announcements" 
          className="sidebar-btn"
          onClick={() => setMenuOpen(false)}
        >
          Announcements
        </Link>
        
        <Link 
          to="/admin-dashboard?tab=marks" 
          className="sidebar-btn"
          onClick={() => setMenuOpen(false)}
        >
          Marks & Evaluation
        </Link>
        
        <Link 
          to="/admin/enrollment" 
          className={`sidebar-btn ${isActive('/admin/enrollment') ? 'active' : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          Enrollment Management
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
        ☰ Menu
      </button>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Back Button - Mobile Only */}
        <div className="back-button-wrapper">
          <button 
            onClick={() => navigate('/admin-dashboard')}
            className="back-button"
          >
            ← Back to Overview
          </button>
        </div>

        <h2 className="content-title">Student Registration Approvals</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Approve or reject student registration requests
        </p>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div>
              <p className="stat-number">{stats.total_enrolled}</p>
              <p className="stat-label">Total Requests</p>
            </div>
          </div>
          <div className="stat-card stat-card-approved">
            <div>
              <p className="stat-number">{stats.registered_students}</p>
              <p className="stat-label">Approved</p>
            </div>
          </div>
          <div className="stat-card stat-card-pending">
            <div>
              <p className="stat-number">{stats.pending_registration}</p>
              <p className="stat-label">Pending</p>
            </div>
          </div>
          <div className="stat-card stat-card-rejected">
            <div>
              <p className="stat-number">{stats.rejected_students}</p>
              <p className="stat-label">Rejected</p>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className="sub-title" style={{ margin: 0 }}>Pending Registrations</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ minWidth: '200px' }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-input"
                style={{ minWidth: '150px' }}
              >
                <option value="all">All Students</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}
          {successMessage && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{successMessage}</div>}

          {loading ? (
            <div className="loading-state">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <p className="empty-text">No students found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.full_name}</td>
                    <td>{student.email}</td>
                    <td>{new Date(student.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill ${
                        student.approval_status === 'approved' ? 'status-done' :
                        student.approval_status === 'rejected' ? 'status-rejected' :
                        'status-pending'
                      }`}>
                        {student.approval_status.charAt(0).toUpperCase() + student.approval_status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {student.approval_status === 'pending' && (
                        <div className="action-btns">
                          <button
                            onClick={() => handleApprove(student.id)}
                            className="approve-btn"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal({ show: true, studentId: student.id })}
                            className="reject-btn"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {student.approval_status === 'approved' && (
                        <span className="status-pill status-done">Approved</span>
                      )}
                      {student.approval_status === 'rejected' && (
                        <div>
                          <span className="status-pill status-rejected">Rejected</span>
                          {student.rejected_reason && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                              {student.rejected_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal.show && (
        <div className="reject-modal-overlay" onClick={() => setRejectModal({ show: false, studentId: null })}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Student Registration</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason (e.g., Invalid email, Incomplete information, etc.)"
              rows="4"
              autoFocus
            />
            <div className="modal-actions">
              <button
                onClick={() => setRejectModal({ show: false, studentId: null })}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="btn-reject"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnrollmentManagement;
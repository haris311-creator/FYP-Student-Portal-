import React, { useState, useEffect, useRef } from 'react';
import api, { enrollmentAPI } from '../utils/api';
import { toast } from 'react-toastify';
import ConfirmModal from '../Components/ConfirmModal';
import './EnrollmentManagement.css';

function EnrollmentManagement() {
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
  const [rejectModal, setRejectModal] = useState({ show: false, studentId: null });
  const [confirmState, setConfirmState] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [pagination, setPagination] = useState({
    next: null,
    previous: null,
    count: 0
  });
  
  const fileInputRef = useRef(null);

  // 1. Initial Load (No debounce)
  useEffect(() => {
    fetchInitialData();
    fetchStats();
  }, []);

  // 2. Debounced Search & Filter (Waits 500ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (filterStatus !== 'all') params.append('status', filterStatus);
        
        const url = `/auth/enrolled-students/${params.toString() ? '?' + params.toString() : ''}`;
        const response = await api.get(url);
        
        if (response.data.results) {
          setStudents(response.data.results);
          setPagination({
            next: response.data.next,
            previous: response.data.previous,
            count: response.data.count
          });
        } else {
          setStudents(response.data);
          setPagination({ next: null, previous: null, count: response.data.length || 0 });
        }
      } catch (error) {
        setError('Error loading students');
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/enrolled-students/');
      if (response.data.results) {
        setStudents(response.data.results);
        setPagination({
          next: response.data.next,
          previous: response.data.previous,
          count: response.data.count
        });
      } else {
        setStudents(response.data);
        setPagination({ next: null, previous: null, count: response.data.length || 0 });
      }
    } catch (error) {
      setError('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch with current filters (Used by Approve/Reject/Upload to reset to Page 1)
  const fetchStudents = async (customUrl = null) => {
    setLoading(true);
    try {
      let url = customUrl;
      if (!url) {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (filterStatus !== 'all') params.append('status', filterStatus);
        url = `/auth/enrolled-students/${params.toString() ? '?' + params.toString() : ''}`;
      }

      const response = await api.get(url);
      if (response.data.results) {
        setStudents(response.data.results);
        setPagination({
          next: response.data.next,
          previous: response.data.previous,
          count: response.data.count
        });
      } else {
        setStudents(response.data);
        setPagination({ next: null, previous: null, count: response.data.length || 0 });
      }
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

  const handleApprove = (id) => {
    setConfirmState({
      title: 'Approve Student',
      message: 'Are you sure you want to approve this student?',
      confirmText: 'Approve',
      onConfirm: async () => {
        try {
          await api.post(`/auth/enrolled-students/${id}/approve/`);
          setSuccessMessage('Student approved successfully');
          toast.success('Student approved successfully');
          fetchStudents(); // Resets to page 1 with current filters
          fetchStats();
        } catch (error) {
          setError('Error approving student');
          toast.error('Error approving student');
        }
      }
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Rejection reason is required');
      return;
    }
    try {
      await api.post(`/auth/enrolled-students/${rejectModal.studentId}/reject/`, {
        reason: rejectReason
      });
      setSuccessMessage('Student rejected successfully');
      setRejectModal({ show: false, studentId: null });
      setRejectReason('');
      fetchStudents(); // Resets to page 1 with current filters
      fetchStats();
    } catch (error) {
      setError('Error rejecting student');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await enrollmentAPI.uploadExcel(file);
      const statsData = response.data.stats;
      setSuccessMessage(
        `Success! Processed: ${statsData.total_processed} | New Pre-Approved: ${statsData.new_pre_approved} | Overridden: ${statsData.overridden} | Skipped: ${statsData.skipped}`
      );
      fetchStudents(); // Resets to page 1 with current filters
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h2 className="content-title">Student Registration Approvals</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Approve or reject student registration requests</p>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card"><div><p className="stat-number">{stats.total_enrolled}</p><p className="stat-label">Total Requests</p></div></div>
          <div className="stat-card"><div><p className="stat-number">{stats.registered_students}</p><p className="stat-label">Approved</p></div></div>
          <div className="stat-card"><div><p className="stat-number">{stats.pending_registration}</p><p className="stat-label">Pending</p></div></div>
          <div className="stat-card"><div><p className="stat-number">{stats.rejected_students}</p><p className="stat-label">Rejected</p></div></div>
        </div>

        {/* Table Container */}
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className="sub-title" style={{ margin: 0 }}>Pending Registrations</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ minWidth: '200px' }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-input"
                style={{ minWidth: '180px' }}
              >
                <option value="all">All Students</option>
                <option value="pre_approved">Pre-Approved (Not Registered)</option>
                <option value="pending">Pending Manual Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current.click()} className="submit-btn" disabled={uploading} style={{ whiteSpace: 'nowrap' }}>
                {uploading ? 'Processing...' : 'Upload Excel Whitelist'}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}
          {successMessage && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{successMessage}</div>}

          {loading ? (
            <div className="loading-state">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <p className="empty-text">No students found</p>
            </div>
          ) : (
            <>
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
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.full_name}</td>
                      <td>{student.email}</td>
                      <td>{new Date(student.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-pill ${
                          student.approval_status === 'approved' ? 'status-done' :
                          student.approval_status === 'rejected' ? 'status-rejected' :
                          student.approval_status === 'pre_approved' ? 'status-pending' : 'status-pending'
                        }`}>
                          {student.approval_status === 'pre_approved' ? 'Pre-Approved' : 
                          student.approval_status.charAt(0).toUpperCase() + student.approval_status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {student.approval_status === 'pending' && (
                          <div className="action-btns">
                            <button onClick={() => handleApprove(student.id)} className="approve-btn">Approve</button>
                            <button onClick={() => setRejectModal({ show: true, studentId: student.id })} className="reject-btn">Reject</button>
                          </div>
                        )}
                        {student.approval_status === 'pre_approved' && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Will auto-approve on registration</span>
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

              {/* PAGINATION CONTROLS */}
              {(pagination.next || pagination.previous) && (
                <div style={{ 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', 
                  marginTop: '1.5rem', padding: '1rem 0', borderTop: '1px solid #e2e8f0'
                }}>
                  <button 
                    className="submit-btn" 
                    disabled={!pagination.previous || loading}
                    onClick={() => fetchStudents(pagination.previous)}
                    style={{ 
                      opacity: !pagination.previous ? 0.5 : 1, cursor: !pagination.previous ? 'not-allowed' : 'pointer',
                      minWidth: '120px', background: !pagination.previous ? '#cbd5e1' : '#1e3a8a'
                    }}
                  >
                    ← Previous
                  </button>
                  
                  <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: '600' }}>
                    Total Records: {pagination.count}
                  </span>

                  <button 
                    className="submit-btn" 
                    disabled={!pagination.next || loading}
                    onClick={() => fetchStudents(pagination.next)}
                    style={{ 
                      opacity: !pagination.next ? 0.5 : 1, cursor: !pagination.next ? 'not-allowed' : 'pointer',
                      minWidth: '120px', background: !pagination.next ? '#cbd5e1' : '#1e3a8a'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
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
              <button onClick={() => setRejectModal({ show: false, studentId: null })} className="btn-cancel">Cancel</button>
              <button onClick={handleReject} className="btn-reject">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        cancelText={confirmState?.cancelText}
        danger={confirmState?.danger}
        onConfirm={() => {
          const action = confirmState?.onConfirm;
          setConfirmState(null);
          if (action) action();
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

export default EnrollmentManagement;
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './GroupApprovals.css';

const GroupApprovals = () => {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [groupNumberOverride, setGroupNumberOverride] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingGroups();
  }, []);

  const fetchPendingGroups = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingGroups();
      setPendingGroups(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load pending groups');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (group) => {
    setSelectedGroup(group);
    setModalType('approve');
    setGroupNumberOverride(group.group_number || '');
    setShowModal(true);
  };

  const handleRejectClick = (group) => {
    setSelectedGroup(group);
    setModalType('reject');
    setRejectionReason('');
    setShowModal(true);
  };

  const handleActionSubmit = async () => {
    if (!selectedGroup) return;

    try {
      setActionLoading(true);

      if (modalType === 'approve') {
        await adminAPI.approveGroup(
          selectedGroup.id,
          groupNumberOverride || null
        );
        toast.success(`Group ${groupNumberOverride || selectedGroup.group_number} approved successfully!`);
      } else if (modalType === 'reject') {
        if (!rejectionReason.trim()) {
          toast.warning('Please provide a rejection reason');
          return;
        }
        await adminAPI.rejectGroup(selectedGroup.id, rejectionReason);
        toast.success('Group rejected');
      }

      setShowModal(false);
      fetchPendingGroups();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending_approval: 'ga-status-pending',
      idea_pitch: 'ga-status-idea',
      rejected: 'ga-status-rejected',
    };
    return classes[status] || 'ga-status-default';
  };

  if (loading) {
    return (
      <div className="ga-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e2e8f0', borderTopColor: '#1e3a8a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="ga-container">
      <div className="ga-header">
        <h1 className="ga-title">Group Approvals</h1>
        <p className="ga-subtitle">Review and approve student project groups</p>
      </div>

      {pendingGroups.length === 0 ? (
        <div className="ga-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#94a3b8', margin: '0 auto' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No pending groups</h3>
          <p>All groups have been reviewed.</p>
        </div>
      ) : (
        <div className="ga-groups-list">
          {pendingGroups.map((group) => (
            <div key={group.id} className="ga-group-card">
              <div className="ga-group-header">
                <div className="ga-group-main">
                  <div className="ga-group-title-row">
                    <h3 className="ga-group-title">{group.project_title || 'Untitled Project'}</h3>
                    <span className={`ga-status-badge ${getStatusClass(group.status)}`}>
                      {group.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="ga-group-domain">{group.domain}</p>
                  
                  <div className="ga-info-grid">
                    <div>
                      <p className="ga-info-label">Group Number</p>
                      <p className="ga-info-value">{group.group_number || 'Will be assigned on approval'}</p>
                    </div>
                    <div>
                      <p className="ga-info-label">Semester</p>
                      <p className="ga-info-value">{group.semester}</p>
                    </div>
                    <div>
                      <p className="ga-info-label">Supervisor</p>
                      <p className="ga-info-value">{group.supervisor_details?.name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="ga-info-label">Created</p>
                      <p className="ga-info-value">{new Date(group.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="ga-members-section">
                    <p className="ga-members-label">Members ({group.members_details?.length || 0}):</p>
                    <div className="ga-members-list">
                      {group.members_details?.map((member, idx) => (
                        <div key={idx} className="ga-member-chip">
                          <span className="ga-member-name">{member.full_name || member.email}</span>
                          {member.role === 'lead' && (
                            <span className="ga-member-lead">Lead</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ga-actions">
                  <button
                    onClick={() => handleApproveClick(group)}
                    className="ga-btn-approve"
                    disabled={actionLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectClick(group)}
                    className="ga-btn-reject"
                    disabled={actionLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="ga-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ga-modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="ga-modal-title">
              {modalType === 'approve' ? 'Approve Group' : 'Reject Group'}
            </h3>

            {modalType === 'approve' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="ga-modal-label">
                    Group Number (Optional Override)
                  </label>
                  <input
                    type="text"
                    value={groupNumberOverride}
                    onChange={(e) => setGroupNumberOverride(e.target.value)}
                    placeholder="GRP-2026-001"
                    className="ga-modal-input"
                  />
                  <p className="ga-modal-hint">Leave empty for auto-generation</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="ga-modal-label">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="4"
                  placeholder="Please provide a reason for rejection..."
                  className="ga-modal-textarea"
                  required
                />
              </div>
            )}

            <div className="ga-modal-actions">
              <button
                onClick={() => setShowModal(false)}
                className="ga-btn-cancel"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={actionLoading}
                className={modalType === 'approve' ? 'ga-btn-approve' : 'ga-btn-reject'}
              >
                {actionLoading ? 'Processing...' : modalType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupApprovals;
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  const getStatusBadge = (status) => {
    const badges = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      idea_pitch: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Group Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve student project groups</p>
      </div>

      {pendingGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending groups</h3>
          <p className="mt-1 text-sm text-gray-500">All groups have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{group.project_title || 'Untitled Project'}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(group.status)}`}>
                      {group.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{group.domain}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Group Number</p>
                      <p className="font-medium">{group.group_number || 'Will be assigned on approval'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Semester</p>
                      <p className="font-medium">{group.semester}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Supervisor</p>
                      <p className="font-medium">{group.supervisor_details?.name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">{new Date(group.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Members ({group.members_details?.length || 0}):</p>
                    <div className="flex flex-wrap gap-2">
                      {group.members_details?.map((member, idx) => (
                        <div key={idx} className="bg-gray-100 px-3 py-1 rounded-md text-sm">
                          <span className="font-medium">{member.full_name || member.email}</span>
                          {member.role === 'lead' && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Lead</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-6">
                  <button
                    onClick={() => handleApproveClick(group)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectClick(group)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {modalType === 'approve' ? 'Approve Group' : 'Reject Group'}
            </h3>

            {modalType === 'approve' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Number (Optional Override)
                  </label>
                  <input
                    type="text"
                    value={groupNumberOverride}
                    onChange={(e) => setGroupNumberOverride(e.target.value)}
                    placeholder="GRP-2026-001"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for auto-generation</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="4"
                  placeholder="Please provide a reason for rejection..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg transition ${
                  modalType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
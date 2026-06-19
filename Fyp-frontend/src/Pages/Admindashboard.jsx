// fyp-frontend/src/pages/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from "../api/admin"; 
import api, { proposalAPI } from '../utils/api';
import { toast } from 'react-toastify';
import './Admindashboard.css';
import PresentationEvaluationForm from '../Components/PresentationEvaluationForm';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Backend data states
  const [pendingProposals, setPendingProposals] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState({ proposals: false, groups: false });
  const [activeSupervisors, setActiveSupervisors] = useState(0);
  const [inProgressProjects, setInProgressProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  
  // Local states
  const [announcement, setAnnouncement] = useState('');
  const [priority, setPriority] = useState('medium');
  const [announcementList, setAnnouncementList] = useState([
    { id: 1, text: 'FYP Orientation Session — April 25', date: '2025-04-20' },
    { id: 2, text: 'Proposal Submission Deadline — May 1', date: '2025-04-18' },
  ]);
  
  // User Profile State
  const [userInfo, setUserInfo] = useState({ name: '', role: '', email: '' });

  // Final Proposal Approval States
  const [pendingFinalProposals, setPendingFinalProposals] = useState([]);
  const [loadingFinalProposals, setLoadingFinalProposals] = useState(false);
  const [selectedFinalProposal, setSelectedFinalProposal] = useState(null);
  const [finalReviewForm, setFinalReviewForm] = useState({ action: 'approve', remarks: '' });
  const [submittingFinalReview, setSubmittingFinalReview] = useState(false);

  const [selectedGroupForEval, setSelectedGroupForEval] = useState(null);
  const [evalLinks, setEvalLinks] = useState({});
  const [generatingLink, setGeneratingLink] = useState(false);

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

  useEffect(() => {
    fetchPendingProposals();
    fetchAllGroups();
    fetchFinalProposals();
    fetchActiveSupervisors(); 
    fetchAnnouncements();   
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
      
      let inProgressCount = 0;
      let completedCount = 0;
      
      const formatted = data.map(group => {
        let displayStatus = 'Pending';
        const status = group.status?.toLowerCase();
        
        if (status === 'completed') {
          completedCount++;
          displayStatus = 'Completed';
        } else if (status === 'approved' || status === 'idea_pitch') {
          inProgressCount++;
          displayStatus = 'Active';
        } else if (status === 'rejected') {
          displayStatus = 'Rejected';
        } else if (status === 'in_progress' || status === 'proposal_approved') {
          inProgressCount++;
          displayStatus = 'In Progress';
        } else if (status === 'proposal_pending') {
          inProgressCount++;
          displayStatus = 'Proposal Pending';
        }

        return {
          ...group,
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
      setInProgressProjects(inProgressCount);
      setCompletedProjects(completedCount);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(prev => ({ ...prev, groups: false }));
    }
  };

  const fetchActiveSupervisors = async () => {
    try {
      const response = await api.get('/projects/faculty/?is_active=true');
      setActiveSupervisors(response.data.length || 0);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      setActiveSupervisors(0);
    }
  };

const fetchAnnouncements = async () => {
  try {
    const response = await api.get('/projects/announcements/');
    console.log('📢 Announcements API Response:', response.data);
    
    // Handle both paginated and non-paginated responses
    let announcements = [];
    if (Array.isArray(response.data)) {
      announcements = response.data;
    } else if (response.data.results) {
      announcements = response.data.results;
    }
    
    console.log('📋 Processed Announcements:', announcements);
    setAnnouncementList(announcements);
    
    // Force re-render
    setTimeout(() => {
      console.log('🔄 Force re-render, current list:', announcementList);
    }, 100);
    
  } catch (error) {
    console.error('❌ Error fetching announcements:', error);
    console.error('Response:', error.response?.data);
    toast.error('Failed to load announcements');
  }
};

  const createAnnouncement = async (title, content, priority) => {
    try {
      await api.post('/projects/announcements/', {
        title,
        content,
        priority: priority || 'medium',
        is_active: true
      });
      toast.success('Announcement posted successfully!');
      fetchAnnouncements(); // Refresh list
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to post announcement');
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await api.delete(`/projects/announcements/${id}/`);
      toast.success('Announcement deleted successfully!');
      fetchAnnouncements(); // Refresh list
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const fetchFinalProposals = async () => {
    try {
      setLoadingFinalProposals(true);
      const res = await proposalAPI.getPendingAdmin();
      setPendingFinalProposals(res.data.results || []);
    } catch (err) {
      console.error("Error fetching final proposals:", err);
    } finally {
      setLoadingFinalProposals(false);
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

  const handleFinalReviewSubmit = async () => {
    if (!selectedFinalProposal) return;
    
    if (finalReviewForm.action === 'reject' && !finalReviewForm.remarks.trim()) {
      toast.error('Remarks are required when rejecting a proposal.');
      return;
    }
    
    setSubmittingFinalReview(true);
    try {
      await proposalAPI.adminReview(selectedFinalProposal.id, finalReviewForm);
      toast.success(`Proposal ${finalReviewForm.action === 'approve' ? 'finally approved' : 'rejected'}!`);
      setSelectedFinalProposal(null);
      setFinalReviewForm({ action: 'approve', remarks: '' });
      fetchFinalProposals();
    } catch (err) {
      console.error("Final review failed:", err);
      toast.error(err.response?.data?.error || err.response?.data?.remarks?.[0] || "Failed to submit review.");
    } finally {
      setSubmittingFinalReview(false);
    }
  };

  const handleFileDownload = async (fileUrl) => {
    try {
      let fullUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        fullUrl = `http://localhost:8000${fileUrl}`;
      }
      
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const filename = fileUrl.split('/').pop() || 'proposal_document';
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please check if the file exists.');
    }
  };

const handleAnnouncementSubmit = (e) => {
  e.preventDefault();
  if (!announcement.trim()) return;
  
  // Backend API call with priority
  createAnnouncement(announcement, announcement, priority);
  setAnnouncement(''); // Clear input
  setPriority('medium'); // Reset to default
};

  // Helper Function for Page Header with Back Button
  const renderPageHeader = (title) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <button 
        onClick={() => setActiveTab('overview')}
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: '#1e3a8a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '1rem',
          transition: 'background 0.2s'
        }}
        className="back-button"
        onMouseOver={(e) => e.target.style.background = '#1e40af'}
        onMouseOut={(e) => e.target.style.background = '#1e3a8a'}
      >
        ← Back to Overview
      </button>
      <h2 className="content-title">{title}</h2>
    </div>
  );

  const renderOverview = () => (
    <div>
      <h2 className="content-title">Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p className="stat-number">{allGroups.length}</p>
            <p className="stat-label">Total FYP Groups</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-number">{pendingProposals.length}</p>
            <p className="stat-label">Pending Groups & Ideas Approvals</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-number">{inProgressProjects}</p>
            <p className="stat-label">In Progress Projects</p>
          </div>
        </div>          
        <div className="stat-card">
          <div>
            <p className="stat-number">{completedProjects}</p>
            <p className="stat-label">Completed Projects</p>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-number">{activeSupervisors}</p>
            <p className="stat-label">Active Supervisors</p>
          </div>
        </div>
      </div>

      <h3 className="sub-title">Quick Actions</h3>
      <div className="actions-grid">
        <button className="action-btn" onClick={() => setActiveTab('proposals')}>
          <span>Approve Groups & Ideas</span>
        </button>
        <button className="action-btn" onClick={() => setActiveTab('finalProposals')}>
          <span>Proposal Approval</span>
        </button>
        <button className="action-btn" onClick={() => setActiveTab('groups')}>
          <span>View All Groups</span>
        </button>
        <button className="action-btn" onClick={() => setActiveTab('announcements')}>
          <span>Announcements</span>
        </button>        
        <button className="action-btn" onClick={() => setActiveTab('presentation')}>
          <span>Presentation Evaluation</span>
        </button>
      </div>
    </div>
  );

  const renderProposals = () => (
    <div>
      {renderPageHeader('Pending Group Approvals')}
      {loading.proposals ? (
        <div className="loading-state">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading groups...</p>
        </div>
      ) : pendingProposals.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">✅</p>
          <p className="empty-text">All groups have been reviewed!</p>
          <button className="refresh-btn" onClick={fetchPendingProposals}>Refresh</button>
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

  const renderFinalProposals = () => {
    if (loadingFinalProposals) {
      return (
        <div>
          {renderPageHeader('Final Proposal Approvals')}
          <div className="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading proposals...</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderPageHeader('Final Proposal Approvals')}
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          These proposals have been approved by the supervisor and require your final review.
        </p>

        {pendingFinalProposals.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">No proposals pending final approval.</p>
            <button className="refresh-btn" onClick={fetchFinalProposals}>Refresh</button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Title</th>
                  <th>Group ID</th>
                  <th>Supervisor</th>
                  <th>Attempts</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingFinalProposals.map(p => (
                  <tr key={p.id}>
                    <td>{p.project_title}</td>
                    <td>{p.group_id}</td>
                    <td>{p.approved_by_supervisor_name || 'N/A'}</td>
                    <td>{p.submission_count}/3</td>
                    <td>
                      <div className="action-btns">
                        <button className="approve-btn" onClick={() => setSelectedFinalProposal(p)}>Review</button>
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
  };

  const renderFinalProposalModal = () => {
    if (!selectedFinalProposal) return null;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div className="meeting-form-container" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '12px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Final Proposal Review</h3>
            <button className="close-form-btn" onClick={() => setSelectedFinalProposal(null)}>X</button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>{selectedFinalProposal.project_title}</h4>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              Submitted on: {selectedFinalProposal.submitted_at ? new Date(selectedFinalProposal.submitted_at).toLocaleString() : 'N/A'}
            </p>
            
            {selectedFinalProposal.supervisor_remarks && (
              <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid #3b82f6' }}>
                <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: '0 0 0.25rem 0', fontWeight: '600' }}>Supervisor Remarks:</p>
                <p style={{ color: '#1e293b', margin: 0, fontStyle: 'italic' }}>{selectedFinalProposal.supervisor_remarks}</p>
              </div>
            )}
            
            {selectedFinalProposal.proposal_file ? (
              <button 
                onClick={() => handleFileDownload(selectedFinalProposal.proposal_file)}
                className="submit-btn"
                style={{ display: 'inline-block', textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
              >
                Download Uploaded Proposal
              </button>
            ) : (
              <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', color: '#92400e' }}>
                Warning: No file uploaded by students.
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Your Final Decision</h4>
            
            <div className="mform-group" style={{ marginBottom: '1rem' }}>
              <label className="mform-label">Action</label>
              <div className="radio-group" style={{ display: 'flex', gap: '1rem' }}>
                <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="radio" 
                    name="finalReviewAction" 
                    value="approve"
                    checked={finalReviewForm.action === 'approve'}
                    onChange={e => setFinalReviewForm({ ...finalReviewForm, action: e.target.value })}
                  /> Final Approve
                </label>
                <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="radio" 
                    name="finalReviewAction" 
                    value="reject"
                    checked={finalReviewForm.action === 'reject'}
                    onChange={e => setFinalReviewForm({ ...finalReviewForm, action: e.target.value })}
                  /> Reject
                </label>
              </div>
            </div>

            <div className="mform-group">
              <label className="mform-label">
                Remarks {finalReviewForm.action === 'reject' && <span className="required">*</span>}
              </label>
              <textarea
                className="mform-textarea"
                placeholder={finalReviewForm.action === 'approve' ? "Optional: Any final comments..." : "Required: Reason for rejection?"}
                value={finalReviewForm.remarks}
                onChange={e => setFinalReviewForm({ ...finalReviewForm, remarks: e.target.value })}
                rows="4"
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              className="submit-btn" 
              onClick={handleFinalReviewSubmit}
              disabled={submittingFinalReview}
            >
              {submittingFinalReview ? 'Submitting...' : 'Submit Decision'}
            </button>
            <button className="back-btn" onClick={() => setSelectedFinalProposal(null)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const generateEvalLink = async (groupId) => {
    setGeneratingLink(true);
    try {
      // Backend API call hogi baad mein
      // const res = await adminAPI.generateEvalLink(groupId);
      // const token = res.data.token;
      
      // Abhi dummy token
      const token = `eval_${groupId}_${Date.now()}`;
      const link = `${window.location.origin}/evaluate/${token}`;
      
      setEvalLinks(prev => ({
        ...prev,
        [groupId]: {
          link,
          token,
          generated_at: new Date().toLocaleString()
        }
      }));
      
      alert(`Link generated!\n\n${link}\n\nCopy this and share via WhatsApp/Email`);
    } catch (err) {
      alert('Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const renderPresentation = () => {
    if (selectedGroupForEval) {
      return (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setSelectedGroupForEval(null)}
              className="approve-btn"
              style={{ marginBottom: '1rem' }}
            >
              Back to Groups List
            </button>
            <h2 className="content-title">
              Presentation Evaluation — {selectedGroupForEval.title}
            </h2>
          </div>

          {/* Generate Link Section */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 className="sub-title" style={{ marginTop: 0 }}>Committee Evaluation Links</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Generate unique links for each committee member. Each link can only be used once.
            </p>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="approve-btn"
                onClick={() => generateEvalLink(selectedGroupForEval.id)}
                disabled={generatingLink}
              >
                {generatingLink ? 'Generating...' : 'Generate New Link'}
              </button>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Share generated link with committee member via WhatsApp or Email
              </span>
            </div>

            {evalLinks[selectedGroupForEval.id] && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f0f9ff',
                borderRadius: '8px',
                borderLeft: '3px solid #3b82f6'
              }}>
                <p style={{ fontSize: '0.8rem', color: '#1e3a8a', fontWeight: '600', margin: '0 0 0.5rem' }}>
                  Latest Generated Link:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{
                    fontSize: '0.8rem',
                    background: 'white',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe',
                    color: '#1e3a8a',
                    wordBreak: 'break-all',
                    flex: 1
                  }}>
                    {evalLinks[selectedGroupForEval.id].link}
                  </code>
                  <button
                    className="approve-btn"
                    style={{ flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(evalLinks[selectedGroupForEval.id].link);
                      alert('Link copied!');
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.5rem 0 0' }}>
                  Generated: {evalLinks[selectedGroupForEval.id].generated_at}
                </p>
              </div>
            )}
          </div>

          {/* Admin own evaluation form */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 className="sub-title" style={{ marginTop: 0 }}>Your Evaluation (Admin)</h3>
            <PresentationEvaluationForm
              group={selectedGroupForEval}
              onClose={() => setSelectedGroupForEval(null)}
              isPublicLink={false}
            />
          </div>
        </div>
      );
    }

    // Groups List View
    return (
      <div>
        {renderPageHeader('Presentation Evaluation')}
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Select a group to evaluate their presentation or generate committee evaluation links.
        </p>

        {loading.groups ? (
          <div className="loading-state">
            <p>Loading groups...</p>
          </div>
        ) : allGroups.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">No approved groups found.</p>
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
                  <th>Status</th>
                  <th>Action</th>
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
                      <span className={`status-pill ${getStatusClass(g.status)}`}>
                        {g.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="approve-btn"
                        onClick={() => setSelectedGroupForEval({
                          ...g,
                          project: g.title,
                          members: g._fullData?.members_details?.map(m => ({
                            name: m.full_name || m.email || 'Unknown',
                            odoo_id: m.student_id || m.odoo_id || '',
                            student_db_id: m.id
                          })) || []
                        })}
                      >
                        Evaluate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderGroups = () => (
    <div>
      {renderPageHeader('All FYP Groups')}
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
      case 'In Progress': return 'status-active';
      case 'Completed': return 'status-done';
      case 'Rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const renderAnnouncements = () => (
    <div>
      {renderPageHeader('Manage Announcements')}
      
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
          
          {/* ✅ Priority Selector */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="form-input"
            style={{ marginTop: '0.5rem' }}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>
          
          <button type="submit" className="submit-btn">Post Announcement</button>
        </form>
        <p className="announce-note">
          📢 This will appear in the ticker on the homepage automatically.
        </p>
      </div>

      <h3 className="sub-title">Posted Announcements</h3>
      <div className="announce-list">
        {announcementList.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No announcements posted yet.
          </p>
        ) : (
          announcementList.map(a => (
            <div key={a.id} className="announce-item">
              <div>
                <p className="announce-text">{a.title}</p>
                <p className="announce-date">
                  Posted: {new Date(a.created_at).toLocaleDateString()}
                  {a.priority && (
                    <span style={{
                      marginLeft: '1rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      background: a.priority === 'urgent' ? '#fee2e2' : 
                                a.priority === 'high' ? '#fef3c7' : '#dbeafe',
                      color: a.priority === 'urgent' ? '#991b1b' : 
                            a.priority === 'high' ? '#92400e' : '#1e3a8a',
                      fontWeight: '600'
                    }}>
                      {a.priority.toUpperCase()}
                    </span>
                  )}
                </p>
              </div>
              <button
                className="delete-btn"
                onClick={() => deleteAnnouncement(a.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
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
        
        {/* User Profile Card */}
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
          Overview
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => { setActiveTab('proposals'); setMenuOpen(false); }}
        >
          Approve Groups & Ideas
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'finalProposals' ? 'active' : ''}`}
          onClick={() => { setActiveTab('finalProposals'); setMenuOpen(false); }}
        >
          Proposal Approval
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => { setActiveTab('groups'); setMenuOpen(false); }}
        >
          View All Groups
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => { setActiveTab('announcements'); setMenuOpen(false); }}
        >
          Announcements
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'presentation' ? 'active' : ''}`}
          onClick={() => { setActiveTab('presentation'); setMenuOpen(false); }}
        >
          Presentation Evaluation
        </button>
      </div>

      <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
        ☰ Menu
      </button>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'proposals' && renderProposals()}
        {activeTab === 'finalProposals' && renderFinalProposals()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'announcements' && renderAnnouncements()}
        {activeTab === 'presentation' && renderPresentation()}
        {selectedFinalProposal && renderFinalProposalModal()}
      </div>
    </div>
  );
}

export default AdminDashboard;
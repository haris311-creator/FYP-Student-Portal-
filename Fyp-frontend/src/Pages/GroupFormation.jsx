
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api'; 

// ✅ Ensure you have this API base URL configured
const API_BASE = 'http://localhost:8000/api/projects/';

const GroupFormation = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [facultyList, setFacultyList] = useState([]);
  const [formData, setFormData] = useState({
    project_title: '',
    domain: '',
    supervisor: '',
    semester: 'Fall 2024', // Default or fetch from context
    fydp_phase: 'fydp1',
    members: [
      {
        student: currentUser.id, // Auto-fill current user
        role: 'lead',
        cgpa: '',
        earned_credit_hours: '',
        prerequisites_completed: true,
        has_special_permission: false
      }
    ]
  });

  // 1️ Load Faculty List on Mount
 useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const token = localStorage.getItem('access_token');
        console.log(" Fetching faculty...");
        
        const response = await axios.get('http://localhost:8000/api/projects/faculty/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(" Faculty data received:", response.data);
        setFacultyList(response.data);
      } catch (error) {
        console.error(" Error fetching faculty:", error);
      }
    };
    
    fetchFaculty();
  }, []);

  // 2️⃣ Handle Input Changes
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
          {
            student: '',
            role: 'member',
            cgpa: '',
            earned_credit_hours: '',
            prerequisites_completed: true,
            has_special_permission: false
          }
        ]
      });
    } else {
      setError("Maximum 3 members allowed per policy.");
    }
  };

  const removeMember = (index) => {
    if (index !== 0) { // Cannot remove the lead
      const newMembers = formData.members.filter((_, i) => i !== index);
      setFormData({ ...formData, members: newMembers });
    }
  };

  // 3️⃣ Submit Group
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation: Ensure all members have required fields
    const isValid = formData.members.every(m => m.cgpa && m.earned_credit_hours);
    if (!isValid) {
      setError("Please fill CGPA and Credit Hours for all members.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        project_title: formData.project_title,
        domain: formData.domain,
        supervisor: formData.supervisor,
        semester: formData.semester,
        fydp_phase: formData.fydp_phase,
        members: formData.members
      };

      const res = await axios.post(`${API_BASE}groups/`, payload, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess("Group Registered Successfully! Redirecting...");
      setTimeout(() => navigate('/student-dashboard'), 2000);
    } catch (err) {
      // Handle soft validation warnings vs hard errors
      if (err.response?.data?.members) {
        setError(`Member Error: ${JSON.stringify(err.response.data.members)}`);
      } else {
        setError(err.response?.data?.detail || "Registration failed. Check eligibility.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="form-card">
        <h2 className="form-title"> Register FYDP Group</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Project Info */}
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
              <p className="form-note">
                Meet supervisor physically before selecting.
              </p>
            </div>
          </div>

          {/* Members List */}
          <div className="form-section">
            <h3>Group Members (Max 3)</h3>
            {formData.members.map((member, index) => (
              <div key={index} className="member-card">
                <div className="member-header">
                  <span className="badge">
                    {index === 0 ? ' Group Lead' : ` Member ${index + 1}`}
                  </span>
                  {index > 0 && (
                    <button type="button" className="btn-sm btn-danger" onClick={() => removeMember(index)}>
                      ✕
                    </button>
                  )}
                </div>

                <div className="eligibility-grid">
                  <div className="form-group">
                    <label>CGPA *</label>
                    <input 
                      type="number" step="0.01" 
                      className="form-input"
                      value={member.cgpa}
                      onChange={e => handleMemberChange(index, 'cgpa', e.target.value)}
                      required
                    />
                    <p className="form-note">Policy: CGPA ≥ 2.0</p>
                  </div>
                  <div className="form-group">
                    <label>Credit Hours *</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={member.earned_credit_hours}
                      onChange={e => handleMemberChange(index, 'earned_credit_hours', e.target.value)}
                      required
                    />
                    <p className="form-note">Policy: ≥100 (≥94 with permission)</p>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={member.prerequisites_completed}
                        onChange={e => handleMemberChange(index, 'prerequisites_completed', e.target.checked)}
                      />
                      Prerequisites Completed
                    </label>
                  </div>
                </div>

                {/* Special Permission Toggle */}
                <div className="form-group">
                  <label className="warning-label">
                    <input 
                      type="checkbox" 
                      checked={member.has_special_permission}
                      onChange={e => handleMemberChange(index, 'has_special_permission', e.target.checked)}
                    />
                    I have HOD/Dean approval for deficiency (Upload letter later)
                  </label>
                </div>
              </div>
            ))}

            {formData.members.length < 3 && (
              <button type="button" className="btn-secondary" onClick={addMember}>
                + Add Member
              </button>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Group Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupFormation;
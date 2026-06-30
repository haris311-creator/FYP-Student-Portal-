import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';

function StudentRegistration() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    student_id: '',  // ✅ Odoo ID field added
    password: '',
    confirm_password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccessMessage('');
  setLoading(true);

  // Client-side Validation
  if (formData.password !== formData.confirm_password) {
    setError('Passwords do not match');
    setLoading(false);
    return;
  }

  if (!formData.email.toLowerCase().endsWith('@iqra.edu.pk')) {
    setError('Only @iqra.edu.pk email addresses are allowed');
    setLoading(false);
    return;
  }

  if (!formData.student_id.trim()) {
    setError('Odoo ID is required');
    setLoading(false);
    return;
  }

  try {
    const response = await api.post('/auth/register/student/', {
      ...formData,
      email: formData.email.toLowerCase(),
      student_id: formData.student_id.trim()
    });

    // ✅ Check for success
    if (response.data && response.data.success) {
      setSuccessMessage(response.data.message || 'Registration successful! Your account is pending admin approval.');
      
      setTimeout(() => {
        navigate('/login');
      }, 7000); // Redirect after 7 seconds
    } else {
      setError(response.data?.message || 'Registration failed');
    }

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.response && error.response.data) {
      const backendData = error.response.data;
      
      // ✅ Handle different error formats
      if (backendData.errors) {
        const firstError = Object.values(backendData.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else if (backendData.message) {
        setError(backendData.message);
      } else if (backendData.error) {
        setError(backendData.error);
      } else {
        setError('Registration failed. Dobara try karein.');
      }
    } else {
      setError('Network error. Please check your connection.');
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">

          <div className="login-logo">
            <h2>IQRA UNIVERSITY</h2>
            <p>Student Registration</p>
          </div>

          <div className="login-divider" />

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}
            
            {successMessage && (
              <div style={{
                background: '#d1fae5',
                border: '1px solid #6ee7b7',
                color: '#065f46',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                {successMessage}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Muhammad Ahmed"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Khan"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="student@iqra.edu.pk"
                required
              />
            </div>

            {/* ✅ Odoo ID Field */}
            <div className="form-group">
              <label className="form-label">Odoo ID </label>
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., IU02-0896-0346"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Min 8 characters"
                minLength="8"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className="form-input"
                placeholder="Re-enter password"
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <p className="login-info">
            Already have an account? <Link to="/login" style={{ color: '#1e3a8a', textDecoration: 'none', fontWeight: '600' }}>Login here</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default StudentRegistration;
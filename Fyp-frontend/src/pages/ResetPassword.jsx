import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/password-reset/confirm/', {
        uid: uid,
        token: token,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      });

      setSuccess(response.data.message);
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Password reset confirm error:', error);
      
      if (error.response && error.response.data) {
        const backendData = error.response.data;
        
        if (backendData.errors) {
          const firstError = Object.values(backendData.errors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else if (backendData.message) {
          setError(backendData.message);
        } else {
          setError('Failed to reset password. Please try again.');
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
            <p>Reset Password</p>
          </div>

          <div className="login-divider" />

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}
            
            {success && (
              <div style={{
                background: '#d1fae5',
                border: '1px solid #6ee7b7',
                color: '#065f46',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                {success}<br />
                <strong>Redirecting to login...</strong>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                className="form-input"
                placeholder="Min 8 characters"
                minLength="8"
                required
                disabled={success}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className="form-input"
                placeholder="Re-enter password"
                required
                disabled={success}
              />
            </div>

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading || success}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="login-info">
            <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>← Back to Login</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
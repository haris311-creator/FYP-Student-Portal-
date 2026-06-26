import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!email.toLowerCase().endsWith('@iqra.edu.pk')) {
      setError('Please use your university email (@iqra.edu.pk)');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/password-reset/', {
        email: email.toLowerCase().trim()
      });

      setSuccess(response.data.message);
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.response && error.response.data) {
        const backendData = error.response.data;
        
        if (backendData.errors) {
          const firstError = Object.values(backendData.errors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else if (backendData.message) {
          setError(backendData.message);
        } else {
          setError('Failed to send reset email. Please try again.');
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
            <p>Forgot Password</p>
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
                {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="student@iqra.edu.pk"
                required
                disabled={success}
              />
            </div>

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading || success}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="login-info">
            Remember your password? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Login here</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
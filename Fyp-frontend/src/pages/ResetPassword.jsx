import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';

function ResetPassword() {
  // URL se uid aur token extract karein (e.g., /reset-password/:uid/:token)
  const { uid, token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Real-time password validation criteria
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
  });

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setFormData({...formData, new_password: password});
    
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.new_password || !formData.confirm_password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!Object.values(passwordCriteria).every(Boolean)) {
      setError('Password does not meet all security requirements');
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
      
      // 3 seconds baad login page par redirect karein
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.response && error.response.data) {
        const backendData = error.response.data;
        
        // ✅ Backend errors ko properly parse karein
        if (backendData.new_password) {
          const msg = Array.isArray(backendData.new_password) ? backendData.new_password[0] : backendData.new_password;
          setError(msg);
        } else if (backendData.non_field_errors) {
          const msg = Array.isArray(backendData.non_field_errors) ? backendData.non_field_errors[0] : backendData.non_field_errors;
          setError(msg);
        } else if (backendData.token) {
          setError("This reset link has already been used or has expired. Please request a new one.");
        } else if (backendData.detail) {
          setError(backendData.detail);
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

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

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
            {error && (
              <div className="login-error" style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}
            
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
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={formData.new_password}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Enter new password"
                required
                disabled={success}
              />
              
              {/* Password Criteria Checklist */}
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', lineHeight: '1.8' }}>
                <div style={{ color: passwordCriteria.length ? '#059669' : '#64748b' }}>
                  {passwordCriteria.length ? '✓' : '○'} At least 8 characters
                </div>
                <div style={{ color: passwordCriteria.uppercase ? '#059669' : '#64748b' }}>
                  {passwordCriteria.uppercase ? '✓' : '○'} One uppercase letter
                </div>
                <div style={{ color: passwordCriteria.lowercase ? '#059669' : '#64748b' }}>
                  {passwordCriteria.lowercase ? '✓' : '○'} One lowercase letter
                </div>
                <div style={{ color: passwordCriteria.number ? '#059669' : '#64748b' }}>
                  {passwordCriteria.number ? '✓' : '○'} One number
                </div>
                <div style={{ color: passwordCriteria.symbol ? '#059669' : '#64748b' }}>
                  {passwordCriteria.symbol ? '✓' : '○'} One symbol (@, #, $, etc.)
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="form-input"
                placeholder="Confirm new password"
                required
                disabled={success}
              />
            </div>

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading || success || !isPasswordValid}
              style={{
                opacity: (!isPasswordValid || success) ? 0.6 : 1,
                cursor: (!isPasswordValid || success) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="login-info">
            <Link to="/login" style={{ color: '#1e3a8a', textDecoration: 'none', fontWeight: '600' }}>
              ← Back to Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
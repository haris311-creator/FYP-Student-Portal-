import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import './Login.css';


// DRF errors ko smartly parse karne ke liye helper function
const extractErrorMessage = (errorData) => {
  if (!errorData) return 'An unknown error occurred.';
  if (typeof errorData === 'string') return errorData;
  if (errorData.detail) return errorData.detail;
  if (errorData.message) return errorData.message;
  if (errorData.error) return errorData.error;

  // Check common DRF field errors
  const fields = ['email', 'student_id', 'otp_code', 'password', 'confirm_password', 'non_field_errors'];
  
  for (const field of fields) {
    if (errorData[field]) {
      const fieldError = errorData[field];
      
      // 1. Agar array hai (e.g., ["Error message"])
      if (Array.isArray(fieldError)) {
        return fieldError[0];
      }
      
      // 2. Agar direct string hai
      if (typeof fieldError === 'string') {
        return fieldError;
      }
      
      // 3. Agar nested object hai (DRF quirk: {"email": {"email": "message"}})
      if (typeof fieldError === 'object') {
        if (fieldError[field]) return fieldError[field]; // Nested same name
        if (fieldError.non_field_errors) return Array.isArray(fieldError.non_field_errors) ? fieldError.non_field_errors[0] : fieldError.non_field_errors;
        
        // Fallback: object ka pehla value return karo
        const firstKey = Object.keys(fieldError)[0];
        const firstValue = fieldError[firstKey];
        if (Array.isArray(firstValue)) return firstValue[0];
        if (typeof firstValue === 'string') return firstValue;
        return JSON.stringify(fieldError);
      }
    }
  }

  return JSON.stringify(errorData);
};

function StudentRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 for Personal Details, 2 for OTP & Password
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    student_id: ''
  });

  const [verifyData, setVerifyData] = useState({
    otp_code: '',
    password: '',
    confirm_password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
  if (resendCooldown <= 0) return;
  const timer = setInterval(() => {
    setResendCooldown(prev => prev - 1);
  }, 1000);
  return () => clearInterval(timer);
}, [resendCooldown]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleVerifyChange = (e) => {
    const { name, value } = e.target;
    setVerifyData({ ...verifyData, [name]: value });
    setError('');
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

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
      const response = await api.post('/auth/register/request-otp/', {
        ...formData,
        email: formData.email.toLowerCase(),
        student_id: formData.student_id.trim()
      });

      if (response.data && response.data.success) {
        setSuccessMessage('OTP sent successfully to your email. Valid for 10 minutes.');
        setLoading(false);
        setStep(2); // Move to Step 2
      } else {
        setError(response.data?.message || 'Registration request failed');
        setLoading(false);
      }
      } catch (error) {
      console.error('OTP Request Error:', error);
      const errorData = error.response?.data;
      
      // Smart extractor
      const errorMessage = extractErrorMessage(errorData) || 'Network error. Please check your connection.';
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
  if (resendCooldown > 0) return;
  setResending(true);
  setError('');
  setSuccessMessage('');

  try {
    const response = await api.post('/auth/register/request-otp/', {
      ...formData,
      email: formData.email.toLowerCase(),
      student_id: formData.student_id.trim()
    });

    if (response.data && response.data.success) {
      setSuccessMessage('New OTP sent successfully. Valid for 10 minutes.');
      setResendCooldown(30);
    } else {
      setError(response.data?.message || 'Failed to resend OTP');
    }
  } catch (error) {
    const backendData = error.response?.data;
    setError(backendData?.message || backendData?.error || 'Failed to resend OTP. Please try again.');
  } finally {
    setResending(false);
  }
};

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (verifyData.password !== verifyData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (verifyData.otp_code.length !== 6) {
      setError('OTP must be exactly 6 digits');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register/verify-otp/', {
        email: formData.email.toLowerCase(),
        otp_code: verifyData.otp_code,
        password: verifyData.password,
        confirm_password: verifyData.confirm_password
      });

      if (response.data && response.data.success) {
        setSuccessMessage(response.data.message || 'Registration successful!');
        setLoading(false); // ✅ Yeh line add karein - loading reset karein
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        setError(response.data?.message || 'Verification failed');
        setLoading(false); //  Yeh line add karein
      }      
      } catch (error) {
        console.error('OTP Verification Error:', error);
        const errorData = error.response?.data;
        
        // Smart extractor use karein
        const errorMessage = extractErrorMessage(errorData) || 'Network error. Please check your connection.';
        
        setError(errorMessage);
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

          <form className="login-form" onSubmit={step === 1 ? handleRequestOTP : handleVerifyOTP}>
            {error && <div className="login-error">{error}</div>}
            
            {successMessage && (
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
                {successMessage}
              </div>
            )}

            {/* STEP 1: Personal Details */}
            {step === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="student@iqra.edu.pk"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Odoo ID</label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleFormChange}
                    className="form-input"
                    placeholder="e.g., IU02-0896-0346"
                    required
                  />
                </div>

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Request OTP'}
                </button>
              </>
            )}

            {/* STEP 2: Verify OTP & Set Password */}
            {step === 2 && (
              <>
                <div style={{
                  background: '#eff6ff',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'center',
                  border: '1px solid #bfdbfe'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e3a8a', fontWeight: '600' }}>
                    OTP Sent to {formData.email}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Valid for 10 minutes. Check spam folder if not received.
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
                    {resendCooldown > 0 ? (
                      <span style={{ color: '#94a3b8' }}>Resend available in {resendCooldown}s</span>
                    ) : (
                      <span
                        onClick={resending ? undefined : handleResendOTP}
                        style={{
                          color: '#1e3a8a',
                          fontWeight: '600',
                          textDecoration: 'underline',
                          cursor: resending ? 'default' : 'pointer',
                          opacity: resending ? 0.6 : 1
                        }}
                      >
                        {resending ? 'Sending...' : 'Resend OTP'}
                      </span>
                    )}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    name="otp_code"
                    value={verifyData.otp_code}
                    onChange={handleVerifyChange}
                    className="form-input"
                    placeholder="123456"
                    maxLength="6"
                    required
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={verifyData.password}
                    onChange={handleVerifyChange}
                    className="form-input"
                    placeholder="Enter password"
                    minLength="8"
                    required
                  />
                  
                  {/* Live Password Validation Checklist */}
                  {verifyData.password && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.6' }}>
                      <div style={{ color: verifyData.password.length >= 8 ? '#10b981' : '#ef4444' }}>
                        {verifyData.password.length >= 8 ? '✓' : '✗'} At least 8 characters
                      </div>
                      <div style={{ color: /[A-Z]/.test(verifyData.password) ? '#10b981' : '#ef4444' }}>
                        {/[A-Z]/.test(verifyData.password) ? '✓' : '✗'} One uppercase letter
                      </div>
                      <div style={{ color: /[a-z]/.test(verifyData.password) ? '#10b981' : '#ef4444' }}>
                        {/[a-z]/.test(verifyData.password) ? '✓' : '✗'} One lowercase letter
                      </div>
                      <div style={{ color: /[0-9]/.test(verifyData.password) ? '#10b981' : '#ef4444' }}>
                        {/[0-9]/.test(verifyData.password) ? '✓' : '✗'} One number
                      </div>
                      <div style={{ color: /[^A-Za-z0-9]/.test(verifyData.password) ? '#10b981' : '#ef4444' }}>
                        {/[^A-Za-z0-9]/.test(verifyData.password) ? '✓' : '✗'} One symbol (@, #, $, etc.)
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={verifyData.confirm_password}
                    onChange={handleVerifyChange}
                    className="form-input"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="login-button"
                    style={{ background: '#64748b', flex: 1 }}
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button type="submit" className="login-button" style={{ flex: 2 }} disabled={loading}>
                    {loading ? 'Verifying...' : 'Complete Registration'}
                  </button>
                </div>
              </>
            )}
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
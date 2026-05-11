import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAPI } from '../utils/api';
import './Login.css';


const DUMMY_USERS = {
  'student@iqra.edu.pk': { password: '123456', role: 'student' },
  'supervisor@iqra.edu.pk': { password: '123456', role: 'supervisor' },
  'admin@iqra.edu.pk': { password: '123456', role: 'admin' },
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  
  try {
    const data = await loginAPI(email, password);
    
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // ✅ ADD THESE 2 LINES:
    localStorage.setItem('user_type', data.user.user_type);  // Ensure user_type is saved
    window.dispatchEvent(new Event('authChanged'));           // Notify Navbar
    const userType = data.user.user_type;
    
    if (userType === 'student') {
      navigate('/student-dashboard');
    } else if (userType === 'supervisor') {
      navigate('/supervisor-dashboard');
    } else if (userType === 'admin') {
      navigate('/admin-dashboard');
    }
  } catch (error) {
    setError(error.message || 'Login failed. Please check your credentials.');  // ✅ Inline error
  }
};

 return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">

          <div className="login-logo">
            <h2>IQRA UNIVERSITY</h2>
            <p>FYP Management Portal</p>
          </div>

          <div className="login-divider" />

          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="yourname@iqra.edu.pk"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className="login-button">
              Login
            </button>
          </form>

          <p className="login-info">
            student@iqra.edu.pk · supervisor@iqra.edu.pk · admin@iqra.edu.pk<br />
            Password: 123456
          </p>

        </div>
      </div>
    </div>
);
}

export default Login;
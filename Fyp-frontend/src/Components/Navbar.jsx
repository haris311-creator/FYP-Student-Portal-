import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Check auth status
  const checkAuth = () => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
  };

  useEffect(() => {
    checkAuth(); // Check on load
    
    // Listen for auth changes (login/logout)
    window.addEventListener('authChanged', checkAuth);
    return () => window.removeEventListener('authChanged', checkAuth);
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_type');
    
    // Notify Navbar
    window.dispatchEvent(new Event('authChanged'));
    
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <img src="/images/iqra-logo.jpg" alt="Iqra University Logo" className="nav-logo-img" />
          <h2>IQRA UNIVERSITY</h2>
        </div>

        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li>
            <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
          </li>
          <li>
            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="nav-link login-btn" 
                style={{ border: 'none', cursor: 'pointer' }}
              > 
                Logout               
              </button>
            ) : (
              <Link to="/login" className="nav-link login-btn" onClick={() => setMenuOpen(false)}> 
                Login               
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
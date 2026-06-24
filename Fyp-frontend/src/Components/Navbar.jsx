import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // ✅ Loading state
  const navigate = useNavigate();

  const checkAuth = async () => {
    setIsChecking(true);
    try {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      
      // Agar token ya user data nahi hai
      if (!token || !userStr || token === 'undefined') {
        // Clear everything
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_type');
        setIsLoggedIn(false);
        setIsChecking(false);
        return;
      }

      // ✅ Token ko backend se validate karein (optional but recommended)
      // Ya phir sirf check karein ke user data valid hai
      try {
        const user = JSON.parse(userStr);
        if (user && user.user_type) {
          setIsLoggedIn(true);
        } else {
          throw new Error('Invalid user data');
        }
      } catch (e) {
        // Invalid data - clear everything
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_type');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoggedIn(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Listen for auth changes
    window.addEventListener('authChanged', checkAuth);
    return () => window.removeEventListener('authChanged', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_type');
    
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
            {/* ✅ Show Login while checking, then show actual state */}
            {isChecking ? (
              <Link to="/login" className="nav-link login-btn" onClick={() => setMenuOpen(false)}> 
                Login               
              </Link>
            ) : isLoggedIn ? (
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
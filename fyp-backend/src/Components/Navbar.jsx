import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

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
            <Link to="/login" className="nav-link login-btn" onClick={() => setMenuOpen(false)}> 
              Login               
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
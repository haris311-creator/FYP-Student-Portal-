import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';        // ← Name match karein (HomePage)
import Login from './Pages/Login';
import StudentDashboard from './Pages/StudentDashboard';
import SupervisorDashboard from './Pages/SupervisorDashboard';
import AdminDashboard from './Pages/AdminDashboard';
import Navbar from './Components/Navbar';
import Footer from './Components/Footer';
import ProtectedRoute from './Components/ProtectedRoute';

function App() {
  return (
    <Router>
      {/* Navbar sabhi pages pe dikhayega */}
      <Navbar />
      <Routes>
        {/* Home Route - Navbar ka "Home" button yahan aayega */}
        <Route path="/" element={<HomePage />} />
        
        {/* Login Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboards */}
        <Route 
          path="/student-dashboard" 
          element={
            <ProtectedRoute allowedTypes={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/supervisor-dashboard" 
          element={
            <ProtectedRoute allowedTypes={['supervisor']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedTypes={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback Route */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
      {/* Footer sabhi pages pe dikhayega */}
      <Footer />
    </Router>
  );
}

export default App;
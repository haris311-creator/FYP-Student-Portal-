import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedTypes }) => {
  // Check if user is logged in
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }
  
  const user = JSON.parse(userStr);
  
  // Check if user type is allowed
  if (allowedTypes && !allowedTypes.includes(user.user_type)) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;